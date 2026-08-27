// Draws the BarSnip app icon (a white scissors glyph on a blue rounded square)
// and writes it as a 1024×1024 PNG. Run by build.sh; failure is non-fatal —
// the app just ships without a Finder icon.
//
//   swift Scripts/makeicon.swift <output.png>

import AppKit

let arguments = CommandLine.arguments
guard arguments.count == 2 else {
    FileHandle.standardError.write(Data("usage: swift makeicon.swift <output.png>\n".utf8))
    exit(1)
}
let outputURL = URL(fileURLWithPath: arguments[1])

let canvas: CGFloat = 1024
guard let rep = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: Int(canvas), pixelsHigh: Int(canvas),
    bitsPerSample: 8, samplesPerPixel: 4,
    hasAlpha: true, isPlanar: false,
    colorSpaceName: .deviceRGB,
    bytesPerRow: 0, bitsPerPixel: 0
), let context = NSGraphicsContext(bitmapImageRep: rep) else {
    FileHandle.standardError.write(Data("makeicon: couldn't create bitmap context\n".utf8))
    exit(1)
}

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = context

// Rounded square on the standard macOS icon grid (824pt content on 1024pt canvas).
let iconRect = NSRect(x: 100, y: 100, width: 824, height: 824)
let squircle = NSBezierPath(roundedRect: iconRect, xRadius: 186, yRadius: 186)
let top = NSColor(calibratedRed: 0.36, green: 0.64, blue: 1.00, alpha: 1)
let bottom = NSColor(calibratedRed: 0.04, green: 0.32, blue: 0.86, alpha: 1)
NSGradient(starting: top, ending: bottom)?.draw(in: squircle, angle: -90)

var drewSymbol = false
if let scissors = NSImage(systemSymbolName: "scissors", accessibilityDescription: nil)?
    .withSymbolConfiguration(NSImage.SymbolConfiguration(pointSize: 430, weight: .medium)) {
    let tinted = NSImage(size: scissors.size, flipped: false) { rect in
        scissors.draw(in: rect)
        NSColor.white.set()
        rect.fill(using: .sourceAtop)
        return true
    }
    let size = tinted.size
    if size.width > 0 && size.height > 0 {
        let scale = min(500 / size.width, 500 / size.height)
        let w = size.width * scale
        let h = size.height * scale
        tinted.draw(
            in: NSRect(x: (canvas - w) / 2, y: (canvas - h) / 2, width: w, height: h),
            from: .zero, operation: .sourceOver, fraction: 1.0
        )
        drewSymbol = true
    }
}

if !drewSymbol {
    // Fallback if the SF Symbol is somehow unavailable: plain text scissors.
    let glyph = NSAttributedString(string: "✂", attributes: [
        .font: NSFont.systemFont(ofSize: 480, weight: .medium),
        .foregroundColor: NSColor.white,
    ])
    let size = glyph.size()
    glyph.draw(at: NSPoint(x: (canvas - size.width) / 2, y: (canvas - size.height) / 2))
}

NSGraphicsContext.restoreGraphicsState()

guard let png = rep.representation(using: .png, properties: [:]) else {
    FileHandle.standardError.write(Data("makeicon: couldn't encode PNG\n".utf8))
    exit(1)
}
do {
    try png.write(to: outputURL)
} catch {
    FileHandle.standardError.write(Data("makeicon: couldn't write PNG: \(error)\n".utf8))
    exit(1)
}
