// Target membership: App only.
// In Main.storyboard, set the Bridge View Controller's Custom Class to
// `MentaViewController` (Module: App) so this plugin gets registered.

import Capacitor
import UIKit

class MentaViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(MentaLiveWorkoutPlugin())
    }
}
