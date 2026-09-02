/**
 * Whether a licensed external recruiting data provider (college/coach
 * directory, roster/transfer-portal signals) is connected. Always false
 * today — no such provider is integrated, and this deliberately isn't a
 * real RecruitingDataProvider interface yet (no getColleges/getCoaches/
 * etc.) since that layer is still blocked on choosing and licensing an
 * actual vendor. This exists only to drive the honest "not connected"
 * UI state — same pattern as isAiConfigured() — never to fabricate data
 * when it's false.
 */
export function isRecruitingIntelligenceConnected(): boolean {
  return false;
}
