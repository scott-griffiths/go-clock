import SwiftUI
import UniformTypeIdentifiers
import AVFoundation
import WebKit

/**
 A `WKWebView` showing `www/index.html` out of the app bundle.

 Each setting on the web view is here because this page needs it, and the
 comment says which part of it. The bridge is as small as it can be: the shell
 tells the page its version, for the about box, as a user script before the
 page runs; the page asks the shell for one thing, a tap of haptic feedback
 when the hand lands on the board (`Haptics`).
 */
struct WebAppView: UIViewRepresentable {
    func makeCoordinator() -> Coordinator { Coordinator() }

    /**
     Where the page's navigation ends up, and what it said.

     The logging is here because a web view that fails shows a blank window
     and nothing else — did the file resolve, did the load commit, did the
     web process die — so a shell this small can afford to say what it did.
     Read it with:

         xcrun simctl spawn booted log show --last 5m --predicate 'eventMessage CONTAINS "[goclock]"'
     */
    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
        /// What the page said (`PageLog.script`), on the same log line the
        /// navigation events are on, so one `log stream` shows both; or a
        /// request for haptic feedback (`Haptics`).
        func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
            if message.name == Haptics.name {
                Haptics.play(String(describing: message.body))
            } else {
                NSLog("[goclock] page: %@", String(describing: message.body))
            }
        }

        /**
         Only the bundle is shown in the app. Anything else the page asks to
         navigate to — the GitHub link in the about box — opens in Safari,
         because a web view with no address bar and no back button is a page
         the reader cannot leave.
         */
        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = navigationAction.request.url,
                  url.scheme != BundleScheme.scheme, url.scheme != "about" else {
                decisionHandler(.allow)
                return
            }
            decisionHandler(.cancel)
            UIApplication.shared.open(url)
        }

        /// A `target="_blank"` link or `window.open`: the same, in Safari.
        func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                     for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
            if let url = navigationAction.request.url, url.scheme != BundleScheme.scheme {
                UIApplication.shared.open(url)
            }
            return nil
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            NSLog("[goclock] page loaded: %@", webView.url?.absoluteString ?? "(no url)")
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            NSLog("[goclock] page failed: %@", error.localizedDescription)
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            NSLog("[goclock] page failed before it started: %@", error.localizedDescription)
        }

        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
            NSLog("[goclock] the web process died; reloading")
            webView.reload()
        }
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()

        // The bundle, served under an origin of its own. See `BundleScheme`
        // for why this is not `loadFileURL`.
        config.setURLSchemeHandler(BundleScheme(), forURLScheme: BundleScheme.scheme)

        // The shell's version, for the about box, before any of the page's
        // own scripts run (my-clock.js reads `window.goClockShell` on
        // DOMContentLoaded). It is the one thing the page hears from the shell.
        config.userContentController.addUserScript(
            WKUserScript(source: ShellInfo.script, injectionTime: .atDocumentStart, forMainFrameOnly: true)
        )

        // The page's own errors, forwarded to the same log as the navigation
        // events. The Web Inspector shows them too, but only with a Mac
        // attached.
        config.userContentController.add(context.coordinator, name: PageLog.name)
        config.userContentController.addUserScript(
            WKUserScript(source: PageLog.script, injectionTime: .atDocumentStart, forMainFrameOnly: true)
        )

        // The one thing the page asks for: a tap under the finger when a hold
        // on the board becomes the hand (my-clock.js, `haptic`). A web view
        // has no way to reach the taptic engine itself.
        config.userContentController.add(context.coordinator, name: Haptics.name)

        // The stones may click without anyone touching the screen (sounds.js,
        // when sound is on): a web view otherwise refuses to play anything
        // until a tap. And the clicks are ambient — they keep to the silent
        // switch and do not interrupt whatever else is playing — which the
        // web view honours as long as the app has chosen a category itself.
        config.mediaTypesRequiringUserActionForPlayback = []
        try? AVAudioSession.sharedInstance().setCategory(.ambient, mode: .default)
        try? AVAudioSession.sharedInstance().setActive(true)

        // A real frame, not `.zero`. A `WKWebView` has no intrinsic content
        // size, so a zero frame can be exactly what it gets laid out at, which
        // is a blank window with no other symptom at all.
        let web = WKWebView(frame: UIScreen.main.bounds, configuration: config)
        web.navigationDelegate = context.coordinator
        web.uiDelegate = context.coordinator

        // Lets Safari's Web Inspector attach to the app on a Mac, which is the
        // only way to see the page's own console from inside a shell.
        if #available(iOS 16.4, *) { web.isInspectable = true }

        // The page lays itself out against `env(safe-area-inset-*)` and the
        // window ignores the safe area, so the web view must not inset its
        // content a second time.
        web.scrollView.contentInsetAdjustmentBehavior = .never

        // The page is `overflow: hidden` and exactly the screen; rubber-banding
        // would drag the board off its background. The page says the same
        // with `overscroll-behavior: none`; belt and braces.
        web.scrollView.bounces = false

        // A long press on the GitHub link is not a request for a preview card.
        web.allowsLinkPreview = false

        // Nothing here is a document with a white page behind it. Without
        // this there is a white flash between the bundle loading and the
        // page's first paint.
        web.isOpaque = false
        web.backgroundColor = UIColor(named: "LaunchBackground")
        web.scrollView.backgroundColor = web.backgroundColor

        // A clock that goes dark is no use on a shelf. The screen stays on for
        // as long as the app is in front; iOS restores the idle timer as soon
        // as it is not.
        UIApplication.shared.isIdleTimerDisabled = true

        load(into: web)
        return web
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    /**
     `www` is a *folder reference* in the project, not a group, so the whole
     tree arrives in the bundle under that name and `go-clock.js` sits beside
     `index.html` where the page's own `import` expects it.

     Loaded through `BundleScheme` rather than `loadFileURL`: the page is an
     ES module (`<script type="module">`), and WebKit treats a `file://` page
     as an opaque origin, so a module fetched from a relative URL is a
     cross-origin load and refused — with no message, since the origin is not
     allowed to know what it could not reach. The page would sit there as a
     bare board with no stones and nothing in the log.
     */
    private func load(into web: WKWebView) {
        guard BundleScheme.folder != nil else {
            // Not a crash and not silent: this is what a project whose `www`
            // reference is broken looks like, and it should say so rather
            // than showing an empty window nobody can diagnose.
            web.loadHTMLString(missingPage, baseURL: nil)
            return
        }
        web.load(URLRequest(url: BundleScheme.index))
    }

    private var missingPage: String {
        """
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <body style="font: -apple-system-body; background: #2f3432; color: #eee; padding: 2rem">
        <h2>No web page in this bundle</h2>
        <p>The app is the page in <code>www/</code>, and it is not here.</p>
        <p>Check the <code>www</code> folder reference in the Xcode project.</p>
        </body>
        """
    }
}

