#!/usr/bin/env swift
//
// Renders the app icon: the analogue face at ten past ten, on the board.
//
//   swift scripts/make-icon.swift
//
// Writes the 1024px App Store icon into the Xcode asset catalog, and the
// 512/192px web-manifest icons and 180px apple-touch-icon into www/images,
// so the app, the home-screen bookmark and the PWA all wear the same face.
//
// The stone layout is the app's own (`update()` for view 0 in
// www/go-clock.js), ported here rather than run there because go-clock.js
// creates `Image`s at import time and needs a browser. The stones come from
// resources/, which holds them at 300px+, rather than www/images, where they
// are 77px and would blur at this size.
//
// Needs nothing beyond macOS: it draws with AppKit and runs under the Swift
// interpreter Xcode installs.

import AppKit
import Foundation
import ImageIO
import UniformTypeIdentifiers

// MARK: - The board model, as far as an icon needs it

let gridsize = 19
let minx = 0.026, maxx = 0.974, miny = 0.03, maxy = 0.972   // grid edges, as fractions of the board image
let white = 1, black = 3

/// Bresenham, as `line()` in go-clock.js: the integer points from (x0, y0) to (x1, y1).
func line(_ x0In: Int, _ x1In: Int, _ y0In: Int, _ y1In: Int) -> [(Int, Int)] {
    var (x0, x1, y0, y1) = (x0In, x1In, y0In, y1In)
    let deltax = x1 - x0, deltay = y1 - y0
    if deltax == 0 && deltay == 0 { return [(x0, y0)] }
    var points: [(Int, Int)] = []
    var error = 0.0
    if abs(deltax) >= abs(deltay) {
        if x1 < x0 { swap(&x0, &x1); swap(&y0, &y1) }
        let ydir = y0 < y1 ? 1 : -1
        let deltaerr = abs(Double(deltay) / Double(deltax))
        var y = y0
        for x in x0...x1 {
            points.append((x, y))
            error += deltaerr
            if error >= 0.5 { y += ydir; error -= 1 }
        }
    } else {
        if y1 < y0 { swap(&y0, &y1); swap(&x0, &x1) }
        let xdir = x0 < x1 ? 1 : -1
        let deltaerr = abs(Double(deltax) / Double(deltay))
        var x = x0
        for y in y0...y1 {
            points.append((x, y))
            error += deltaerr
            if error >= 0.5 { x += xdir; error -= 1 }
        }
    }
    return points
}

/// JavaScript's Math.round: halves go up, which for the positive numbers here is `rounded()` too.
func jsRound(_ value: Double) -> Int { Int(value.rounded()) }

/// The analogue face: twelve hour markers, a white minute hand and a black hour hand.
func analogueStones(hours: Int, minutes: Int) -> [Int] {
    var stones = [Int](repeating: 0, count: gridsize * gridsize)
    func add(_ x: Int, _ y: Int, _ colour: Int) { stones[y * gridsize + x] = colour }

    for (x, y) in [(9, 1), (13, 2), (16, 5), (17, 9), (16, 13), (13, 16), (9, 17), (5, 16), (2, 13), (1, 9), (2, 5), (5, 2)] {
        add(x, y, black)
    }

    var theta = 2 * Double.pi * Double(60 * minutes) / 3600
    var R = 7.0
    for (x, y) in line(9, jsRound(9 + R * sin(theta)), 9, jsRound(9 - R * cos(theta))) { add(x, y, white) }

    let hourHand = Double((hours % 12) * 5) + Double(minutes) / 12
    theta = 2 * Double.pi * hourHand / 60
    R = 4.5
    for (x, y) in line(9, jsRound(9 + R * sin(theta)), 9, jsRound(9 - R * cos(theta))) { add(x, y, black) }

    return stones
}

// MARK: - Drawing

let root = URL(fileURLWithPath: CommandLine.arguments[0]).deletingLastPathComponent().deletingLastPathComponent()
let resources = root.appendingPathComponent("resources")
let images = root.appendingPathComponent("www/images")
let iconset = root.appendingPathComponent("ios/GoClock/Assets.xcassets/AppIcon.appiconset")

