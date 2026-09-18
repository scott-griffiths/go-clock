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
 *switch*. The settings button drops down a chip per setting; a chip opens
 its choices beneath it and hides them again once one is chosen. The chip's
 name is the setting's name followed by its current value ("Board Oak"),
 which is what a choice is checked against. The chip's value is written by
 my-clock.js rather than in index.html, so its presence is the module
 having run.
 */
final class GoClockUITests: XCTestCase {

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    /// The page's controls fade after a few seconds; a tap on the board brings them back.
    private func wakeControls(in app: XCUIApplication) {
        app.webViews.firstMatch.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
    }

    /// The chip for a setting, whatever value it currently shows.
    private func chip(_ setting: String, in app: XCUIApplication) -> XCUIElement {
        app.webViews.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", setting)).firstMatch
    }

    /// Drops the settings down (waking the controls first) so the chips are on screen.
    private func openSettings(in app: XCUIApplication) {
        wakeControls(in: app)
        let settings = app.webViews.buttons["Settings"]
        XCTAssertTrue(settings.waitForExistence(timeout: 5))
        settings.tap()
    }

    /// Opens a setting's choices, taps one, and waits for the chip to show it.
    private func choose(_ value: String, of setting: String, in app: XCUIApplication) {
        openSettings(in: app)
        let summary = chip(setting, in: app)
        XCTAssertTrue(summary.waitForExistence(timeout: 5))
        summary.tap()
        let choice = app.webViews.switches[value]
        XCTAssertTrue(choice.waitForExistence(timeout: 5), "The \(setting) chip did not open its choices.")
        choice.tap()
        let shown = expectation(for: NSPredicate(format: "label == %@", "\(setting) \(value)"), evaluatedWith: summary)
        wait(for: [shown], timeout: 5)
    }

    func testPageLoadsAndABoardChoiceSurvivesARelaunch() throws {
        let app = XCUIApplication()
        app.launch()

        let board = "Board"
        XCTAssertTrue(app.webViews.buttons["Settings"].waitForExistence(timeout: 30), "The toolbar never appeared.")
        openSettings(in: app)
        let boardChip = chip(board, in: app)
        XCTAssertTrue(boardChip.waitForExistence(timeout: 5), "The board chip never appeared; the page's module did not run.")

        // A known board first — the simulator keeps whatever the last run left —
        // and then a different one, so a relaunch has a change to remember.
        choose("Oak", of: board, in: app)
        choose("Kaya", of: board, in: app)

        // The about box, which is where the shell's version lands.
        wakeControls(in: app)
        let about = app.webViews.buttons["About"]
        XCTAssertTrue(about.waitForExistence(timeout: 5))
        about.tap()
        let version = app.webViews.staticTexts.matching(NSPredicate(format: "label BEGINSWITH 'Version'")).firstMatch
        XCTAssertTrue(version.waitForExistence(timeout: 5), "The about box did not open.")

        // The same app, started again: the board comes back from localStorage.
        app.terminate()
        app.launch()
        XCTAssertTrue(app.webViews.buttons["Settings"].waitForExistence(timeout: 30))
        openSettings(in: app)
        XCTAssertTrue(boardChip.waitForExistence(timeout: 5))
        XCTAssertEqual(boardChip.label, "Board Kaya", "The board did not survive a relaunch; localStorage kept nothing.")

        // Leave the default behind for whoever runs the app next.
        choose("Oak", of: board, in: app)
    }
}
