// Target membership: MentaWorkoutWidget only.
// Replace the bundle file Xcode generates (only one @main is allowed).

import SwiftUI
import WidgetKit

@main
struct MentaWorkoutWidgetBundle: WidgetBundle {
    var body: some Widget {
        MentaWorkoutLiveActivity()
    }
}
