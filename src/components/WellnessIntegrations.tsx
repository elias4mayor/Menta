const VENDORS = ["Apple Health", "WHOOP", "Garmin", "Oura", "Fitbit"];

/**
 * No wearable integration is live. Each vendor listed here would need its
 * own OAuth flow, permission scopes, data mapping, revocation handling, and
 * privacy review before it could be anything more than this — never claim
 * one is connected until it genuinely is.
 */
export function WellnessIntegrations() {
  return (
    <div>
      <p className="text-text-2 text-sm mb-4">
        No wearable is connected yet. When integrations ship, each one will be a separate, explicit
        connection you control — nothing connects automatically.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {VENDORS.map((v) => (
          <div key={v} className="card p-3 text-center" style={{ opacity: 0.6 }}>
            <div className="text-sm mb-2">{v}</div>
            <span className="badge badge-demo">Coming soon</span>
          </div>
        ))}
      </div>
    </div>
  );
}
