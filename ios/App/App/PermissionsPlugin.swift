import Foundation
import Capacitor

/// Capacitor plugin exposing native permission requests to the JavaScript layer.
///
/// Supported permission types: camera, microphone, photo/photos, location,
/// calendar, notification/notifications.
@objc(PermissionsPlugin)
public class PermissionsPlugin: CAPPlugin {

    // MARK: - Plugin calls

    @objc func requestPermissions(_ call: CAPPluginCall) {
        guard let type = call.getString("permission") else {
            call.reject("Missing permission type")
            return
        }
        guard let vc = bridge?.viewController else {
            call.reject("View controller unavailable")
            return
        }
        _ = vc // retained for future sheet presentation if needed
        requestByType(type) { granted in
            call.resolve(["granted": granted])
        }
    }

    @objc func checkPermissions(_ call: CAPPluginCall) {
        guard let type = call.getString("permission") else {
            call.reject("Missing permission type")
            return
        }
        call.resolve(["granted": checkByType(type)])
    }

    // MARK: - Private helpers

    private func requestByType(_ type: String, completion: @escaping (Bool) -> Void) {
        let manager = PermissionModalManager.shared
        switch type.lowercased() {
        case "camera":
            manager.requestCameraPermission(completion: completion)
        case "microphone":
            manager.requestMicrophonePermission(completion: completion)
        case "photo", "photos":
            manager.requestPhotoLibraryPermission(completion: completion)
        case "location":
            manager.requestLocationPermission(completion: completion)
        case "calendar":
            manager.requestCalendarPermission(completion: completion)
        case "notification", "notifications":
            manager.requestNotificationPermission(completion: completion)
        default:
            completion(false)
        }
    }

    private func checkByType(_ type: String) -> Bool {
        let manager = PermissionModalManager.shared
        switch type.lowercased() {
        case "camera":       return manager.checkCameraPermission()
        case "microphone":   return manager.checkMicrophonePermission()
        case "photo", "photos": return manager.checkPhotoLibraryPermission()
        case "location":     return manager.checkLocationPermission()
        case "calendar":     return manager.checkCalendarPermission()
        default:             return false
        }
    }
}
