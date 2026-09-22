#!/usr/bin/env swift
//
// Renders the stones tumbling, for the ones that fly off the board into
// space (www/flight.js): a sprite sheet for each stone image, the stone
// turned over about the horizontal axis in `frames` equal steps through a
// half turn and seen from above. A half turn is the whole tumble: the
// stone's two faces are alike, so turned right over it looks as it did.
// Besides the real stones (their photographs, from resources/), the
// computer board's plain flat discs get a sheet of their own too: the
// same lens, but a very short cylinder rather than a real stone's thicker
// lens, and a flat colour rather than a photograph.
//
//   swift scripts/make-stone-sprites.swift
//
// Writes www/images/<stone>_tumble_160.png for each stone in resources/,
// and www/images/flat_<colour>_tumble_160.png for the computer board's
// discs, `columns` frames to a row, each frame 160px square so that the
// first, the stone flat, is the stone image at its usual size.
//
// The stone is a lens, two spherical caps meeting at a sharp rim, the
// shape of a real stone. Each face wears the photograph of the stone (or,
// for the computer board, its flat colour), so the frames match the flat
// stone. The light is the camera's own, straight along its view: a stone
// shows the same face-on brightness and rim shading whichever way it is
// turned to face the camera, so that turning the tumble to follow a
// stone's path (flight.js, `heading`) never leaves the light looking as
// if it had swung round with it — a light fixed to the world would. Needs
// nothing beyond macOS.

import AppKit
import Foundation
import ImageIO
import UniformTypeIdentifiers

let frameSize = 160
let frames = 18
let columns = 6
let supersample = 3
// A stone's thickness, as a fraction of its diameter (a size 32 stone is
// 22mm across and 8.8mm thick).
let thickness = 0.4
// The computer board's flat discs: a very short cylinder rather than a
// real stone's fuller lens.
let flatThickness = 0.12

let root = URL(fileURLWithPath: CommandLine.arguments[0]).deletingLastPathComponent().deletingLastPathComponent()
let resources = root.appendingPathComponent("resources")
let images = root.appendingPathComponent("www/images")

// MARK: - The photograph

struct Photo {
    let width: Int
    let height: Int
    let pixels: [UInt8]   // RGBA, not premultiplied
    let centreX: Double   // of the stone's disc, in px
    let centreY: Double
    let radius: Double

    init(url: URL) {
        guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
              let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
            fatalError("Could not read \(url.path)")
        }
        let width = image.width
        let height = image.height
        var data = [UInt8](repeating: 0, count: width*height*4)
        let context = CGContext(
            data: &data, width: width, height: height, bitsPerComponent: 8, bytesPerRow: width*4,
            space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
        )!
        context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
        // Core Graphics draws bottom-up: flip to image order, and undo the premultiplication.
        var pixels = [UInt8](repeating: 0, count: width*height*4)
        for y in 0..<height {
            for x in 0..<width {
                let from = ((height - 1 - y)*width + x)*4
                let to = (y*width + x)*4
                let a = Int(data[from + 3])
                for c in 0..<3 {
                    pixels[to + c] = a == 0 ? 0 : UInt8(min(255, Int(data[from + c])*255/a))
                }
                pixels[to + 3] = UInt8(a)
            }
        }
        self.init(width: width, height: height, pixels: pixels)
    }

    // A synthetic photograph: a plain disc of `fill`, with the thin dark
    // rim the computer board's flat stones wear (stone-dom.js's
    // flatStoneSrc) — nothing to read from disk, so its very short
    // cylinder can have a tumble sheet of its own too.
    init(flatDisc fill: (UInt8, UInt8, UInt8), size: Int = 160) {
        let radius = Double(size)*77/160
        let rim = Double(size)*3/160
        var pixels = [UInt8](repeating: 0, count: size*size*4)
        for y in 0..<size {
            for x in 0..<size {
                let d = Foundation.hypot(Double(x) + 0.5 - Double(size)/2, Double(y) + 0.5 - Double(size)/2)
                guard d <= radius + rim/2 else { continue }
                let at = (y*size + x)*4
                let rgb = d <= radius - rim/2 ? fill : (0, 0, 0)
                (pixels[at], pixels[at + 1], pixels[at + 2], pixels[at + 3]) = (rgb.0, rgb.1, rgb.2, 255)
            }
        }
        self.init(width: size, height: size, pixels: pixels)
    }

    // Shared by both: the pixels as read or synthesized, and the disc
    // read off the bounds of their opaque pixels.
    private init(width: Int, height: Int, pixels: [UInt8]) {
        self.width = width
        self.height = height
        self.pixels = pixels
        var minX = width, maxX = -1, minY = height, maxY = -1
        for y in 0..<height {
            for x in 0..<width where pixels[(y*width + x)*4 + 3] > 128 {
                minX = min(minX, x); maxX = max(maxX, x)
                minY = min(minY, y); maxY = max(maxY, y)
            }
        }
        centreX = Double(minX + maxX + 1)/2
        centreY = Double(minY + maxY + 1)/2
        radius = Double(max(maxX - minX, maxY - minY) + 1)/2
    }

    /// The colour at (x, y) px, bilinearly.
    func sample(_ x: Double, _ y: Double) -> (Double, Double, Double) {
        let x0 = max(0, min(width - 2, Int(floor(x)))), y0 = max(0, min(height - 2, Int(floor(y))))
        let fx = max(0, min(1, x - Double(x0))), fy = max(0, min(1, y - Double(y0)))
        func at(_ px: Int, _ py: Int, _ c: Int) -> Double { Double(pixels[(py*width + px)*4 + c]) }
        var out = [0.0, 0.0, 0.0]
        for c in 0..<3 {
            let top = at(x0, y0, c)*(1 - fx) + at(x0 + 1, y0, c)*fx
            let bottom = at(x0, y0 + 1, c)*(1 - fx) + at(x0 + 1, y0 + 1, c)*fx
            out[c] = top*(1 - fy) + bottom*fy
        }
        return (out[0], out[1], out[2])
    }
}

