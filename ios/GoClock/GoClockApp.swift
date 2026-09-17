import SwiftUI

/**
 The whole of the native app: a window with the web page in it.

 Everything the Go Clock does is in `www/`, the same files the website
 serves, copied into the bundle as a folder. This target exists for what a
 web page cannot do for itself — an icon, the whole screen, a place on the
 App Store, a screen that stays awake — and should stay that small. If it
 ever knows what a stone is, two things describe the app instead of one.
 */
@main
struct GoClockApp: App {
    var body: some Scene {
        WindowGroup {
            WebAppView()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                // The page is written for the whole screen: `viewport-fit=cover`,
                // with its toolbar and sidebar laid out against
                // `env(safe-area-inset-*)`. Insetting the web view as well
                // would take that room twice.
                .ignoresSafeArea()
                // What shows for the instant before the page has painted its
                // own background. The same dark grey as `body` in my-clock.css,
                // and as the launch screen (`LaunchBackground` in the asset
                // catalog), so the app opens without a flash.
                .background(Color("LaunchBackground"))
                // A clock is something to look at, not a document with a
                // status bar over it. The page has its own controls at the
                // top-left, clear of the notch. The home indicator goes too,
                // and comes back on a swipe from the bottom edge.
                .statusBarHidden(true)
                .persistentSystemOverlays(.hidden)
        }
    }
}