/// What the page is told about the shell it is in: `window.goClockShell`.
enum ShellInfo {
    static var script: String {
        let info = Bundle.main.infoDictionary ?? [:]
        let version = info["CFBundleShortVersionString"] as? String ?? "?"
        let build = info["CFBundleVersion"] as? String ?? "?"
        return "window.goClockShell = { version: \"\(version)\", build: \"\(build)\" };"
    }
}

/**
 Haptic feedback the page asks for by posting a kind to `goClockHaptic`:
 `grab` when a held finger becomes the hand, anything else a lighter tick.
 The generators are made once and kept warm, since the first tap after a
 pause is otherwise late.
 */
enum Haptics {
    static let name = "goClockHaptic"
    private static let grab = UIImpactFeedbackGenerator(style: .medium)
    private static let tick = UIImpactFeedbackGenerator(style: .light)

    static func play(_ kind: String) {
        let generator = kind == "grab" ? grab : tick
        generator.prepare()
        generator.impactOccurred()
    }
}

/**
 A script, injected before the page, that forwards what the page would
 otherwise only say to a console nobody is looking at: uncaught errors,
 rejected promises nothing caught, and `console.error`/`console.warn`.
 It does not touch `console.log` or `console.info`, which is for what went wrong.
 */
enum PageLog {
    static let name = "goClockLog"

    static let script = """
    (() => {
      const send = (kind, text) => {
        try { window.webkit.messageHandlers.\(name).postMessage(kind + ': ' + text); } catch (_) {}
      };
      const str = (v) => {
        if (v instanceof Error) return (v.name + ': ' + v.message + (v.stack ? '\\n' + v.stack : ''));
        try { return typeof v === 'string' ? v : JSON.stringify(v); } catch (_) { return String(v); }
      };
      window.addEventListener('error', (e) =>
        send('error', (e.message || '') + ' @ ' + (e.filename || '') + ':' + (e.lineno || 0) + (e.error ? '\\n' + str(e.error) : '')));
      window.addEventListener('unhandledrejection', (e) => send('unhandled rejection', str(e.reason)));
      for (const level of ['error', 'warn']) {
        const original = console[level].bind(console);
        console[level] = (...args) => { send(level, args.map(str).join(' ')); original(...args); };
      }
    })();
    """
}

/**
 `www/` served to the page as `goclock://app/…`.

 An origin, which is the thing a `file://` URL is not. WebKit gives a file
 page a unique origin — no two file URLs are the same site, and a page may not
 reach even its own neighbour — so the module import in `index.html` fails,
 and `localStorage`, where the settings and the board live between launches,
 has no stable place to keep anything. Under a scheme of its own the page is
 one ordinary site: the module loads and the settings persist, and none of
 the private `allowFileAccessFromFileURLs` machinery is involved.

 The handler is the smallest static file server there is: a path under `www`,
 a content type from the extension, and a 404 for anything else. Paths are
 resolved and then checked to still be inside the folder, so `..` in a request
 reaches nothing.
 */
final class BundleScheme: NSObject, WKURLSchemeHandler {
    static let scheme = "goclock"
    static let index = URL(string: "goclock://app/index.html")!

    static var folder: URL? {
        Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "www")?
            .deletingLastPathComponent()
            .standardizedFileURL
    }

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url, let folder = Self.folder else {
            task.didFailWithError(URLError(.fileDoesNotExist))
            return
        }
        let path = url.path.isEmpty || url.path == "/" ? "/index.html" : url.path
        let file = folder.appendingPathComponent(path).standardizedFileURL
        guard file.path.hasPrefix(folder.path + "/"), let data = try? Data(contentsOf: file) else {
            NSLog("[goclock] no such file in the bundle: %@", path)
            task.didReceive(HTTPURLResponse(url: url, statusCode: 404, httpVersion: "HTTP/1.1", headerFields: nil)!)
            task.didFinish()
            return
        }
        let type = UTType(filenameExtension: file.pathExtension)?.preferredMIMEType ?? "application/octet-stream"
        let response = HTTPURLResponse(
            url: url, statusCode: 200, httpVersion: "HTTP/1.1",
            headerFields: ["Content-Type": type, "Content-Length": String(data.count)]
        )!
        task.didReceive(response)
        task.didReceive(data)
        task.didFinish()
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}
}
