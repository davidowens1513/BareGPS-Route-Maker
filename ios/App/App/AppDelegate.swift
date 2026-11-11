import UIKit
import Capacitor
import WebKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool { true }
    func application(_ application: UIApplication, configurationForConnecting session: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration", sessionRole: session.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}

final class BareBridgeViewController: CAPBridgeViewController {
    override func webView(with frame: CGRect, configuration: WKWebViewConfiguration) -> WKWebView {
        // WKWebView can ignore CSS touch-action and Capacitor's zoomEnabled=false
        // for double taps. Keep only the native app viewport fixed; Leaflet owns
        // map pinch/double-tap zoom, and the public web viewport stays scalable.
        configuration.ignoresViewportScaleLimits = false
        let viewportScript = WKUserScript(source: """
            const viewport = document.querySelector('meta[name="viewport"]');
            if (viewport) {
                viewport.content = 'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
            }
            """, injectionTime: .atDocumentEnd, forMainFrameOnly: true)
        configuration.userContentController.addUserScript(viewportScript)
        return super.webView(with: frame, configuration: configuration)
    }

    override func capacitorDidLoad() { bridge?.registerPluginInstance(BareFilesPlugin()) }
}

@objc(BareFilesPlugin)
class BareFilesPlugin: CAPPlugin, CAPBridgedPlugin, UIDocumentPickerDelegate {
    let identifier = "BareFilesPlugin"
    let jsName = "BareFiles"
    let pluginMethods: [CAPPluginMethod] = [CAPPluginMethod(name: "shareFile", returnType: CAPPluginReturnPromise), CAPPluginMethod(name: "shareText", returnType: CAPPluginReturnPromise), CAPPluginMethod(name: "save", returnType: CAPPluginReturnPromise)]
    private var operation: CAPPluginCall?
    private var temporaryURL: URL?
    @objc func shareFile(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let encoded = call.getString("data"), let data = Data(base64Encoded: encoded), let name = call.getString("name"), let presenter = self.bridge?.viewController else { call.reject("Could not prepare PDF."); return }
            do {
                let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
                try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
                let url = directory.appendingPathComponent((name as NSString).lastPathComponent)
                try data.write(to: url, options: .atomic)
                let sheet = UIActivityViewController(activityItems: [url], applicationActivities: nil)
                if let popover = sheet.popoverPresentationController {
                    popover.sourceView = presenter.view
                    popover.sourceRect = CGRect(x: presenter.view.bounds.midX, y: presenter.view.bounds.midY, width: 0, height: 0)
                    popover.permittedArrowDirections = []
                }
                sheet.completionWithItemsHandler = { _, _, _, error in
                    try? FileManager.default.removeItem(at: directory)
                    if let error = error { call.reject("Could not share PDF: \(error.localizedDescription)") } else { call.resolve() }
                }
                presenter.present(sheet, animated: true)
            } catch { call.reject("Could not prepare PDF: \(error.localizedDescription)") }
        }
    }
    @objc func shareText(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let text = call.getString("text"), let presenter = self.bridge?.viewController else {
                call.reject("Could not prepare the routecard."); return
            }
            let sheet = UIActivityViewController(activityItems: [text], applicationActivities: nil)
            if let popover = sheet.popoverPresentationController {
                popover.sourceView = presenter.view
                popover.sourceRect = CGRect(x: presenter.view.bounds.midX, y: presenter.view.bounds.midY, width: 0, height: 0)
                popover.permittedArrowDirections = []
            }
            sheet.completionWithItemsHandler = { _, _, _, error in
                if let error = error { call.reject("Could not share routecard: \(error.localizedDescription)") }
                else { call.resolve() }
            }
            presenter.present(sheet, animated: true)
        }
    }
    @objc func save(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard self.operation == nil else { call.reject("A file action is already open."); return }
            guard let encoded = call.getString("data"), let data = Data(base64Encoded: encoded), let name = call.getString("name") else { call.reject("Could not prepare the GPX file."); return }
            do {
                let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
                try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
                let url = directory.appendingPathComponent((name as NSString).lastPathComponent)
                try data.write(to: url, options: .atomic)
                self.operation = call; self.temporaryURL = url
                let picker = UIDocumentPickerViewController(forExporting: [url], asCopy: true)
                picker.delegate = self
                self.bridge?.viewController?.present(picker, animated: true)
            } catch { call.reject("Could not prepare GPX export: \(error.localizedDescription)") }
        }
    }
    func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        guard let call = operation else { return }
        defer { finish() }
        call.resolve(["saved": true])
    }
    func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        operation?.reject("File action cancelled.", "CANCELLED"); finish()
    }
    private func finish() {
        operation = nil
        if let url = temporaryURL { try? FileManager.default.removeItem(at: url.deletingLastPathComponent()) }
        temporaryURL = nil
    }
}
