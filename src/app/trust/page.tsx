import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";

const SECTIONS = [
  {
    title: "Privacy",
    body: "Athletes and families own their data. We collect only what's needed to run the product — see the data model in our engineering docs. A full Privacy Policy is drafted internally and marked DRAFT — REQUIRES LEGAL REVIEW until an attorney signs off.",
  },
  {
    title: "Security",
    body: "Passwords are hashed (bcrypt), sessions are server-validated and revocable, and sensitive actions are audit-logged. Rate limiting is in place on auth and messaging endpoints. A full third-party security review has not yet been performed.",
  },
  {
    title: "Minors & consent",
    body: "Most MENTA users are minors. Accounts capture date of birth, and parent/guardian linking is part of the data model. Enforcement of parental consent flows required for under-13 users is not yet complete — treat this as in progress, not certified COPPA compliance.",
  },
  {
    title: "AI transparency",
    body: "MENTA AI only uses the data visible to the requesting user's own account — never another athlete's private data. It's instructed to say when it doesn't have information rather than invent it, and never to give medical clearance or guarantee recruiting outcomes.",
  },
  {
    title: "Reporting & blocking",
    body: "Every conversation supports blocking a user and filing a report (spam, harassment, safety concern, impersonation, other). Reports are logged for staff review; a dedicated moderation queue UI is not yet built.",
  },
  {
    title: "Accessibility",
    body: "Forms use labeled inputs and keyboard-navigable controls. A full accessibility audit (screen reader pass, contrast check, reduced-motion support) has not yet been completed.",
  },
  {
    title: "Legal documents",
    body: "Terms of Service and Privacy Policy are drafted internally alongside the product but are not yet published or attorney-reviewed. Nothing on this site should be read as a compliance certification for HIPAA, FERPA, COPPA, or NCAA rules.",
  },
  {
    title: "Contact",
    body: "Security or safety concern? Reach us before launch through the waitlist form — a dedicated security contact address will be published at launch.",
  },
];

export default function TrustPage() {
  return (
    <>
      <MarketingNav />
      <main className="px-6 md:px-10 pt-32 pb-20 max-w-2xl mx-auto">
        <div className="eyebrow justify-center flex mx-auto w-fit mb-2">Trust &amp; Safety</div>
        <h1 className="text-4xl font-semibold mb-4 text-center">How MENTA handles trust.</h1>
        <p className="text-text-2 text-sm text-center mb-10">
          We&rsquo;re pre-launch. This page is honest about what&rsquo;s built and what&rsquo;s still in progress —
          not a compliance certification.
        </p>
        <div className="space-y-4">
          {SECTIONS.map((s) => (
            <div key={s.title} className="card card-hover p-5">
              <div className="font-heading font-semibold mb-2">{s.title}</div>
              <p className="text-text-2 text-sm">{s.body}</p>
            </div>
          ))}
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
