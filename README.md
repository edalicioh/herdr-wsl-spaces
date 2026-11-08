# WSL Spaces for Herdr

A coordinated set of three Herdr mods that makes WSL distributions feel like local Herdr spaces on Windows. It adds a WSL manager, groups WSL spaces in the sidebar, opens new terminals and coding agents inside the selected distro, and keeps WSL out of the tab-bar **+** menu.

This uses `wsl.exe`; it does not create SSH machines or require an SSH server in WSL.

## Requirements

- Herdr for Windows and the `herdr-app` command on `PATH`
- WSL with at least one installed Linux distribution
- Bash inside each distribution for agent discovery and launch

## Install

Clone or download this repository, then run in PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\setup.ps1
```

The installer copies all three mods to `%USERPROFILE%\.config\herdr-app\mods`, checks them with `herdr-app check`, changes the active layout to use `spaces-wsl`, and routes the tab-bar **+** through `new-menu-wsl`. It backs up the layout and tab mod before changing them.

## Use

1. Click the terminal icon beside **Spaces** to open the WSL manager.
2. Click **Add WSL** to create a local Herdr space for a distro, or **Open** to select its existing space.
3. Open the tab-bar **+** inside that space. **Terminal** opens a shell in the same distro. Agents installed in that distro appear first; other known agents appear disabled as **not installed**.
4. Spaces created this way are grouped under **WSL** in the sidebar and remain in that group when renamed.

The WSL agent inventory is cached per distro for five minutes. Windows launchers found through `/mnt/c` are not treated as Linux installations. Install the agent inside WSL to run it there; configure its provider login separately inside the distro.

## The mods

- [`wsl-manager`](wsl-manager/RECIPE.md): lists installed distros and creates or opens a local WSL space.
- [`spaces-wsl`](spaces-wsl/RECIPE.md): groups WSL spaces and provides the manager button in the Spaces header.
- [`new-menu-wsl`](new-menu-wsl/RECIPE.md): opens terminals and agents in the active WSL distro, with per-distro agent detection and cache.

The mods are designed to work together. Run `setup.ps1` to install and wire the complete set.

## Gallery publication

This repository is public at [edalicioh/herdr-wsl-spaces](https://github.com/edalicioh/herdr-wsl-spaces), and `main` is pushed. Each mod folder has its own `mod.json` and `RECIPE.md`. Add a real `preview.png` to each mod folder, push the images, then add the repository topic `herdr-mod` to list the mods in the Herdr gallery. See [`PUBLISHING.md`](PUBLISHING.md) for the exact filenames and steps. The setup script remains the recommended way to install the coordinated set.
