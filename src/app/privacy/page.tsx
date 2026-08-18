import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";

const LAST_UPDATED = "August 18, 2026";

const SECTIONS = [
  {
    title: "1. What this document is",
    body: [
      "This is a working draft of MENTA's Privacy Policy, written by the team building the product so that early athletes, coaches, and families can see exactly what we collect and why before we launch publicly. It has not been reviewed by an attorney and is not yet a binding legal agreement. It will be replaced by a final, attorney-reviewed version before MENTA is available to the general public.",
    ],
  },
  {
    title: "2. Who this covers",
    body: [
      "MENTA is built for middle-school through college athletes, along with their coaches, teammates, trainers, and parents/guardians. Many users are minors. If you're under 18, a parent or guardian is expected to be involved in setting up and reviewing your account.",
    ],
  },
  {
    title: "3. What we collect",
    body: [
      "Account basics: name, email, password (stored as a salted hash, never in plain text), role (athlete/coach/parent/trainer), and date of birth if provided.",
      "Profile data you enter yourself: sport, position, height/weight, school, city, state, graduation year, GPA, and a bio.",
      "Team data: teams you create or join, your membership role, and team-scoped content (rosters, calendar events, workouts, messages).",
      "Training & performance: workouts you log, performance stats you enter, goals you set, and film/highlight clips you upload.",
      "Recruiting data: target schools and coach/contact records you enter yourself, and any AI-drafted outreach messages (which you review before sending — MENTA never sends on your behalf).",
      "Recovery & wellness check-ins (sleep, soreness, mood, notes): treated as high-sensitivity data — see Section 5.",
      "Safety data: emergency contacts, and a personal safety profile (allergies, medical notes, medication notes) you choose to enter; coach-authored team emergency plans if you're on a team.",
      "Academic data: GPA/terms, assignments, and goals you enter yourself — never pulled from a school system.",
      "Messages you send to other users, and conversations with MENTA AI.",
      "Technical data: session cookies (required to keep you logged in), basic request logs, and audit-log entries for account and security-relevant actions (never the content of sensitive fields — see Section 5).",
    ],
  },
  {
    title: "4. What we don't do",
    body: [
      "We do not sell your data, or any athlete's data, to third parties.",
      "We do not share your data with recruiters, advertisers, or other users beyond what you explicitly choose to share (e.g., a public profile visibility setting, or content you post to a team you've joined).",
      "We do not use your training, wellness, academic, or safety data to train third-party advertising models.",
    ],
  },
  {
    title: "5. High-sensitivity data (Recovery & Safety)",
    body: [
      "Wellness check-ins and personal safety/medical information are handled more strictly than the rest of the app: they're private to you by default, never shown to teammates, coaches, or recruiters (team-level safety plans are the one exception, and those are written by a coach, not derived from your personal data), never sent to MENTA AI as context, and never included in audit-log entries beyond the fact that an action happened (we log 'a check-in was created,' never the actual sleep/soreness/allergy values).",
      "Important: our current development environment stores this data in a local database without encryption at rest. Don't treat this as production-grade security until MENTA is deployed on an encrypted, production datastore — this document will be updated when that happens.",
    ],
  },
  {
    title: "6. MENTA AI",
    body: [
      "When AI features are enabled, MENTA sends a limited, feature-specific slice of your data to Anthropic (our AI provider) to generate a response — for example, the general coach chat can see your profile/goals/calendar/training/performance, while Study Help can only see academic data, and outreach drafting can only see recruiting data. Wellness and safety data are never sent to any AI feature. If no AI provider is configured, MENTA says so honestly instead of faking a response.",
    ],
  },
  {
    title: "7. Minors & guardians",
    body: [
      "Parents/guardians can request to link to an athlete's account; the athlete approves or denies the request, and either side can revoke the link later. Linking a guardian does not currently grant the guardian automatic access to the athlete's full account — it establishes the relationship in our data model. A dedicated parental-consent gate at signup for users under 13 is not yet built; treat this as in progress, not a COPPA compliance certification, until stated otherwise.",
    ],
  },
  {
    title: "8. Your choices",
    body: [
      "You can view and edit most of your own data directly in the app (profile, goals, wellness check-ins, safety info, academic records, etc.).",
      "You can revoke active sessions from Settings.",
      "Self-service account deletion isn't built yet. To request deletion of your account and associated data, contact us through the waitlist/contact form referenced on the Trust & Safety page, and we'll handle it manually until a self-service option exists.",
    ],
  },
  {
    title: "9. Changes to this policy",
    body: [
      "Because this is a pre-launch draft, it may change as features are built or removed. We'll update the date at the top of this page when it does.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <>
      <MarketingNav />
      <main className="px-6 md:px-10 pt-32 pb-20 max-w-2xl mx-auto">
        <div className="eyebrow justify-center flex mx-auto w-fit mb-2">Legal — Draft</div>
        <h1 className="text-4xl font-semibold mb-4 text-center">Privacy Policy</h1>
        <p className="text-text-2 text-sm text-center mb-2">Last updated: {LAST_UPDATED}</p>
        <p className="card p-4 text-sm text-text-2 mb-10" style={{ borderColor: "var(--warning)" }}>
          <strong>This is a working draft, not a finished legal document.</strong> It has not been reviewed
          by an attorney and will be replaced before MENTA is available to the general public. It exists so
          early users can see exactly what we collect today, in plain language.
        </p>
        <div className="space-y-6">
          {SECTIONS.map((s) => (
            <div key={s.title} className="card p-5">
              <div className="font-heading font-semibold mb-3">{s.title}</div>
              <div className="space-y-2 text-text-2 text-sm">
                {s.body.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
