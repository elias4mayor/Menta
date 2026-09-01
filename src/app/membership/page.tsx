import Link from "next/link";
import Image from "next/image";
import { getSessionUser } from "@/lib/session";
import { resolveMembershipTiers } from "@/lib/membership";
import { MembershipExperience } from "@/components/MembershipExperience";

export default async function MembershipPage() {
  const user = await getSessionUser();
  const tiers = await resolveMembershipTiers(user?.id ?? null);

  return (
    <div className="live-root" style={{ position: "relative" }}>
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 24px",
        }}
      >
        <Link href="/" aria-label="MENTA home">
          <Image src="/logo.png" alt="MENTA" width={863} height={194} className="h-6 w-auto" style={{ filter: "invert(1)" }} />
        </Link>
        {!user && (
          <Link href="/login" className="live-ghost-btn">
            Log in
          </Link>
        )}
      </header>

      <MembershipExperience tiers={tiers} isSignedIn={Boolean(user)} />
    </div>
  );
}
