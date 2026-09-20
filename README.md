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
- `www/go-clock.js` is the clock: what is on the board, the board on the page, its two hands (the
  hand does everything; the other only moves stones already on the screen, and never in step with
  the first), and each move from decision to landing. The modules it draws on, in the order a
  stone meets them:
  - `www/board.js` — the grid as numbers: sizes, colours, indices, distances, lines.
  - `www/faces.js` — the clock faces: the stones a time wants, per view.
  - `www/planner.js` — the hand's next move, from the board as it is and as the face wants it.
  - `www/placement.js` — where a stone lies on its point: the scatter, the nudges, the shoves.
  - `www/moves.js` — a move animated: slid, lifted, dropped in, lifted out, and the push of a swap.
  - `www/stone-dom.js` — the stones on the page: images, elements, shadows, the animation helper.
  - `www/physics.js` — the stone simulation the sweep and the hand share.
  - `www/sweep.js` — an arm wiping the stones off the board onto the table.
  - `www/hand.js` — a finger held on the board, pushing the stones about.
  - `www/flight.js` — the stones flying off into space, drawn from sprite sheets of a stone
    turning over.
  - `www/replay.js` — a famous game replayed on the board: the stones flung off, the game
    played through by the two hands, and the board handed back to the clock.
  - `www/sgf.js` — a game record read from SGF and played out, each move with its captures.
  - `www/games/` — the games that come with the clock, as SGF files from
    [Andries Brouwer's collection](https://homepages.cwi.nl/~aeb/go/games/), shelved in
    `replay.js` as historical (the Edo houses), modern (1926 onwards) and AI.

  `board.js`, `faces.js`, `planner.js`, `physics.js` and `sgf.js` have no DOM in them and are tested under node.
- `www/my-clock.css` owns all visual styling.
- `www/service-worker.js` caches the static app for offline use.
- `www/manifest.webmanifest` makes the web version installable to a home screen.
- `ios/` is the iOS app: a native shell around the same `www/` folder (see below).
- `scripts/make-icon.swift` renders the app icon and web icons from the board and stone images.
- `scripts/make-stone-sprites.swift` renders the tumbling-stone sprite sheets in `www/images`
  from the stone images.
- `scripts/testflight.sh` archives the iOS app and uploads it to App Store Connect.
- `resources/` holds the full-size stone images (used by the icon script) and a screenshot.
- The tables in `www/images` are seamless CC0 textures, tiled to the board's size by
  `my-clock.js`: `mahogany` (dark_wood) and `walnut` (walnut_veneer) from
  [Poly Haven](https://polyhaven.com); `turf` (Grass004), `ice` (Ice004, under a veil in CSS)
  and `water` (Ice002, whose cells pass for caustics once tinted blue in CSS) from
  [ambientCG](https://ambientcg.com).
- `embedded.html` and `simple-example.html` are legacy compatibility pages that redirect to the current app.

Useful checks:

```sh
node --test tests/      # the faces at the awkward times, the planner's choices, the stone physics
node --check www/my-clock.js
node --check www/go-clock.js
```

The tests import `www/go-clock.js` under node, which is why that module
only makes its `Image`s when there is an `Image` to make.

## iOS app

`ios/GoClock.xcodeproj` is a SwiftUI window with a `WKWebView` in it and
nothing else. `www/` is a *folder reference* in the project, so the same files
the website serves ship in the bundle, unchanged and with no build step. The
bundle identifier is `uk.co.brokensymmetry.thegoclock` (the original 2014
App Store listing) and the version is `MARKETING_VERSION` in the project; the
shell tells the page that number at launch, so the about box shows it rather
than the one written in `index.html`.

The page is served to the web view as `goclock://app/…`, never as a `file://`
URL (`BundleScheme` in `ios/GoClock/WebAppView.swift`). WebKit treats a file
page as an opaque origin, so the module import in `index.html` would be refused
without a message and `localStorage` would have nowhere stable to live. Under a
scheme of its own the page is one ordinary site. The shell also forwards the
page's uncaught errors and `console.error`s to the system log; read them with:

```sh
xcrun simctl spawn booted log show --last 5m --predicate 'eventMessage CONTAINS "[goclock]"'
```

Things the shell does that the website cannot: it keeps the screen awake while
the app is in front (the website asks for a Screen Wake Lock, which browsers
grant only over HTTPS and not in a custom-scheme web view), hides the status
bar and home indicator, opens the GitHub link in Safari rather than navigating
away from the board, disables pinch and double-tap zoom (`user-scalable=no` in
the viewport meta, which Safari ignores and `WKWebView` honours), and gives a
tap of haptic feedback when the hand knocks into a stone (the page posts to
the `goClockHaptic` message handler; on the web, `navigator.vibrate` where it
exists, which is not iOS).

```sh
open ios/GoClock.xcodeproj                            # in Xcode

xcodebuild -project ios/GoClock.xcodeproj -scheme GoClock \
  -destination 'platform=iOS Simulator,name=iPhone 17' build

xcodebuild test -project ios/GoClock.xcodeproj -scheme GoClock \
  -destination 'platform=iOS Simulator,name=iPhone 17'
                    # the one UI test: the page's module ran, a board choice
                    # survives a relaunch, the about box opens

swift scripts/make-icon.swift    # regenerate the app icon and web icons

scripts/testflight.sh --dry-run  # archive and export locally; checks signing
scripts/testflight.sh            # bump the build number, archive, upload
```

`scripts/testflight.sh` bumps `CURRENT_PROJECT_VERSION` — App Store Connect
refuses a build number it has seen — commits that one file as its own commit,
archives, and exports; the export *is* the upload (`destination: upload` in
`ios/ExportOptions.plist`). The build appears in App Store Connect's TestFlight
tab ten minutes or so later, from where it can be attached to a version and
submitted for review. `DEVELOPMENT_TEAM` is set in the project, so
`-allowProvisioningUpdates` makes the certificates and profiles itself; the
account needs to be signed in to Xcode (Settings → Accounts). The encryption
declaration is in the build settings (`ITSAppUsesNonExemptEncryption = NO`;
the app makes no network connections of its own), and
`ios/GoClock/PrivacyInfo.xcprivacy` declares that nothing is collected.
