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
 *switch*. Each setting is a chip that opens its choices beneath it and hides
 them again once one is chosen; the chip's name is the setting's name followed
 by its current value ("Clock face Analogue"), which is what a choice is
 checked against. The chip's value is written by my-clock.js rather than in
 index.html, so its presence is the module having run.
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

    /// Opens a setting's choices (waking the controls first), taps one, and waits for the chip to show it.
    private func choose(_ value: String, of setting: String, in app: XCUIApplication) {
        wakeControls(in: app)
        let summary = chip(setting, in: app)
        XCTAssertTrue(summary.waitForExistence(timeout: 5))
        summary.tap()
        let choice = app.webViews.switches[value]
        XCTAssertTrue(choice.waitForExistence(timeout: 5), "The \(setting) chip did not open its choices.")
        choice.tap()
        let shown = expectation(for: NSPredicate(format: "label == %@", "\(setting) \(value)"), evaluatedWith: summary)
        wait(for: [shown], timeout: 5)
    }

    func testPageLoadsAndAFaceChoiceSurvivesARelaunch() throws {
        let app = XCUIApplication()
        app.launch()

        let face = "Clock face"
        let faceChip = chip(face, in: app)
        XCTAssertTrue(faceChip.waitForExistence(timeout: 30), "The face chip never appeared; the page's module did not run.")

        // A known face first — the simulator keeps whatever the last run left —
        // and then a different one, so a relaunch has a change to remember.
        choose("Analogue", of: face, in: app)
        choose("Digital", of: face, in: app)

        // The about box, which is where the shell's version lands.
        wakeControls(in: app)
        let about = app.webViews.buttons["About"]
        XCTAssertTrue(about.waitForExistence(timeout: 5))
        about.tap()
        let version = app.webViews.staticTexts.matching(NSPredicate(format: "label BEGINSWITH 'Version'")).firstMatch
        XCTAssertTrue(version.waitForExistence(timeout: 5), "The about box did not open.")

        // The same app, started again: the face comes back from localStorage.
        app.terminate()
        app.launch()
        XCTAssertTrue(faceChip.waitForExistence(timeout: 30))
        XCTAssertEqual(faceChip.label, "Clock face Digital", "The face did not survive a relaunch; localStorage kept nothing.")

        // Leave the default behind for whoever runs the app next.
        choose("Analogue", of: face, in: app)
    }
}
