import { View, div, svg, image } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { theme, spaces, panes, knownAgents, exec, run, openOverlay, closeOverlay, props, window, keys, shared, setShared } from "herdr";

// The last agents each machine reported, shown at once while knownAgents() checks again.
const KNOWN = "new-menu.agents";
const WSL_AGENT_CACHE = "new-menu.wsl-agents";
const WSL_AGENT_CACHE_TTL = 5 * 60 * 1000;



function wslDistro(space) {
  if (!space || space.machine != null) return null;
  return shared("wsl.spaces")?.[space.id] ?? /^WSL \u00b7 (.+?)(?: \(\d+\))?$/.exec(space.name)?.[1] ?? null;
}

async function installedWslCommands(distro, programs) {
  const binaries = [...new Set(programs.map(program => program.run?.[0]).filter(Boolean))];
  if (!binaries.length) return new Set();
  const script = 'export PATH="$HOME/.opencode/bin:$HOME/.local/bin:$PATH"; for cmd in "$@"; do binary_path=$(command -v -- "$cmd" 2>/dev/null || true); case "$binary_path" in ""|/mnt/*|*.exe) ;; *) printf "%s\t%s\n" "$cmd" "$binary_path" ;; esac; done';
  const r = await exec("wsl.exe", ["-d", distro, "--exec", "bash", "-lc", script, "herdr-check", ...binaries]);
  if (r.code !== 0) throw new Error(r.stderr || "Could not inspect WSL agents");
  return new Set(r.stdout.split(/\r?\n/).filter(Boolean).map(line => line.split("\t", 1)[0]));
}

function agentArgv(space, argv) {
  const distro = wslDistro(space);
  if (!distro) return argv;
  const activeTab = space.tabs?.find(tab => tab.active);
  const cwd = panes().find(pane => pane.tab === activeTab?.id && pane.cwd)?.cwd;
  return ["wsl.exe", "-d", distro, "--cd", cwd?.startsWith("/") ? cwd : "~", "--exec", "bash", "-lc", 'export PATH="$HOME/.opencode/bin:$HOME/.local/bin:$PATH"; exec "$@"', "herdr-agent", ...argv];
}

function newTerminal(space) {
  const distro = wslDistro(space);
  if (!distro) return run("tab.new", { space: space?.id });
  const activeTab = space.tabs?.find(tab => tab.active);
  const cwd = panes().find(pane => pane.tab === activeTab?.id && pane.cwd)?.cwd;
  run("tab.new", {
    space: space.id,
    argv: ["wsl.exe", "-d", distro, "--cd", cwd?.startsWith("/") ? cwd : "~"],
  });
}

function shortcut(name) {
  const k = keys().find(b => b.section === "global" && b.action === name);
  if (!k?.keys.trim()) return "";
  const mac = window()?.platform === "macos";
  const names = mac ? { ctrl: "⌃", alt: "⌥", shift: "⇧", cmd: "⌘", fn: "fn" } : { ctrl: "Ctrl", alt: "Alt", shift: "Shift", cmd: "Super", fn: "Fn" };
  const alias = { secondary: mac ? "cmd" : "ctrl", super: "cmd", win: "cmd" };
  return k.keys.trim().split(/\s+/).map(stroke => {
    const parts = stroke.split("-");
    let key = parts.pop();
    if (key === "") { key = "-"; parts.pop(); }
    const held = new Set(parts.map(m => alias[m.toLowerCase()] ?? m.toLowerCase()));
    if (/^[A-Z]$/.test(key)) held.add("shift");
    const label = key.length === 1 ? key.toUpperCase() : key[0].toUpperCase() + key.slice(1).toLowerCase();
    return [...Object.keys(names).filter(m => held.has(m)).map(m => names[m]), label].join(mac ? "" : "+");
  }).join(" ");
}

