// Target membership: App AND MentaWorkoutWidget (both checkboxes).
//
// Shared model + state machine for the MENTA live workout Live Activity.
// Keep `nextState` identical to src/lib/native/live-workout.ts.
// Privacy: only workout name, exercise names, set counts and rep labels.
// Never put wellness, mindset, academic or recruiting data here.

import ActivityKit
import Foundation

struct MentaWorkoutAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var exerciseIndex: Int
        var setNumber: Int      // 1-based
        var restEndsAt: Date?
        var phase: String       // "work" | "rest" | "done"
    }

    struct Exercise: Codable, Hashable {
        var name: String
        var sets: Int
        var reps: String
    }

    var workoutName: String
    var startedAt: Date
    var restSeconds: Int
    var exercises: [Exercise]
}

enum MentaWorkoutAction: String {
    case completeSet, skip, addRest
}

extension Notification.Name {
    static let mentaWorkoutChanged = Notification.Name("MentaWorkoutChanged")
}

enum MentaWorkoutEngine {
    typealias State = MentaWorkoutAttributes.ContentState
    static let addRestSeconds: TimeInterval = 30

    static func nextState(_ s: State, attributes a: MentaWorkoutAttributes,
                          action: MentaWorkoutAction, now: Date = Date()) -> State {
        if s.phase == "done" || a.exercises.isEmpty { return s }
        let ex = a.exercises[min(s.exerciseIndex, a.exercises.count - 1)]
        let isLast = s.exerciseIndex >= a.exercises.count - 1
        let rest = now.addingTimeInterval(TimeInterval(a.restSeconds))
        switch action {
        case .completeSet:
            if s.setNumber < ex.sets {
                return State(exerciseIndex: s.exerciseIndex, setNumber: s.setNumber + 1, restEndsAt: rest, phase: "rest")
            }
            if isLast { return State(exerciseIndex: s.exerciseIndex, setNumber: s.setNumber, restEndsAt: nil, phase: "done") }
            return State(exerciseIndex: s.exerciseIndex + 1, setNumber: 1, restEndsAt: rest, phase: "rest")
        case .skip:
            if isLast { return State(exerciseIndex: s.exerciseIndex, setNumber: s.setNumber, restEndsAt: nil, phase: "done") }
            return State(exerciseIndex: s.exerciseIndex + 1, setNumber: 1, restEndsAt: nil, phase: "work")
        case .addRest:
            let base = (s.restEndsAt.map { $0 > now ? $0 : now }) ?? now
            return State(exerciseIndex: s.exerciseIndex, setNumber: s.setNumber,
                         restEndsAt: base.addingTimeInterval(addRestSeconds), phase: "rest")
        }
    }

    static var current: Activity<MentaWorkoutAttributes>? {
        Activity<MentaWorkoutAttributes>.activities.first
    }

    /// Applies an action to the running Live Activity (used by Lock Screen buttons and the app).
    @discardableResult
    static func apply(_ action: MentaWorkoutAction) async -> (Activity<MentaWorkoutAttributes>, State)? {
        guard let activity = current else { return nil }
        let new = nextState(activity.content.state, attributes: activity.attributes, action: action)
        await activity.update(ActivityContent(state: new, staleDate: nil))
        await MainActor.run {
            NotificationCenter.default.post(name: .mentaWorkoutChanged, object: nil)
        }
        return (activity, new)
    }
}
