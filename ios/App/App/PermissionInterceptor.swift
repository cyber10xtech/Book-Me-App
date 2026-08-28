import UIKit
import WebKit

/// Intercepts JavaScript permission request messages posted from the web layer
/// and delegates to PermissionModalManager to trigger native iOS permission dialogs.
///
/// Covered: camera, microphone, photos, location, calendar, notifications.
final class PermissionInterceptor: NSObject, WKScriptMessageHandler {

    static let shared = PermissionInterceptor()
    private override init() { super.init() }

    /// Register message handlers on the WKWebView's content controller.
    func setupWebViewScriptMessages(webView: WKWebView) {
        let handlers = [
            "requestCameraPermission",
            "requestMicrophonePermission",
            "requestPhotoPermission",
            "requestLocationPermission",
            "requestCalendarPermission",
            "requestNotificationPermission",
        ]
        handlers.forEach {
            webView.configuration.userContentController.add(self, name: $0)
        }
    }

    // MARK: - WKScriptMessageHandler

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard let webView = message.webView else { return }
        let manager = PermissionModalManager.shared

        switch message.name {

        case "requestCameraPermission":
            manager.requestCameraPermission { granted in
                self.notify(webView: webView, event: "cameraPermissionResult", granted: granted)
            }

        case "requestMicrophonePermission":
            manager.requestMicrophonePermission { granted in
                self.notify(webView: webView, event: "microphonePermissionResult", granted: granted)
            }

        case "requestPhotoPermission":
            manager.requestPhotoLibraryPermission { granted in
                self.notify(webView: webView, event: "photoPermissionResult", granted: granted)
            }

        case "requestLocationPermission":
            manager.requestLocationPermission { granted in
                self.notify(webView: webView, event: "locationPermissionResult", granted: granted)
            }

        case "requestCalendarPermission":
            manager.requestCalendarPermission { granted in
                self.notify(webView: webView, event: "calendarPermissionResult", granted: granted)
            }

        case "requestNotificationPermission":
            manager.requestNotificationPermission { granted in
                self.notify(webView: webView, event: "notificationPermissionResult", granted: granted)
            }

        default:
            break
        }
    }

    // MARK: - Private

    private func notify(webView: WKWebView, event: String, granted: Bool) {
        let js = """
        window.permissionResults = window.permissionResults || {};
        window.permissionResults['\(event)'] = \(granted);
        window.dispatchEvent(new CustomEvent('permissionResult', { detail: { event: '\(event)', granted: \(granted) } }));
        """
        webView.evaluateJavaScript(js, completionHandler: nil)
    }
}
