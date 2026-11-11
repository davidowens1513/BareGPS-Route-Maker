import XCTest
final class AppUITests: XCTestCase {
    func testStandaloneLaunch() {
        let app = XCUIApplication()
        app.launch()
        XCTAssertTrue(app.webViews.firstMatch.waitForExistence(timeout: 15))
        XCTAssertFalse(app.buttons["Create New"].exists)
        XCTAssertFalse(app.buttons["Edit Existing"].exists)
    }

    func testDoubleTapDoesNotMagnifyApp() {
        let app = XCUIApplication()
        app.launch()
        let web = app.webViews.firstMatch
        XCTAssertTrue(web.waitForExistence(timeout: 15))
        let expand = web.buttons["Expand Route Card"]
        for _ in 0..<4 {
            if expand.isHittable { break }
            web.swipeUp()
        }
        XCTAssertTrue(expand.isHittable, app.debugDescription)
        let before = expand.frame
        // Tap the non-interactive heading area, not the expand button itself.
        let heading = expand.coordinate(withNormalizedOffset: CGVector(dx: 0, dy: 0.5))
            .withOffset(CGVector(dx: -100, dy: 0))
        heading.doubleTap()
        let after = expand.frame
        XCTAssertEqual(after.width, before.width, accuracy: 1, "Double tap magnified the app controls")
        XCTAssertEqual(after.minX, before.minX, accuracy: 2, "Double tap shifted the page sideways")
        XCTAssertTrue(expand.isHittable)
        let screenshot = XCTAttachment(screenshot: app.screenshot())
        screenshot.name = "Route Card after double tap"
        screenshot.lifetime = .keepAlways
        add(screenshot)
    }

    func testMapPinchStillZoomsWithoutMagnifyingApp() {
        let app = XCUIApplication()
        app.launch()
        let web = app.webViews.firstMatch
        XCTAssertTrue(web.waitForExistence(timeout: 15))
        let scale = web.staticTexts.matching(NSPredicate(format: "label MATCHES %@", "^[0-9]+(?:[.][0-9]+)? (?:m|km)$")).firstMatch
        XCTAssertTrue(scale.waitForExistence(timeout: 10), app.debugDescription)
        let before = scale.label
        let settings = web.buttons["Settings"]
        let controlWidth = settings.frame.width
        web.pinch(withScale: 1.5, velocity: 1)
        let changed = XCTNSPredicateExpectation(predicate: NSPredicate(format: "label != %@", before), object: scale)
        XCTAssertEqual(XCTWaiter.wait(for: [changed], timeout: 5), .completed, "Map scale did not change after pinching")
        XCTAssertEqual(settings.frame.width, controlWidth, accuracy: 1, "Map pinch magnified the app")
    }
}
