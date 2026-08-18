import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";

const FAQS = [
  {
    q: "Is MENTA free to join the beta?",
    a: "Yes. Beta access is free while we build out the full platform with early athletes, coaches, and families. Pricing for the full product hasn't been finalized.",
  },
  {
    q: "What age athletes is MENTA for?",
    a: "MENTA is built for middle school through college athletes. Any athlete under 18 needs a parent or guardian to approve their account.",
  },
  {
    q: "Is my data private?",
    a: "Film, performance data, and academic records belong to the athlete and family. We don't sell athlete data to third parties. Wellness check-ins and personal safety/medical info are treated as high-sensitivity data — private by default and never sent to AI or shown to teammates. See our Terms of Service and Privacy Policy — both are published drafts pending legal review.",
  },
  {
    q: "Does MENTA replace my current coach or tutor?",
    a: "No. MENTA is built to work alongside the people already coaching and supporting the athlete — it connects what they're doing, it doesn't replace them.",
  },
  {
    q: "Is the recruiting assistant allowed under NCAA rules?",
    a: "MENTA's recruiting tools are designed to work with publicly available information and help athletes organize outreach within NCAA contact-period rules. We haven't had this reviewed by an NCAA compliance attorney yet — treat this as a design intent, not a compliance guarantee.",
  },
  {
    q: "What's actually live right now?",
    a: "Accounts, profiles, teams, messaging, calendar, notifications, goals, training, performance, film, highlights, Recruiting, Recovery, Academics, and Safety are all real and functional today. Mindset (mental performance) is the one module still a labeled 'coming soon' placeholder. MENTA AI works when an administrator connects a provider — otherwise the app says so honestly instead of faking a response.",
  },
];

export default function FaqPage() {
  return (
    <>
      <MarketingNav />
      <main className="px-6 md:px-10 pt-32 pb-20 max-w-2xl mx-auto">
        <div className="eyebrow justify-center flex mx-auto w-fit mb-2">Questions</div>
        <h1 className="text-4xl font-semibold mb-10 text-center">Frequently asked.</h1>
        <div className="space-y-3">
          {FAQS.map((item) => (
            <details key={item.q} className="card card-hover p-5 group">
              <summary className="cursor-pointer font-medium list-none flex items-center justify-between">
                {item.q}
                <span className="text-text-3 group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="text-text-2 text-sm mt-3">{item.a}</p>
            </details>
          ))}
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
