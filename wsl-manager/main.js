import { View, div, svg } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { exec, spaces, run, theme, props, closeOverlay, shared } from "herdr";

const PREFIX = "WSL \u00b7 ";
const wslName = name => name.startsWith(PREFIX) ? name.slice(PREFIX.length).replace(/ \(\d+\)$/, "") : null;

async function installedDistros() {
  const r = await exec("wsl.exe", ["--list", "--quiet"]);
  if (r.code !== 0) throw new Error(r.stderr || "WSL is unavailable");
  return r.stdout.replace(/\0/g, "").replace(/^\uFEFF/, "").split(/\r?\n/)
    .map(name => name.trim().replace(/^\*\s*/, ""))
    .filter(name => name && !/^(docker-desktop|docker-desktop-data)$/i.test(name));
}

function knownSpace(distro) {
  const map = shared("wsl.spaces") ?? {};
  return spaces().find(space => {
    if (space.machine != null) return false;
    if (map[space.id] === distro || wslName(space.name) === distro) return true;
    if (space.name === distro) return true;
    const suffix = space.name.slice(distro.length);
    return space.name.startsWith(distro) && /^ \(\d+\)$/.test(suffix);
  });
}

function createSpace(distro) {
  const base = `${PREFIX}${distro}`;
  const used = new Set(spaces().filter(space => space.machine == null).map(space => space.name));
  let name = base, suffix = 2;
  while (used.has(name)) name = `${base} (${suffix++})`;
  run("space.new", { name, machine: "", argv: ["wsl.exe", "-d", distro, "--cd", "~"] });
}

export default class WslManager extends View {
  init(_props, cx) {
    this.distros = null;
    this.error = null;
    cx.spawn(async cx => {
      try { this.distros = await installedDistros(); }
      catch (e) { this.distros = []; this.error = String(e); }
      cx.notify();
    });
  }

  item(t, distro, index) {
    const existing = knownSpace(distro);
    return h_flex().id(`wsl-distro-${index}`).h(48).px(10).gap(10).flex_none().items_center().rounded(8)
      .hover(s => s.bg(t.hover))
      .child(svg("mods/workspace-chrome/server.svg").size(16).text_color(t.muted))
      .child(v_flex().flex_1().min_w(0).child(div().truncate().text_size(13).text_color(t.foreground).child(distro))
        .child(div().text_size(11).text_color(t.dim).child(existing ? `Space: ${existing.name}` : "Local WSL distribution")))
      .child(div().id(`wsl-action-${index}`).px(10).h(28).flex().items_center().rounded(7)
        .border_1().border_color(t.input).bg(t.raised).text_size(12).text_color(t.foreground)
        .hover(s => s.bg(t.selected))
        .on_click(() => {
          if (existing) run("space.select", { id: existing.id });
          else createSpace(distro);
          closeOverlay(props().overlay);
        })
        .child(existing ? "Open" : "Add WSL"));
  }

  render() {
    const t = theme();
    return v_flex().id("wsl-manager").w_full().h_full().min_h(0).p(16).gap(8)
      .bg(t.popover).text_color(t.foreground)
      .child(h_flex().h(28).items_center().child(div().flex_1().text_size(15).font_semibold().child("WSL spaces"))
        .child(div().id("wsl-manager-close").size(24).flex().items_center().justify_center().rounded(6)
          .text_color(t.dim).hover(s => s.bg(t.hover).text_color(t.foreground))
          .on_click(() => closeOverlay(props().overlay)).child(svg("mods/workspace-chrome/x.svg").size(13))))
      .child(div().pb(5).text_size(12).text_color(t.muted).child("Add a distro as a local Herdr space. No SSH connection is used."))
      .child(v_flex().flex_1().min_h(0).overflow_y_scrollbar()
        .when(this.distros === null, el => el.child(div().px(10).py(12).text_size(12.5).text_color(t.dim).child("Reading installed WSL distros…")))
        .when(this.distros?.length === 0, el => el.child(div().px(10).py(12).text_size(12.5).text_color(this.error ? t.blocked : t.dim)
          .child(this.error ? "Could not read WSL distributions" : "No WSL distributions found")))
        .children((this.distros ?? []).map((distro, i) => this.item(t, distro, i))));
  }
}
