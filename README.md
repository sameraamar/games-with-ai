# Games With AI

Small browser games built to stay lightweight and easy to host.

This repository currently contains static games that run in the browser with plain HTML and local JavaScript. There is no backend requirement for the existing projects.

## Playable Games

### Learn Hebrew

- Path: `LearnHebrew/LearnHebrew.html`
- Type: single-file HTML app
- Includes: letter learning, word matching, numbers, memory game, saved progress, speech synthesis fallback
- Best fit: desktop and mobile browsers

### Iron Wolf 3D

- Path: `Wolfstien3D/index.html`
- Type: static HTML + local JavaScript
- Includes: canvas rendering, pointer lock, fullscreen, local settings and score storage, browser audio
- Best fit: desktop browsers

## GitHub Pages

This repository now includes a root homepage at `index.html`, so it can be published directly with GitHub Pages.

After enabling Pages, the site should be available at:

`https://YOUR-USERNAME.github.io/YOUR-REPO/`

The current game routes will be:

- `https://YOUR-USERNAME.github.io/YOUR-REPO/LearnHebrew/LearnHebrew.html`
- `https://YOUR-USERNAME.github.io/YOUR-REPO/Wolfstien3D/`

## How To Enable Pages

1. Push the repository to GitHub.
2. Open the repository `Settings`.
3. Open `Pages`.
4. Under `Build and deployment`, choose `Deploy from a branch`.
5. Select your main branch.
6. Select the `/ (root)` folder.
7. Save and wait for GitHub to publish the site.

## Local Development

You can open the HTML files directly in a browser, but GitHub Pages is the intended way to share them.

- Root landing page: `index.html`
- Learn Hebrew: `LearnHebrew/LearnHebrew.html`
- Iron Wolf 3D: `Wolfstien3D/index.html`

## Notes

- `LearnHebrew` uses the browser Speech Synthesis API when available.
- `Iron Wolf 3D` uses browser features such as Pointer Lock, Fullscreen, Canvas, Web Audio, and localStorage.
- Those features work better from a real hosted page than from the GitHub file viewer.