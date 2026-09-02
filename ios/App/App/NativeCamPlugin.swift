import Foundation
import Capacitor
import AVFoundation
import UIKit

/// Native Kamera hinter der WebView: Apples Kamera-Stack liefert, was
/// getUserMedia nicht kann - Bildstabilisierung (cinematic), Hardware-
/// Encoding in voller Geraetequalitaet und sauberen Ton. Die Web-UI
/// (Ausloeser, Modi, Gesten) bleibt unveraendert und steuert das Plugin.
///
/// Pause/Weiter ohne Qualitaetsverlust: jede Teilaufnahme ist eine eigene
/// Datei, beim Stopp werden alle Segmente verlustfrei (Passthrough, kein
/// Re-Encode) zu einem MP4 zusammengefuegt.
@objc(NativeCamPlugin)
public class NativeCamPlugin: CAPPlugin, CAPBridgedPlugin, AVCaptureFileOutputRecordingDelegate, AVCapturePhotoCaptureDelegate {
    public let identifier = "NativeCamPlugin"
    public let jsName = "NativeCam"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "flip", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setZoom", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "focus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setExposure", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "capturePhoto", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startRecord", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pauseRecord", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "resumeRecord", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopRecord", returnType: CAPPluginReturnPromise),
    ]

    private let session = AVCaptureSession()
    private let sessionQueue = DispatchQueue(label: "io.pistazz.nativecam")
    private var previewLayer: AVCaptureVideoPreviewLayer?
    private var previewView: UIView?
    private var videoInput: AVCaptureDeviceInput?
    private var movieOutput = AVCaptureMovieFileOutput()
    private var photoOutput = AVCapturePhotoOutput()
    private var position: AVCaptureDevice.Position = .back

    // Segment-Aufnahme (Pause = Segment-Ende, Weiter = neues Segment)
    private var segments: [URL] = []
    private var segmentDone: ((Bool) -> Void)?
    private var photoCall: CAPPluginCall?
    private var stopCall: CAPPluginCall?

    // ── Lifecycle ──────────────────────────────────────────────────────────
    @objc func start(_ call: CAPPluginCall) {
        let x = call.getDouble("x") ?? 0
        let y = call.getDouble("y") ?? 0
        let w = call.getDouble("width") ?? 390
        let h = call.getDouble("height") ?? 693
        let radius = call.getDouble("radius") ?? 0
        position = (call.getString("position") == "front") ? .front : .back

        AVCaptureDevice.requestAccess(for: .video) { [weak self] videoGranted in
            guard videoGranted else { call.reject("camera-denied"); return }
            AVCaptureDevice.requestAccess(for: .audio) { _ in
                self?.startConfigured(call, x: x, y: y, w: w, h: h, radius: radius)
            }
        }
    }

    private func startConfigured(_ call: CAPPluginCall, x: Double, y: Double, w: Double, h: Double, radius: Double) {
        sessionQueue.async { [weak self] in
            guard let self = self else { return }
            self.configureSession()
            self.session.startRunning()
            DispatchQueue.main.async {
                guard let webView = self.webView, let superview = webView.superview else {
                    call.reject("WebView fehlt"); return
                }
                // WebView durchsichtig machen, Kamera liegt DARUNTER
                webView.isOpaque = false
                webView.backgroundColor = .clear
                webView.scrollView.backgroundColor = .clear

                let v = self.previewView ?? UIView()
                v.frame = CGRect(x: x, y: y, width: w, height: h)
                v.backgroundColor = .black
                v.layer.cornerRadius = radius
                v.layer.masksToBounds = true
                if v.superview == nil { superview.insertSubview(v, belowSubview: webView) }
                self.previewView = v

                let layer = self.previewLayer ?? AVCaptureVideoPreviewLayer(session: self.session)
                layer.videoGravity = .resizeAspectFill
                layer.frame = v.bounds
                if layer.superlayer == nil { v.layer.addSublayer(layer) }
                self.previewLayer = layer
                call.resolve(["ok": true])
            }
        }
    }

    private func configureSession() {
        session.beginConfiguration()
        session.sessionPreset = .hd1920x1080
        // Alte Inputs/Outputs raus (Flip/Restart)
        session.inputs.forEach { session.removeInput($0) }
        session.outputs.forEach { session.removeOutput($0) }

        guard let cam = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: position),
              let vIn = try? AVCaptureDeviceInput(device: cam) else {
            session.commitConfiguration(); return
        }
        if session.canAddInput(vIn) { session.addInput(vIn); videoInput = vIn }
        // Framerate fest auf 30fps: bei wenig Licht senkt iOS sonst
        // automatisch auf 24fps oder weniger - das Video wirkt dann zaeh
        do {
            try cam.lockForConfiguration()
            cam.activeVideoMinFrameDuration = CMTime(value: 1, timescale: 30)
            cam.activeVideoMaxFrameDuration = CMTime(value: 1, timescale: 30)
            cam.unlockForConfiguration()
        } catch {}
        if let mic = AVCaptureDevice.default(for: .audio), let aIn = try? AVCaptureDeviceInput(device: mic),
           session.canAddInput(aIn) { session.addInput(aIn) }

        movieOutput = AVCaptureMovieFileOutput()
        if session.canAddOutput(movieOutput) {
            session.addOutput(movieOutput)
            if let conn = movieOutput.connection(with: .video) {
                conn.videoOrientation = .portrait
                if conn.isVideoMirroringSupported { conn.isVideoMirrored = (position == .front) }
                // DER Grund fuer das Plugin: Apples Bildstabilisierung
                if conn.isVideoStabilizationSupported { conn.preferredVideoStabilizationMode = .cinematic }
            }
        }
        photoOutput = AVCapturePhotoOutput()
        if session.canAddOutput(photoOutput) {
            session.addOutput(photoOutput)
            photoOutput.connection(with: .video)?.videoOrientation = .portrait
            if let c = photoOutput.connection(with: .video), c.isVideoMirroringSupported {
                c.isVideoMirrored = (position == .front)
            }
        }
        session.commitConfiguration()
    }

    @objc func stop(_ call: CAPPluginCall) {
        sessionQueue.async { [weak self] in
            self?.session.stopRunning()
            DispatchQueue.main.async {
                self?.previewView?.removeFromSuperview()
                self?.previewView = nil
                self?.previewLayer = nil
                self?.segments.removeAll()
                // WebView wieder deckend machen - sonst schimmern nach der
                // Kamera an unbemalten Stellen Systemflaechen durch
                self?.webView?.isOpaque = true
                self?.webView?.backgroundColor = .white
                call.resolve(["ok": true])
            }
        }
    }

    @objc func flip(_ call: CAPPluginCall) {
        position = (position == .back) ? .front : .back
        sessionQueue.async { [weak self] in
            self?.configureSession()
            call.resolve(["position": self?.position == .front ? "front" : "back"])
        }
    }

    // ── Steuerung ──────────────────────────────────────────────────────────
    @objc func setZoom(_ call: CAPPluginCall) {
        let z = CGFloat(call.getDouble("zoom") ?? 1)
        sessionQueue.async { [weak self] in
            guard let dev = self?.videoInput?.device else { call.resolve(); return }
            do {
                try dev.lockForConfiguration()
                dev.videoZoomFactor = max(1, min(dev.activeFormat.videoMaxZoomFactor, z))
                dev.unlockForConfiguration()
            } catch {}
            call.resolve()
        }
    }

    @objc func focus(_ call: CAPPluginCall) {
        // x/y normalisiert (0-1) im Vorschau-Layer
        let nx = call.getDouble("x") ?? 0.5
        let ny = call.getDouble("y") ?? 0.5
        DispatchQueue.main.async { [weak self] in
            guard let self = self, let layer = self.previewLayer, let dev = self.videoInput?.device else { call.resolve(); return }
            let pt = layer.captureDevicePointConverted(fromLayerPoint:
                CGPoint(x: CGFloat(nx) * layer.bounds.width, y: CGFloat(ny) * layer.bounds.height))
            self.sessionQueue.async {
                do {
                    try dev.lockForConfiguration()
                    if dev.isFocusPointOfInterestSupported { dev.focusPointOfInterest = pt; dev.focusMode = .autoFocus }
                    if dev.isExposurePointOfInterestSupported { dev.exposurePointOfInterest = pt; dev.exposureMode = .autoExpose }
                    dev.unlockForConfiguration()
                } catch {}
                call.resolve()
            }
        }
    }

    @objc func setExposure(_ call: CAPPluginCall) {
        // bias in EV (ca. -2 .. +2), gesteuert vom Belichtungs-Slider der Web-UI
        let bias = Float(call.getDouble("bias") ?? 0)
        sessionQueue.async { [weak self] in
            guard let dev = self?.videoInput?.device else { call.resolve(); return }
            do {
                try dev.lockForConfiguration()
                let clamped = max(dev.minExposureTargetBias, min(dev.maxExposureTargetBias, bias))
                dev.setExposureTargetBias(clamped)
                dev.unlockForConfiguration()
            } catch {}
            call.resolve()
        }
    }

    // ── Foto ───────────────────────────────────────────────────────────────
    @objc func capturePhoto(_ call: CAPPluginCall) {
        photoCall = call
        sessionQueue.async { [weak self] in
            guard let self = self else { return }
            let settings = AVCapturePhotoSettings(format: [AVVideoCodecKey: AVVideoCodecType.jpeg])
            self.photoOutput.capturePhoto(with: settings, delegate: self)
        }
    }

    public func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?) {
        guard let call = photoCall else { return }
        photoCall = nil
        guard error == nil, let data = photo.fileDataRepresentation() else {
            call.reject("Foto fehlgeschlagen"); return
        }
        call.resolve(["base64": data.base64EncodedString()])
    }

    // ── Video (Segmente + verlustfreies Zusammenfuegen) ────────────────────
    private func newSegmentURL() -> URL {
        FileManager.default.temporaryDirectory
            .appendingPathComponent("pz-seg-\(segments.count)-\(Int(Date().timeIntervalSince1970 * 1000)).mp4")
    }

    @objc func startRecord(_ call: CAPPluginCall) {
        sessionQueue.async { [weak self] in
            guard let self = self else { return }
            self.segments.removeAll()
            let url = self.newSegmentURL()
            self.movieOutput.startRecording(to: url, recordingDelegate: self)
            call.resolve(["ok": true])
        }
    }

    @objc func pauseRecord(_ call: CAPPluginCall) {
        sessionQueue.async { [weak self] in
            guard let self = self, self.movieOutput.isRecording else { call.resolve(); return }
            self.segmentDone = { _ in call.resolve(["ok": true]) }
            self.movieOutput.stopRecording()
        }
    }

    @objc func resumeRecord(_ call: CAPPluginCall) {
        sessionQueue.async { [weak self] in
            guard let self = self else { return }
            let url = self.newSegmentURL()
            self.movieOutput.startRecording(to: url, recordingDelegate: self)
            call.resolve(["ok": true])
        }
    }

    @objc func stopRecord(_ call: CAPPluginCall) {
        stopCall = call
        sessionQueue.async { [weak self] in
            guard let self = self else { return }
            if self.movieOutput.isRecording {
                self.segmentDone = { [weak self] _ in self?.mergeAndReturn() }
                self.movieOutput.stopRecording()
            } else {
                self.mergeAndReturn()
            }
        }
    }

    public func fileOutput(_ output: AVCaptureFileOutput, didFinishRecordingTo outputFileURL: URL,
                           from connections: [AVCaptureConnection], error: Error?) {
        if error == nil || FileManager.default.fileExists(atPath: outputFileURL.path) {
            segments.append(outputFileURL)
        }
        let done = segmentDone
        segmentDone = nil
        done?(error == nil)
    }

    private func mergeAndReturn() {
        guard let call = stopCall else { return }
        stopCall = nil
        let segs = segments
        segments = []
        guard !segs.isEmpty else { call.reject("Keine Aufnahme"); return }

        // Ein Segment: direkt zurueckgeben, null Verarbeitung
        if segs.count == 1 { returnFile(segs[0], to: call); return }

        // Mehrere Segmente: verlustfrei zusammenfuegen (Passthrough)
        let comp = AVMutableComposition()
        let vTrack = comp.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)
        let aTrack = comp.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)
        var cursor = CMTime.zero
        for url in segs {
            let asset = AVAsset(url: url)
            let range = CMTimeRange(start: .zero, duration: asset.duration)
            if let v = asset.tracks(withMediaType: .video).first {
                try? vTrack?.insertTimeRange(range, of: v, at: cursor)
                vTrack?.preferredTransform = v.preferredTransform
            }
            if let a = asset.tracks(withMediaType: .audio).first {
                try? aTrack?.insertTimeRange(range, of: a, at: cursor)
            }
            cursor = CMTimeAdd(cursor, asset.duration)
        }
        let outURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("pz-merged-\(Int(Date().timeIntervalSince1970 * 1000)).mp4")
        guard let export = AVAssetExportSession(asset: comp, presetName: AVAssetExportPresetPassthrough) else {
            returnFile(segs[0], to: call); return
        }
        export.outputURL = outURL
        export.outputFileType = .mp4
        export.exportAsynchronously { [weak self] in
            if export.status == .completed {
                self?.returnFile(outURL, to: call)
            } else {
                self?.returnFile(segs[0], to: call)
            }
            segs.forEach { try? FileManager.default.removeItem(at: $0) }
        }
    }

    private func returnFile(_ url: URL, to call: CAPPluginCall) {
        DispatchQueue.global(qos: .userInitiated).async {
            guard let data = try? Data(contentsOf: url) else {
                call.reject("Video lesen fehlgeschlagen"); return
            }
            call.resolve(["base64": data.base64EncodedString(), "mime": "video/mp4"])
        }
    }
}
