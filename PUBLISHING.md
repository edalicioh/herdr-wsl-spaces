# Publishing checklist

The public GitHub repository is live at [edalicioh/herdr-wsl-spaces](https://github.com/edalicioh/herdr-wsl-spaces), and the local `main` branch is pushed to `origin/main`.

## Remaining before gallery listing

The gallery recipe format calls for a real `preview.png` in every mod folder. The WSL Manager preview is now included. Capture the two remaining views from the current Herdr UI and save them as:

- `spaces-wsl/preview.png`: the Spaces sidebar with the WSL group and its manager button.
- `new-menu-wsl/preview.png`: the **+** menu open inside a WSL space.

After adding the captures, run:

```powershell
git add wsl-manager/preview.png spaces-wsl/preview.png new-menu-wsl/preview.png
git commit -m "Add gallery previews"
git push
```

Then add the repository topic `herdr-mod` on GitHub under **About ? Edit repository details ? Topics**. The Herdr gallery discovers tagged public repositories.

The root `README.md` documents the full installation. The three mod folders each have their own `mod.json` and `RECIPE.md`; install the coordinated set with `setup.ps1`.
