import AVFoundation
import Foundation

struct AdhanSoundJob {
  let inputName: String
  let outputName: String
}

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let audioDirectory = root.appendingPathComponent("assets/audio/adhan", isDirectory: true)
let maxDurationSeconds = 29.5
let jobs: [AdhanSoundJob] = [
  .init(inputName: "abdul_basit_adhan.mp3", outputName: "abdul_basit_adhan_ios.caf"),
  .init(inputName: "haram_makki_adhan.mp3", outputName: "haram_makki_adhan_ios.caf"),
  .init(inputName: "haram_nabawi_adhan.mp3", outputName: "haram_nabawi_adhan_ios.caf"),
]

func renderShortNotificationSound(job: AdhanSoundJob) throws {
  let inputURL = audioDirectory.appendingPathComponent(job.inputName)
  let outputURL = audioDirectory.appendingPathComponent(job.outputName)

  let inputFile = try AVAudioFile(forReading: inputURL)
  let inputFormat = inputFile.processingFormat
  let maxFrames = AVAudioFrameCount(
    min(Double(inputFile.length), inputFormat.sampleRate * maxDurationSeconds).rounded(.down)
  )

  guard let buffer = AVAudioPCMBuffer(pcmFormat: inputFormat, frameCapacity: maxFrames) else {
    throw NSError(domain: "build-ios-adhan-sounds", code: 1, userInfo: [
      NSLocalizedDescriptionKey: "Unable to allocate audio buffer for \(job.inputName)",
    ])
  }

  try inputFile.read(into: buffer, frameCount: maxFrames)
  try? FileManager.default.removeItem(at: outputURL)

  let outputSettings: [String: Any] = [
    AVFormatIDKey: kAudioFormatLinearPCM,
    AVSampleRateKey: inputFormat.sampleRate,
    AVNumberOfChannelsKey: Int(inputFormat.channelCount),
    AVLinearPCMBitDepthKey: 32,
    AVLinearPCMIsFloatKey: true,
    AVLinearPCMIsBigEndianKey: false,
    AVLinearPCMIsNonInterleaved: !inputFormat.isInterleaved,
  ]

  let outputFile = try AVAudioFile(
    forWriting: outputURL,
    settings: outputSettings,
    commonFormat: .pcmFormatFloat32,
    interleaved: inputFormat.isInterleaved
  )
  try outputFile.write(from: buffer)

  print("Built \(job.outputName) (\(String(format: "%.1f", maxDurationSeconds))s max)")
}

do {
  for job in jobs {
    try renderShortNotificationSound(job: job)
  }
} catch {
  fputs("Failed to build iOS notification sounds: \(error)\n", stderr)
  exit(1)
}
