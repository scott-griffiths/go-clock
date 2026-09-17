import XCTest

/**
 The app, driven the way a reader drives it.

 One test, and it covers the two things a web view shell can get wrong with
 no error to show for it: the page's module failing to load, and the page's
 storage having nowhere to live. A shell that serves `www/` as `file://`
 fails both — silently, with a bare board and no stones — and this is the
 only thing here that would notice.

 Everything it reaches for is in the page, through the web view's
 accessibility tree: a `<button>` is a button with its `aria-label` as its
 name, and a button with `aria-pressed` — every choice in the toolbar — is a
 *switch* whose value is "1" when pressed. The face buttons are created by
 my-clock.js rather than written in index.html, so their existence is the
 module having run.
 */
final class GoClockUITests: XCTestCase {

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    /// The page's controls fade after a few seconds; a tap on the board brings them back.
    private func wakeControls(in app: XCUIApplication) {
        app.webViews.firstMatch.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
    }

    /// Whether a toolbar choice is the pressed one.
    private func isPressed(_ choice: XCUIElement) -> Bool {
        (choice.value as? String) == "1"
    }

    /// Taps a toolbar choice (waking the controls first) and waits for it to take.
    private func choose(_ choice: XCUIElement, in app: XCUIApplication) {
        wakeControls(in: app)
        XCTAssertTrue(choice.waitForExistence(timeout: 5))
        choice.tap()
        let pressed = expectation(for: NSPredicate(format: "value == '1'"), evaluatedWith: choice)
        wait(for: [pressed], timeout: 5)
    }

    func testPageLoadsAndAFaceChoiceSurvivesARelaunch() throws {
        let app = XCUIApplication()
        app.launch()

        let analogue = app.webViews.switches["Analogue"]
        XCTAssertTrue(analogue.waitForExistence(timeout: 30), "The face buttons never appeared; the page's module did not run.")

        // A known face first — the simulator keeps whatever the last run left —
        // and then a different one, so a relaunch has a change to remember.
        choose(analogue, in: app)
        let digital = app.webViews.switches["Digital"]
        choose(digital, in: app)
        XCTAssertFalse(isPressed(analogue))

        // The about box, which is where the shell's version lands.
        wakeControls(in: app)
        app.webViews.buttons["Show sidebar"].tap()
        let about = app.webViews.buttons["About"]
        XCTAssertTrue(about.waitForExistence(timeout: 5))
        about.tap()
        let version = app.webViews.staticTexts.matching(NSPredicate(format: "label BEGINSWITH 'Version'")).firstMatch
        XCTAssertTrue(version.waitForExistence(timeout: 5), "The about box did not open.")

        // The same app, started again: the face comes back from localStorage.
        app.terminate()
        app.launch()
        XCTAssertTrue(analogue.waitForExistence(timeout: 30))
        XCTAssertTrue(isPressed(app.webViews.switches["Digital"]), "The face did not survive a relaunch; localStorage kept nothing.")
        XCTAssertFalse(isPressed(analogue))

        // Leave the default behind for whoever runs the app next.
        choose(analogue, in: app)
    }
}
