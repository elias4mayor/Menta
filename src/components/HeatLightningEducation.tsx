const SECTIONS = [
  {
    title: "Heat illness awareness",
    points: [
      "Heat illness exists on a spectrum from cramps and exhaustion up to heat stroke, which is a medical emergency.",
      "Warning signs include heavy sweating, weakness, dizziness, nausea, headache, confusion, or stopping sweating while still feeling hot.",
      "Hydration before, during, and after activity, and gradual acclimatization to heat over 1-2 weeks, are widely recommended prevention basics.",
      "If someone shows signs of heat stroke (confusion, very high body temperature, hot/dry or profusely sweating skin, loss of consciousness), treat it as a medical emergency: call 911 and begin cooling immediately while waiting for help.",
    ],
  },
  {
    title: "Lightning safety",
    points: [
      "\"When thunder roars, go indoors\" — if you can hear thunder, you're close enough to be struck.",
      "The widely used 30-30 rule: seek shelter if the time between seeing lightning and hearing thunder is 30 seconds or less, and wait at least 30 minutes after the last thunder before resuming activity.",
      "A substantial building or a hard-topped vehicle with windows up are considered safer than open fields, dugouts, or small shelters.",
      "Avoid open fields, tall isolated objects, metal fences/bleachers, and water during a thunderstorm.",
    ],
  },
];

/**
 * Static, general educational content only — no live weather/environment
 * data, no location-specific readings, nothing dynamic. This is NOT a
 * prediction system and does not claim to know current conditions at any
 * athlete's actual location. See the disclaimer at the bottom of this
 * component and the page-level disclaimer above it.
 */
export function HeatLightningEducation() {
  return (
    <div>
      <p className="text-text-2 text-sm mb-4">
        General, widely published safety guidance (adapted from resources like NOAA and the National
        Athletic Trainers&rsquo; Association) — not live weather data for your location, and not tailored
        medical advice.
      </p>
      <div className="grid sm:grid-cols-2 gap-4">
        {SECTIONS.map((s) => (
          <div key={s.title} className="card p-4">
            <div className="font-medium mb-2">{s.title}</div>
            <ul className="space-y-2 text-sm text-text-2">
              {s.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="text-text-3 text-xs mt-4">
        This is general education, not real-time conditions for your location and not a substitute for
        your team&rsquo;s official emergency action plan, your athletic trainer, or a qualified medical
        professional. In an emergency, call 911.
      </p>
    </div>
  );
}
