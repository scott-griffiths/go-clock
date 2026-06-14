# The Go Clock

Have you ever wanted to use a Go board to tell the time? No? Well now you can!

Go is an ancient board game that originated in China about 3000 years ago (it's also commonly known as Igo, Weiqi and Baduk).

For millennia it has been impractical to use the game equipment to accurately tell the time, but advances in computer technology and recent breakthroughs in robotics have given our team of highly skilled machine learning engineers, physicists and Go enthusiasts enough free time to hack this app together.

A working version is currently pretending to be the documentation of this project on GitHub!

http://scott-griffiths.github.io/go-clock/

## Local development

The web version is a static site under `www/`. It uses native ES modules, so test it through a local web server rather than opening `index.html` directly:

```sh
python3 -m http.server 8000
```

Then open http://127.0.0.1:8000/. The root page redirects to the app under `www/`.

There is no package install or build step.

The app registers a service worker from `www/service-worker.js`, so it can cache the app shell, images, and stone assets for offline use once it has been opened over HTTPS or localhost.

The public GitHub Pages URL is expected to remain `https://scott-griffiths.github.io/go-clock/`. The root `index.html` redirects to `www/`, where the actual app and service worker live. That keeps the project-page URL working, but the offline service-worker scope is `www/`; if the app is ever intended to work offline from the bare root URL itself, the contents of `www/` should be published at the Pages root instead.

## Project shape

- `www/index.html` is the static app shell.
- `www/my-clock.js` owns browser UI, settings, persistence, and layout lifecycle.
- `www/go-clock.js` owns the board model and stone animation.
- `www/my-clock.css` owns all visual styling.
- `www/service-worker.js` caches the static app for offline use.
- `embedded.html` and `simple-example.html` are legacy compatibility pages that redirect to the current app.

Useful checks:

```sh
node --check www/my-clock.js
node --check www/go-clock.js
```