// MARK: - The lens

struct Vec {
    var x, y, z: Double
    static func + (a: Vec, b: Vec) -> Vec { Vec(x: a.x + b.x, y: a.y + b.y, z: a.z + b.z) }
    static func - (a: Vec, b: Vec) -> Vec { Vec(x: a.x - b.x, y: a.y - b.y, z: a.z - b.z) }
    static func * (a: Vec, s: Double) -> Vec { Vec(x: a.x*s, y: a.y*s, z: a.z*s) }
    func dot(_ b: Vec) -> Double { x*b.x + y*b.y + z*b.z }
    var length: Double { sqrt(dot(self)) }
    var unit: Vec { self*(1/length) }
    /// Turned about the x axis (screen space: x right, y down, z towards the eye).
    func aboutX(_ angle: Double) -> Vec {
        let c = cos(angle), s = sin(angle)
        return Vec(x: x, y: y*c - z*s, z: y*s + z*c)
    }
}

// The light, fixed to the camera rather than to the stone: it looks
// straight along the view, so spinning the stone about that same axis
// (as flight.js does in CSS, turning each frame to follow the stone's own
// path) never turns the light with it. A light fixed in the photograph's
// own frame instead would, and visibly swing round as a stone flew off in
// a different direction each time — wrong for something meant to read as
// a fixed light in the room.
let light = Vec(x: 0, y: 0, z: 1)
let halfway = light

/// How lit a surface facing `normal` is: some ambient, the diffuse, and a highlight.
func shade(_ normal: Vec) -> Double {
    let diffuse = max(0, normal.dot(light))
    let highlight = pow(max(0, normal.dot(halfway)), 40)
    return 0.35 + 0.65*diffuse + 0.12*highlight
}

/// Where a ray from `origin` along unit `direction` is inside the sphere: the two distances, or nil.
func sphereSpan(origin: Vec, direction: Vec, centre: Vec, radius: Double) -> (Double, Double)? {
    let oc = origin - centre
    let b = oc.dot(direction)
    let c = oc.dot(oc) - radius*radius
    let discriminant = b*b - c
    if discriminant < 0 { return nil }
    let root = sqrt(discriminant)
    return (-b - root, -b + root)
}

struct Lens {
    let radius: Double        // of the rim, in frame px
    let sphereRadius: Double  // of each cap's sphere
    let offset: Double        // each sphere's centre, this far from the middle

    init(radius: Double, thickness: Double = thickness) {
        self.radius = radius
        let half = radius*thickness   // half the thickness: thickness*diameter/2
        sphereRadius = (radius*radius + half*half)/(2*half)
        offset = sphereRadius - half
    }

    /// The stone turned `angle` about the x axis, seen from above at (x, y) px from its centre:
    /// the point struck on the stone, in the stone's own frame, whether on the top face, and the
    /// surface normal as seen; or nil for a miss.
    func hit(x: Double, y: Double, angle: Double) -> (point: Vec, top: Bool, normal: Vec)? {
        // The ray, in the stone's frame.
        let origin = Vec(x: x, y: y, z: sphereRadius*4).aboutX(-angle)
        let direction = Vec(x: 0, y: 0, z: -1).aboutX(-angle)
        let topCentre = Vec(x: 0, y: 0, z: -offset)      // the sphere whose cap is the top face
        let bottomCentre = Vec(x: 0, y: 0, z: offset)
        guard let a = sphereSpan(origin: origin, direction: direction, centre: topCentre, radius: sphereRadius),
              let b = sphereSpan(origin: origin, direction: direction, centre: bottomCentre, radius: sphereRadius) else {
            return nil
        }
        let entry = max(a.0, b.0)
        let exit = min(a.1, b.1)
        if entry >= exit { return nil }
        let top = a.0 >= b.0
        let point = origin + direction*entry
        let normal = ((point - (top ? topCentre : bottomCentre))*(1/sphereRadius)).aboutX(angle)
        return (point, top, normal)
    }

