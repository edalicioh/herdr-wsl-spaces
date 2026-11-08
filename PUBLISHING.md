# Publishing checklist

The code and per-mod recipes are prepared. Gallery previews still need to be captured from the running Herdr UI and saved as `preview.png` in each mod folder.

## GitHub

Create the **public** repository `edalicioh/herdr-wsl-spaces`, then from this folder run:

```powershell
git remote add origin https://github.com/edalicioh/herdr-wsl-spaces.git
git branch -M main
git push -u origin main
```

On GitHub, open **About ? Edit repository details ? Topics** and add:

```text
herdr-mod
```

The gallery requires a public repository, one mod folder per mod, a `RECIPE.md`, and a `preview.png` in each folder. The root `README.md` documents installation of all three mods together.

## Preview capture

Capture the WSL manager, the Spaces sidebar with its WSL group, and the **+** menu opened from a WSL space. Save the relevant screenshot in each mod folder as `preview.png`; avoid showing personal paths, tokens, or private repository names.