export default class NewMenu extends View {
  init(_props, cx) {
    const activeSpace = spaces().find(s => s.active);
    const machine = activeSpace?.machine;
    const where = machine ?? "";
    this.wsl = wslDistro(activeSpace);
    this.wslChecking = Boolean(this.wsl);
    this.agents = this.wsl ? [] : (shared(KNOWN)?.[where] ?? []);
    this.handle = cx.focus_handle();
    this.handle.focus();
    cx.spawn(async cx => {
      try {
        const programs = await knownAgents({ on: machine });
        if (this.wsl) {
          const cache = shared(WSL_AGENT_CACHE)?.[this.wsl];
          let installed;
          if (cache && Date.now() - cache.at < WSL_AGENT_CACHE_TTL) {
            installed = new Set(cache.commands);
          } else {
            installed = await installedWslCommands(this.wsl, programs);
            setShared(WSL_AGENT_CACHE, {
              ...(shared(WSL_AGENT_CACHE) ?? {}),
              [this.wsl]: { at: Date.now(), commands: [...installed] },
            });
          }
          this.agents = programs.map(program => ({ ...program, installed: installed.has(program.run?.[0]) }));
          this.wslChecking = false;
        } else {
          this.agents = programs;
          setShared(KNOWN, { ...shared(KNOWN), [where]: this.agents });
        }
      }
      catch { this.failed = true; this.wslChecking = false; }
      cx.notify();
    });
  }
  row(id, icon, name, action, hint = "", enabled = true) {
    const t = theme();
    return h_flex().id(id).h(31).px(9).gap(10).rounded(7).items_center().flex_none()
      .text_color(enabled ? t.foreground : t.dim).when(enabled, el => el.hover(s => s.bg(t.selected)))
      .on_click(() => { if (enabled) { closeOverlay(props().overlay); action(); } })
      .child(icon).child(div().flex_1().child(name)).child(div().text_size(11).text_color(t.dim).child(hint));
  }
  render() {
    const t = theme();
    const space = spaces().find(s => s.active);
    const installed = this.agents.filter(a => a.installed);
    const choices = [...installed, ...this.agents.filter(a => !a.installed)];
    return v_flex().min_h(0).w_full().h(Math.min(491, 167 + Math.max(1, choices.length) * 31)).bg(t.popover).p(5).text_size(12.8)
      .id("new-menu").track_focus(this.handle)
      .on_key_down((e) => {
        if (e.modifiers.control || e.modifiers.platform || e.modifiers.alt) return;
        const agent = /^[1-9]$/.test(e.key) ? installed[Number(e.key) - 1] : null;
        if (!agent) return;
        closeOverlay(props().overlay);
        run("tab.new", { name: agent.name, space: space?.id, argv: agentArgv(space, agent.run) });
      })
      .child(this.row("terminal", svg("icons/shell.svg").size(14), "Terminal", () => newTerminal(space), shortcut("tab.new")))
      .child(div().px(9).pt(8).pb(4).text_size(11).text_color(t.dim).child("Start an agent"))
      .child(v_flex().flex_1().min_h(0).overflow_y_scrollbar()
        .children(choices.map((a, i) => this.row(a.key, a.tint ? svg(a.icon).size(14).text_color(t.foreground) : image(a.icon).size(14), a.name,
          () => run("tab.new", { name: a.name, space: space?.id, argv: agentArgv(space, a.run) }), a.installed ? (i < 9 ? String(i + 1) : "") : "not installed", a.installed)))
        .when(choices.length === 0, el => el.child(div().px(9).py(6).text_color(t.dim).child(this.wslChecking ? "Checking agents in WSL..." : this.wsl ? `No supported agents installed in ${this.wsl}` : this.failed ? "Could not load agents" : "No agents found"))))
      .child(div().h(1).mx(4).my(5).bg(t.border))
      .child(this.row("space", div().w(14).child("+"), "New space", () => run("space.new"), shortcut("space.new")))
      .child(this.row("worktree", svg("mods/workspace-chrome/branch.svg").size(14), "New worktree…", () => openOverlay({ mod: "worktree", kind: "dialog", width: 460, height: 280, props: { space: space?.id, folder: panes().find(p => p.focused)?.cwd, action: "new" } }), "", Boolean(space)))
      .child(this.row("worktree-open", svg("mods/workspace-chrome/branch.svg").size(14), "Open worktree\u2026", () => openOverlay({ mod: "worktree", kind: "dialog", width: 560, height: 480, props: { space: space?.id, folder: panes().find(p => p.focused)?.cwd, action: "open" } }), "", Boolean(space)));
  }
}