    /// The normal of the top face at (x, y) on the flat stone: how the photograph was lit there.
    func flatNormal(x: Double, y: Double) -> Vec {
        let z = sqrt(max(0, sphereRadius*sphereRadius - x*x - y*y))
        return Vec(x: x, y: y, z: z).unit
    }
}

// MARK: - The sheet

func renderSheet(photo: Photo, thickness: Double = thickness) -> CGImage {
    let scale = Double(frameSize)/Double(max(photo.width, photo.height))
    let lens = Lens(radius: photo.radius*scale, thickness: thickness)
    // Where the disc's centre lands in the frame: the photograph scaled to fit, as the app draws it.
    let frameCentreX = photo.centreX*scale
    let frameCentreY = photo.centreY*scale
    let rows = (frames + columns - 1)/columns
    let sheetWidth = columns*frameSize
    let sheetHeight = rows*frameSize
    var sheet = [UInt8](repeating: 0, count: sheetWidth*sheetHeight*4)   // premultiplied RGBA

    let samples = Double(supersample*supersample)
    for frame in 0..<frames {
        let angle = Double(frame)*Double.pi/Double(frames)
        let originX = (frame % columns)*frameSize
        let originY = (frame/columns)*frameSize
        for py in 0..<frameSize {
            for px in 0..<frameSize {
                var r = 0.0, g = 0.0, b = 0.0, coverage = 0.0
                for sy in 0..<supersample {
                    for sx in 0..<supersample {
                        let x = Double(px) + (Double(sx) + 0.5)/Double(supersample) - frameCentreX
                        let y = Double(py) + (Double(sy) + 0.5)/Double(supersample) - frameCentreY
                        guard let hit = lens.hit(x: x, y: y, angle: angle) else { continue }
                        // The photograph, at this point of the face; just inside its edge, where it
                        // is still opaque. The bottom face wears it mirrored, so that its light
                        // falls the same way once the stone is over.
                        var tx = hit.point.x, ty = hit.top ? hit.point.y : -hit.point.y
                        let reach = sqrt(tx*tx + ty*ty)
                        if reach > lens.radius*0.985 {
                            tx *= lens.radius*0.985/reach
                            ty *= lens.radius*0.985/reach
                        }
                        let (pr, pg, pb) = photo.sample(photo.centreX + tx/scale, photo.centreY + ty/scale)
                        // Lit as it is now, relative to how the photograph was lit here: darkened
                        // freely as it turns from the light, but brightened only a little, or
                        // the pale stones burn out.
                        let relit = min(1.12, shade(hit.normal)/shade(lens.flatNormal(x: tx, y: ty)))
                        r += min(255, pr*relit)
                        g += min(255, pg*relit)
                        b += min(255, pb*relit)
                        coverage += 1
                    }
                }
                let at = ((originY + py)*sheetWidth + originX + px)*4
                sheet[at] = UInt8(r/samples)
                sheet[at + 1] = UInt8(g/samples)
                sheet[at + 2] = UInt8(b/samples)
                sheet[at + 3] = UInt8(coverage/samples*255)
            }
        }
    }

    let data = CFDataCreate(nil, sheet, sheet.count)!
    let provider = CGDataProvider(data: data)!
    return CGImage(
        width: sheetWidth, height: sheetHeight, bitsPerComponent: 8, bitsPerPixel: 32, bytesPerRow: sheetWidth*4,
        space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.premultipliedLast.rawValue),
        provider: provider, decode: nil, shouldInterpolate: true, intent: .defaultIntent
    )!
}

func write(_ image: CGImage, to url: URL) {
    guard let destination = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil) else {
        fatalError("Could not write \(url.path)")
    }
    CGImageDestinationAddImage(destination, image, nil)
    CGImageDestinationFinalize(destination)
    print("Wrote \(url.lastPathComponent)")
}

for name in ["black_stone1", "white_stone0", "white_stone1", "white_stone2", "white_stone3"] {
    let photo = Photo(url: resources.appendingPathComponent("\(name)_large.png"))
    write(renderSheet(photo: photo), to: images.appendingPathComponent("\(name)_tumble_\(frameSize).png"))
}

for (name, fill) in [("flat_white", (255, 255, 255)), ("flat_black", (0, 0, 0))] as [(String, (UInt8, UInt8, UInt8))] {
    let photo = Photo(flatDisc: fill)
    write(renderSheet(photo: photo, thickness: flatThickness), to: images.appendingPathComponent("\(name)_tumble_\(frameSize).png"))
}
