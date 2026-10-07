// Removes the background from character art using Apple's Vision subject mask.
// Usage: swift tools/cutout.swift <input.png> <output.png> [scale]
import Foundation
import Vision
import CoreImage
import AppKit

let args = CommandLine.arguments
guard args.count >= 3 else { print("usage: cutout <in> <out> [scale]"); exit(1) }
let scale = args.count > 3 ? Double(args[3]) ?? 3 : 3

guard var input = CIImage(contentsOf: URL(fileURLWithPath: args[1])) else { print("cannot read \(args[1])"); exit(1) }
// Upscale first: Vision finds cleaner edges on larger images.
input = input.applyingFilter("CILanczosScaleTransform", parameters: [kCIInputScaleKey: scale, kCIInputAspectRatioKey: 1.0])

let request = VNGenerateForegroundInstanceMaskRequest()
let handler = VNImageRequestHandler(ciImage: input)
try handler.perform([request])
guard let result = request.results?.first else { print("no subject found"); exit(2) }

let buffer = try result.generateMaskedImage(ofInstances: result.allInstances, from: handler, croppedToInstancesExtent: true)
let out = CIImage(cvPixelBuffer: buffer)
let ctx = CIContext()
let cs = CGColorSpace(name: CGColorSpace.sRGB)!
try ctx.writePNGRepresentation(of: out, to: URL(fileURLWithPath: args[2]), format: .RGBA8, colorSpace: cs)
print("ok \(args[2])")
