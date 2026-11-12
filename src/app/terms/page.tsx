import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";

const LAST_UPDATED = "November 12, 2026";

const SECTIONS = [
  {
    "title": "1. Draft status and operator",
    "body": [
      "These proposed terms are dated November 12, 2026 and require review before public launch. The contracting entity, business address, support contact and applicable dispute provisions are not yet confirmed. No statement here eliminates statutory duties or guarantees protection against claims."
    ]
  },
  {
    "title": "2. Eligibility and accounts",
    "body": [
      "MENTA accounts are intended for people aged 14 or older. Provide accurate information, protect your credentials and use only accounts and records you are authorized to access. Minors should involve a parent or guardian; any legally required permission must be obtained through an appropriate process. A user-selected coach, trainer or doctor role does not establish professional credentials."
    ]
  },
  {
    "title": "3. Service scope",
    "body": [
      "MENTA provides tools for organizing training, academics, teams, recruiting, communication and related activities. Availability varies by platform and deployment. The current iPhone client operates locally and does not synchronize website accounts. Previews, research concepts and unavailable integrations must not be relied on as delivered functionality."
    ]
  },
  {
    "title": "4. Training, health and emergencies",
    "body": [
      "Training involves risks. Use suitable equipment and qualified supervision, follow your coach\u2019s and clinician\u2019s directions, and stop activity when symptoms or unsafe conditions warrant it. Check-ins, scores and AI responses are not diagnosis, medical clearance, individualized treatment or emergency monitoring. MENTA cannot guarantee injury prevention. Contact local emergency services in an emergency. These statements do not waive rights that cannot lawfully be waived."
    ]
  },
  {
    "title": "5. Academics, recruiting and AI",
    "body": [
      "School officials and relevant governing bodies determine eligibility; an app alert is not an official decision. MENTA does not guarantee scholarships, offers, admissions, grades or athletic results. AI can be inaccurate or incomplete. Review generated content and verify important facts with qualified people. Do not use study tools to violate your school\u2019s academic-integrity rules."
    ]
  },
  {
    "title": "6. User content and permissions",
    "body": [
      "You retain your rights in content you provide. You grant MENTA the limited rights needed to host, process and display it to operate the features you choose, subject to the privacy notice and your sharing settings. Upload only content you have permission to use, including footage, music and records about others. No blanket ownership transfer of an athlete\u2019s identity, likeness or content is intended."
    ]
  },
  {
    "title": "7. Acceptable use and moderation",
    "body": [
      "Do not harass, exploit minors, impersonate others, infringe intellectual property, upload unlawful material, bypass access controls or misuse private information. Use available reporting and blocking controls. MENTA may restrict access to address abuse or security risks, subject to applicable law; reporting tools are not continuously monitored emergency channels."
    ]
  },
  {
    "title": "8. Fees and product sales",
    "body": [
      "Any paid service must show price, billing frequency, renewal, cancellation and refund terms before purchase. An account or preview does not itself authorize a charge. Physical gear shown as a concept is not an offer for immediate delivery. Product availability, safety testing, shipping, returns and warranties must be confirmed before orders are accepted. Nothing excludes mandatory consumer rights or product-safety duties."
    ]
  },
  {
    "title": "9. Availability and limits",
    "body": [
      "To the extent permitted by applicable law, the service is offered as available without guarantees of uninterrupted operation or particular outcomes. Any final limitation of liability must be reviewed for the actual operator, users and jurisdictions. It must not exclude liabilities or remedies that law prohibits excluding. This draft does not impose an unreviewed arbitration requirement or blanket injury waiver."
    ]
  },
  {
    "title": "10. Ending use and changes",
    "body": [
      "You may stop using MENTA. Follow the available cancellation process for a paid subscription; uninstalling an app may not cancel billing. Local reset and cloud account deletion are different operations. The final documents must include a working contact and verified deletion process. Material changes to the final terms should be notified appropriately, with renewed acceptance where required."
    ]
  }
];

export default function TermsPage() {
  return (
    <>
      <MarketingNav />
      <main className="px-6 md:px-10 pt-32 pb-20 max-w-2xl mx-auto">
        <div className="eyebrow justify-center flex mx-auto w-fit mb-2">Legal — Draft</div>
        <h1 className="text-4xl font-semibold mb-4 text-center">Terms of Service</h1>
        <p className="text-text-2 text-sm text-center mb-2">Last updated: {LAST_UPDATED}</p>
        <p className="card p-4 text-sm text-text-2 mb-10" style={{ borderColor: "var(--warning)" }}>
          <strong>This is a working draft, not a finished legal document.</strong> It has not been reviewed
          by an attorney and will be replaced before MENTA is available to the general public.
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
