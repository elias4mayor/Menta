// Target membership: MentaWorkoutWidget only.
//
// Lock Screen + Dynamic Island design for the MENTA live workout.

import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit

private let mentaGreen = Color(red: 48 / 255, green: 209 / 255, blue: 88 / 255)
private let mentaGray = Color(red: 142 / 255, green: 142 / 255, blue: 147 / 255)
private let buttonGray = Color(red: 44 / 255, green: 44 / 255, blue: 46 / 255)

private extension ActivityViewContext<MentaWorkoutAttributes> {
    var exercise: MentaWorkoutAttributes.Exercise? {
        let list = attributes.exercises
        guard !list.isEmpty else { return nil }
        return list[min(state.exerciseIndex, list.count - 1)]
    }
    var setLine: String {
        guard let ex = exercise else { return "" }
        return ex.reps.isEmpty
            ? "Set \(state.setNumber) of \(ex.sets)"
            : "Set \(state.setNumber) of \(ex.sets) · \(ex.reps) reps"
    }
    var compactLabel: String {
        let first = exercise?.name.split(separator: " ").first.map(String.init) ?? "Set"
        return "\(first) \(state.setNumber)/\(exercise?.sets ?? 1)"
    }
}

struct MentaRestTimer: View {
    let state: MentaWorkoutAttributes.ContentState
    var body: some View {
        if state.phase == "rest", let end = state.restEndsAt, end > Date() {
            Text(timerInterval: Date()...end, countsDown: true)
                .monospacedDigit()
                .foregroundStyle(mentaGreen)
        } else if state.phase == "done" {
            Text("Done").foregroundStyle(mentaGreen)
        } else {
            Text("Go").foregroundStyle(.white)
        }
    }
}

struct MentaProgressSegments: View {
    let current: Int
    let total: Int
    var body: some View {
        HStack(spacing: 4) {
            ForEach(0..<max(total, 1), id: \.self) { i in
                Capsule()
                    .fill(i < current ? Color.white : (i == current ? mentaGreen : buttonGray))
                    .frame(height: 4)
            }
        }
    }
}

struct MentaControls: View {
    var showAddRest = true
    var body: some View {
        HStack(spacing: 8) {
            Button(intent: MentaCompleteSetIntent()) {
                pill("Set done", fill: .white, text: .black)
            }
            .buttonStyle(.plain)
            if showAddRest {
                Button(intent: MentaAddRestIntent()) { pill("+30s", fill: buttonGray, text: .white) }
                    .buttonStyle(.plain)
            }
            Button(intent: MentaSkipExerciseIntent()) { pill("Skip", fill: buttonGray, text: .white) }
                .buttonStyle(.plain)
        }
    }

    private func pill(_ label: String, fill: Color, text: Color) -> some View {
        Text(label)
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(text)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 9)
            .background(fill, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

struct MentaLockScreenView: View {
    let context: ActivityViewContext<MentaWorkoutAttributes>
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("MENTA").font(.caption.weight(.bold)).tracking(1.2).foregroundStyle(.white)
                Spacer()
                HStack(spacing: 4) {
                    Text(context.attributes.workoutName)
                    Text("·")
                    Text(context.attributes.startedAt, style: .timer).monospacedDigit()
                }
                .font(.caption)
                .foregroundStyle(mentaGray)
                .lineLimit(1)
            }

            if context.state.phase == "done" {
                Text("Workout done").font(.title3.weight(.semibold)).foregroundStyle(.white)
                Text("Open MENTA to save it to your training history.")
                    .font(.footnote).foregroundStyle(mentaGray)
            } else {
                HStack(alignment: .bottom) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(context.exercise?.name ?? "").font(.title3.weight(.semibold)).foregroundStyle(.white).lineLimit(1)
                        Text(context.setLine).font(.footnote).foregroundStyle(mentaGray)
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 0) {
                        MentaRestTimer(state: context.state).font(.system(size: 28, weight: .semibold))
                            .multilineTextAlignment(.trailing)
                            .frame(maxWidth: 90, alignment: .trailing)
                        Text(context.state.phase == "rest" ? "Rest" : "Your set")
                            .font(.caption2).foregroundStyle(mentaGray)
                    }
                }
                MentaProgressSegments(current: context.state.exerciseIndex, total: context.attributes.exercises.count)
                MentaControls()
            }
        }
        .padding(14)
    }
}

struct MentaWorkoutLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: MentaWorkoutAttributes.self) { context in
            MentaLockScreenView(context: context)
                .activityBackgroundTint(Color.black.opacity(0.88))
                .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(context.exercise?.name ?? "Workout").font(.headline).lineLimit(1)
                        Text(context.setLine).font(.caption).foregroundStyle(mentaGray)
                    }
                    .padding(.leading, 4)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    MentaRestTimer(state: context.state)
                        .font(.title2.weight(.semibold))
                        .multilineTextAlignment(.trailing)
                        .frame(maxWidth: 80, alignment: .trailing)
                        .padding(.trailing, 4)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    if context.state.phase == "done" {
                        Text("Workout done · open MENTA to save").font(.footnote).foregroundStyle(mentaGray)
                    } else {
                        VStack(spacing: 10) {
                            MentaProgressSegments(current: context.state.exerciseIndex, total: context.attributes.exercises.count)
                            MentaControls(showAddRest: false)
                        }
                    }
                }
            } compactLeading: {
                Text(context.compactLabel).font(.caption.weight(.semibold)).lineLimit(1)
            } compactTrailing: {
                MentaRestTimer(state: context.state)
                    .font(.caption.weight(.semibold))
                    .multilineTextAlignment(.trailing)
                    .frame(maxWidth: 44)
            } minimal: {
                Image(systemName: "figure.strengthtraining.traditional").foregroundStyle(mentaGreen)
            }
            .keylineTint(mentaGreen)
        }
    }
}
