// Target membership: App only.
//
// JS bridge: registerPlugin("MentaLiveWorkout") in src/lib/native/live-workout.ts.

import ActivityKit
import Capacitor
import Foundation

@objc(MentaLiveWorkoutPlugin)
public class MentaLiveWorkoutPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "MentaLiveWorkoutPlugin"
    public let jsName = "MentaLiveWorkout"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isSupported", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "apply", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getSession", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "end", returnType: CAPPluginReturnPromise),
    ]

    private var observer: NSObjectProtocol?

    override public func load() {
        // Lock Screen button presses → tell the web view so the in-app workout stays in sync.
        observer = NotificationCenter.default.addObserver(
            forName: .mentaWorkoutChanged, object: nil, queue: .main
        ) { [weak self] _ in
            let a = MentaWorkoutEngine.current
            self?.notifyListeners("sessionChange", data: ["session": Self.serialize(a, a?.content.state) ?? NSNull()])
        }
    }

    deinit {
        if let observer { NotificationCenter.default.removeObserver(observer) }
    }

    @objc func isSupported(_ call: CAPPluginCall) {
        call.resolve(["supported": ActivityAuthorizationInfo().areActivitiesEnabled])
    }

    @objc func start(_ call: CAPPluginCall) {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            call.reject("Live Activities are turned off for MENTA in Settings.")
            return
        }
        let name = String((call.getString("workoutName") ?? "Workout").prefix(40))
        let rest = max(15, min(600, call.getInt("restSeconds") ?? 90))
        let raw = (call.getArray("exercises") ?? []).compactMap { $0 as? JSObject }
        // Live Activity data is capped at 4 KB, so keep names short and the list bounded.
        let exercises: [MentaWorkoutAttributes.Exercise] = raw.prefix(12).compactMap { o in
            guard let n = o["name"] as? String, !n.isEmpty else { return nil }
            let sets = max(1, min(12, (o["sets"] as? NSNumber)?.intValue ?? 1))
            let reps = String(((o["reps"] as? String) ?? "").prefix(12))
            return .init(name: String(n.prefix(40)), sets: sets, reps: reps)
        }
        guard !exercises.isEmpty else {
            call.reject("This workout has no exercises.")
            return
        }

        Task {
            for old in Activity<MentaWorkoutAttributes>.activities {
                await old.end(nil, dismissalPolicy: .immediate)
            }
            let attrs = MentaWorkoutAttributes(workoutName: name, startedAt: Date(), restSeconds: rest, exercises: exercises)
            let state = MentaWorkoutAttributes.ContentState(exerciseIndex: 0, setNumber: 1, restEndsAt: nil, phase: "work")
            do {
                let activity = try Activity.request(
                    attributes: attrs,
                    content: ActivityContent(state: state, staleDate: nil),
                    pushType: nil
                )
                call.resolve(["session": Self.serialize(activity, state) ?? NSNull()])
            } catch {
                call.reject("Could not start the Live Activity: \(error.localizedDescription)")
            }
        }
    }

    @objc func apply(_ call: CAPPluginCall) {
        guard let raw = call.getString("action"), let action = MentaWorkoutAction(rawValue: raw) else {
            call.reject("Unknown action")
            return
        }
        Task {
            let result = await MentaWorkoutEngine.apply(action)
            call.resolve(["session": Self.serialize(result?.0, result?.1) ?? NSNull()])
        }
    }

    @objc func getSession(_ call: CAPPluginCall) {
        let a = MentaWorkoutEngine.current
        call.resolve(["session": Self.serialize(a, a?.content.state) ?? NSNull()])
    }

    @objc func end(_ call: CAPPluginCall) {
        Task {
            for a in Activity<MentaWorkoutAttributes>.activities {
                await a.end(nil, dismissalPolicy: .immediate)
            }
            call.resolve()
        }
    }

    static func serialize(_ activity: Activity<MentaWorkoutAttributes>?,
                          _ state: MentaWorkoutAttributes.ContentState?) -> [String: Any]? {
        guard let activity, let s = state else { return nil }
        let a = activity.attributes
        var st: [String: Any] = ["exerciseIndex": s.exerciseIndex, "setNumber": s.setNumber, "phase": s.phase]
        if let r = s.restEndsAt { st["restEndsAt"] = r.timeIntervalSince1970 * 1000 } else { st["restEndsAt"] = NSNull() }
        return [
            "workoutName": a.workoutName,
            "startedAt": a.startedAt.timeIntervalSince1970 * 1000,
            "restSeconds": a.restSeconds,
            "exercises": a.exercises.map { ["name": $0.name, "sets": $0.sets, "reps": $0.reps] },
            "state": st,
        ]
    }
}