func load(_ name: String, from folder: URL) -> NSImage {
    guard let image = NSImage(contentsOf: folder.appendingPathComponent(name)) else {
        fatalError("Could not read \(folder.appendingPathComponent(name).path)")
    }
    return image
}

let board = load("goban_1200.jpg", from: images)
let blackStone = load("black_stone1_large.png", from: resources)
let whiteStones = (0...3).map { load("white_stone\($0)_large.png", from: resources) }

/// The icon at `size` pixels square, drawn from scratch (not scaled from a larger render, so the
/// stones and their shadows stay crisp at every size).
func render(size: Int) -> CGImage {
    // The App Store icon may not have an alpha channel. RGBX is the opaque layout Core Graphics
    // will draw into, and ImageIO writes it out as a plain 24-bit PNG.
    let cg = CGContext(
        data: nil, width: size, height: size, bitsPerComponent: 8, bytesPerRow: 0,
        space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
    )!
    cg.interpolationQuality = .high

    NSGraphicsContext.saveGraphicsState()
    let context = NSGraphicsContext(cgContext: cg, flipped: false)
    NSGraphicsContext.current = context
    context.imageInterpolation = .high

    // The board fills the width; the image is a little taller than wide, so a sliver of the top
    // and bottom border is cropped away. Everything the app puts on the grid stays in frame.
    let w = Double(size)
    let h = w * board.size.height / board.size.width
    let yOffset = (w - h) / 2                     // negative: the crop, in the app's top-left coordinates
    board.draw(in: NSRect(x: 0, y: w - yOffset - h, width: w, height: h),
               from: .zero, operation: .copy, fraction: 1, respectFlipped: false, hints: nil)

    // Stone positions exactly as `stonePosition()` computes them, with y flipped for AppKit.
    let diameter = (w / 20).rounded(.down)
    let shadow = NSShadow()
    shadow.shadowColor = NSColor.black.withAlphaComponent(0.55)
    shadow.shadowOffset = NSSize(width: diameter * 0.05, height: -diameter * 0.07)
    shadow.shadowBlurRadius = diameter * 0.09

    var whiteIndex = 0
    for (index, colour) in analogueStones(hours: 10, minutes: 10).enumerated() where colour != 0 {
        let x = Double(index % gridsize), y = Double(index / gridsize)
        let xpos = minx * w + x * (maxx - minx) * w / Double(gridsize - 1)
        let ypos = miny * h + y * (maxy - miny) * h / Double(gridsize - 1) + yOffset
        let rect = NSRect(x: xpos - diameter / 2, y: w - (ypos + diameter / 2), width: diameter, height: diameter)

        // The app mixes its white stones half-and-half between the plain one and three
        // variants; a fixed rotation gives the same look without a random icon every run.
        let image: NSImage
        if colour == white {
            image = whiteStones[[0, 1, 0, 2, 0, 3][whiteIndex % 6]]
            whiteIndex += 1
        } else {
            image = blackStone
        }
        cg.saveGState()
        shadow.set()
        image.draw(in: rect, from: .zero, operation: .sourceOver, fraction: 1, respectFlipped: false, hints: nil)
        cg.restoreGState()
    }

    NSGraphicsContext.restoreGraphicsState()
    return cg.makeImage()!
}

func write(_ image: CGImage, to url: URL) {
    try! FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
    let destination = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil)!
    CGImageDestinationAddImage(destination, image, nil)
    guard CGImageDestinationFinalize(destination) else { fatalError("Could not write \(url.path)") }
    print("wrote \(url.path) (\(image.width)×\(image.height))")
}

write(render(size: 1024), to: iconset.appendingPathComponent("icon.png"))
write(render(size: 512), to: images.appendingPathComponent("icon-512.png"))
write(render(size: 192), to: images.appendingPathComponent("icon-192.png"))
write(render(size: 180), to: images.appendingPathComponent("touch-icon.png"))
