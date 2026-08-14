import { requireUser } from "@/lib/auth-guards";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { SessionsList } from "@/components/SessionsList";
import { GuardianLinks } from "@/components/GuardianLinks";

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <div className="mono text-text-3 mb-2">Settings</div>
        <h1 className="text-3xl font-semibold">Account</h1>
      </div>

      <section className="card p-6">
        <div className="mono text-text-3 mb-4">Account</div>
        <div className="space-y-1 text-sm">
          <div><span className="text-text-2">Name:</span> {user.name}</div>
          <div><span className="text-text-2">Email:</span> {user.email}</div>
          <div><span className="text-text-2">Role:</span> {user.role}</div>
        </div>
      </section>

      <section className="card p-6">
        <div className="mono text-text-3 mb-4">Change password</div>
        <ChangePasswordForm />
      </section>

      <section className="card p-6">
        <div className="mono text-text-3 mb-4">Active sessions</div>
        <SessionsList />
      </section>

      <section className="card p-6">
        <div className="mono text-text-3 mb-4">Family & guardians</div>
        <GuardianLinks role={user.role} />
      </section>

      <section className="card p-6">
        <div className="mono text-text-3 mb-4">Notifications</div>
        <span className="badge badge-demo">Not yet implemented</span>
        <p className="text-text-2 text-sm mt-3">
          In-app notifications are live. Email and push notification preferences require an
          email provider and push service to be connected — see the README for required
          environment variables.
        </p>
      </section>

      <section className="card p-6">
        <div className="mono text-text-3 mb-4">Privacy & data</div>
        <span className="badge badge-demo">Not yet implemented</span>
        <p className="text-text-2 text-sm mt-3">
          Account data export and deletion requests aren&rsquo;t wired up yet in this phase.
          Your profile visibility can be managed from your{" "}
          <a href="/profile" className="underline">profile</a> page.
        </p>
      </section>
    </div>
  );
}
