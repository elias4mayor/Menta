import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";

const LAST_UPDATED = "November 12, 2026";

const SECTIONS = [
  {
    "title": "1. Status and scope",
    "body": [
      "This is a pre-launch draft dated November 12, 2026. It describes the reviewed source code, not a certification of a live deployment. The operator\u2019s legal name, privacy contact, deployment vendors, retention schedule and applicable regional rights must be confirmed before publication as the final notice. Privacy obligations still apply during testing."
    ]
  },
  {
    "title": "2. Website and iPhone app",
    "body": [
      "The web service supports cloud accounts and team features. The current native iPhone client separately stores its profile, workout selections, wellness inputs and focus-session count on the device; it does not currently synchronize those records to a MENTA account. Device backups may include local app data according to the device and backup settings. Product previews do not collect payment information."
    ]
  },
  {
    "title": "3. Information processed by the web service",
    "body": [
      "Depending on the features you use, records may include name, email, password hash, birth date, role, sports profile, school, academic records, assignments, goals, training logs, performance entries, videos, messages, recruiting contacts, calendar events, emergency contacts, wellness responses, documents and care appointment details. Session cookies, security logs and legal acknowledgement records support account operation and security."
    ]
  },
  {
    "title": "4. Connected services and AI",
    "body": [
      "Google Classroom integration can import authorized academic information when connected; academic records are not limited to manual entry. The AI implementation supports Google Gemini, Anthropic and OpenAI, with Gemini as the code default. The actual configured provider and its processing terms must be confirmed for each deployment. AI features send prompts and feature-specific context to the configured provider. General coach context includes profile, goals, calendar, training, performance and highlights. Do not enter medical records or other unnecessary sensitive information into chat: user-written prompts may be transmitted."
    ]
  },
  {
    "title": "5. Sharing and access",
    "body": [
      "Team content can be available to authorized team members. Personal documents can be available to their owner, uploader, approved linked guardian and authorized administrators under the document access rules. Team documents are available to team members. Care, academic and other records have feature-specific access rules; do not assume that an approved relationship gives access to every record. Review the intended owner and team before uploading. Service providers may process data to run hosting, storage, email, AI and payment features when configured."
    ]
  },
  {
    "title": "6. Sensitive information",
    "body": [
      "Wellness, school and medical information require particular care. General AI coach context does not automatically include wellness and personal safety records. This does not prevent a user from typing sensitive information into a prompt. Upload only records you have authority to share. MENTA does not claim HIPAA, FERPA or COPPA certification. Production access controls, provider agreements and incident procedures need review before accepting sensitive records from real users."
    ]
  },
  {
    "title": "7. Minors",
    "body": [
      "New email accounts require a valid birth date indicating an age of at least 14. New social-login users are directed to that signup flow. A birth-date check is not verified age assurance or verified parental consent. Guardian linking is not a substitute for any legally required parental consent. The existing minor and guardian flows, including legacy accounts, must be reviewed before a public launch."
    ]
  },
  {
    "title": "8. Choices, deletion and retention",
    "body": [
      "Users can edit supported records and revoke sessions through available settings. Connected-service controls may allow disconnection; disconnecting is not necessarily deletion of previously imported records. The iPhone reset action removes the app\u2019s local profile data; it does not delete cloud accounts or existing device backups. A complete cloud-account deletion and export process, verified privacy contact, retention periods and backup deletion schedule remain launch requirements. This draft does not promise deletion capabilities or deadlines that are not implemented."
    ]
  },
  {
    "title": "9. Payments and physical products",
    "body": [
      "Configured subscription checkout may send necessary billing information to a payment processor. The gear collection is a concept preview with no product checkout. Any later sales flow must disclose the actual seller, processor, shipping recipients, taxes, returns and applicable warranty terms before accepting orders."
    ]
  },
  {
    "title": "10. Security, regional rights and changes",
    "body": [
      "No service can guarantee absolute security. The final notice must identify actual safeguards, applicable access/correction/deletion/appeal rights, any international transfers and a working contact. Data should be retained only for documented operational and legal purposes. Material changes must be communicated appropriately. A changed date alone does not authorize new sensitive-data uses."
    ]
  }
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
          by an attorney and will be replaced before MENTA is available to the general public. It describes the reviewed implementation and identifies remaining launch requirements.
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
