// Target membership: App AND MentaWorkoutWidget (both checkboxes).
//
// Buttons on the Lock Screen / Dynamic Island. LiveActivityIntent runs in the
// app's process (iOS wakes the app in the background), so the update and the
// notification to the web view happen without unlocking the phone.

import ActivityKit
import AppIntents

@available(iOS 17.0, *)
struct MentaCompleteSetIntent: LiveActivityIntent {
    static let title: LocalizedStringResource = "Set done"
    init() {}
    func perform() async throws -> some IntentResult {
        await MentaWorkoutEngine.apply(.completeSet)
        return .result()
    }
}

@available(iOS 17.0, *)
struct MentaAddRestIntent: LiveActivityIntent {
    static let title: LocalizedStringResource = "Add 30 seconds rest"
    init() {}
    func perform() async throws -> some IntentResult {
        await MentaWorkoutEngine.apply(.addRest)
        return .result()
    }
}

@available(iOS 17.0, *)
struct MentaSkipExerciseIntent: LiveActivityIntent {
    static let title: LocalizedStringResource = "Skip exercise"
    init() {}
    func perform() async throws -> some IntentResult {
        await MentaWorkoutEngine.apply(.skip)
        return .result()
    }
}
