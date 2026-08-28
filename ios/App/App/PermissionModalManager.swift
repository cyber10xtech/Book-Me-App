import Foundation
import UIKit
import AVFoundation
import Photos
import CoreLocation
import EventKit
import UserNotifications

/// Central manager for native iOS permission requests used by BookMe Customer.
///
/// Minimum deployment target: iOS 15.0 (Capacitor 8 / Firebase 12 requirement).
/// Build target: iOS 26 SDK via Xcode 26.
///
/// Permissions:
///   - Camera       (profile photo, chat images)
///   - Microphone   (voice notes in chat)
///   - Photo Library (upload / save images)
///   - Location     (nearby provider search — when-in-use only)
///   - Calendar     (add confirmed bookings to calendar)
///   - Notifications (push alerts via FCM)
@MainActor
final class PermissionModalManager: NSObject {

    static let shared = PermissionModalManager()
    private let locationManager = CLLocationManager()

    private override init() {
        super.init()
    }

    // MARK: - Camera

    func requestCameraPermission(completion: @escaping (Bool) -> Void) {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            completion(true)
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { granted in
                DispatchQueue.main.async { completion(granted) }
            }
        default:
            completion(false)
        }
    }

    func checkCameraPermission() -> Bool {
        return AVCaptureDevice.authorizationStatus(for: .video) == .authorized
    }

    // MARK: - Microphone
    // iOS 17+: AVAudioApplication replaces AVAudioSession for record permission.
    // iOS 15–16: fall back to AVAudioSession.

    func requestMicrophonePermission(completion: @escaping (Bool) -> Void) {
        if #available(iOS 17.0, *) {
            switch AVAudioApplication.shared.recordPermission {
            case .granted:
                completion(true)
            case .undetermined:
                AVAudioApplication.requestRecordPermission { granted in
                    DispatchQueue.main.async { completion(granted) }
                }
            default:
                completion(false)
            }
        } else {
            switch AVAudioSession.sharedInstance().recordPermission {
            case .granted:
                completion(true)
            case .undetermined:
                AVAudioSession.sharedInstance().requestRecordPermission { granted in
                    DispatchQueue.main.async { completion(granted) }
                }
            default:
                completion(false)
            }
        }
    }

    func checkMicrophonePermission() -> Bool {
        if #available(iOS 17.0, *) {
            return AVAudioApplication.shared.recordPermission == .granted
        }
        return AVAudioSession.sharedInstance().recordPermission == .granted
    }

    // MARK: - Photo Library

    func requestPhotoLibraryPermission(completion: @escaping (Bool) -> Void) {
        let status = PHPhotoLibrary.authorizationStatus(for: .readWrite)
        switch status {
        case .authorized, .limited:
            completion(true)
        case .notDetermined:
            PHPhotoLibrary.requestAuthorization(for: .readWrite) { newStatus in
                DispatchQueue.main.async {
                    completion(newStatus == .authorized || newStatus == .limited)
                }
            }
        default:
            completion(false)
        }
    }

    func checkPhotoLibraryPermission() -> Bool {
        let s = PHPhotoLibrary.authorizationStatus(for: .readWrite)
        return s == .authorized || s == .limited
    }

    // MARK: - Location (when-in-use only)

    func requestLocationPermission(completion: @escaping (Bool) -> Void) {
        switch locationManager.authorizationStatus {
        case .authorizedWhenInUse, .authorizedAlways:
            completion(true)
        case .notDetermined:
            locationManager.requestWhenInUseAuthorization()
            // Poll after a short delay — CLLocationManager is delegate-based
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) { [weak self] in
                let s = self?.locationManager.authorizationStatus
                completion(s == .authorizedWhenInUse || s == .authorizedAlways)
            }
        default:
            completion(false)
        }
    }

    func checkLocationPermission() -> Bool {
        let s = locationManager.authorizationStatus
        return s == .authorizedWhenInUse || s == .authorizedAlways
    }

    // MARK: - Calendar
    // iOS 17+: requestFullAccessToEvents replaces the older requestAccess(to: .event).

    func requestCalendarPermission(completion: @escaping (Bool) -> Void) {
        let store = EKEventStore()
        if #available(iOS 17.0, *) {
            switch EKEventStore.authorizationStatus(for: .event) {
            case .fullAccess:
                completion(true)
            case .notDetermined:
                store.requestFullAccessToEvents { granted, _ in
                    DispatchQueue.main.async { completion(granted) }
                }
            default:
                completion(false)
            }
        } else {
            switch EKEventStore.authorizationStatus(for: .event) {
            case .authorized:
                completion(true)
            case .notDetermined:
                store.requestAccess(to: .event) { granted, _ in
                    DispatchQueue.main.async { completion(granted) }
                }
            default:
                completion(false)
            }
        }
    }

    func checkCalendarPermission() -> Bool {
        if #available(iOS 17.0, *) {
            return EKEventStore.authorizationStatus(for: .event) == .fullAccess
        }
        return EKEventStore.authorizationStatus(for: .event) == .authorized
    }

    // MARK: - Push Notifications

    func requestNotificationPermission(completion: @escaping (Bool) -> Void) {
        UNUserNotificationCenter.current().requestAuthorization(
            options: [.alert, .badge, .sound]
        ) { granted, _ in
            DispatchQueue.main.async { completion(granted) }
        }
    }
}
