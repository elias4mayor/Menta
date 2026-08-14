import Link from "next/link";

export function MarketingNav() {
  return (
    <header className="flex items-center justify-between px-6 md:px-10 py-5 border-b border-[var(--border)]">
      <Link href="/" className="font-heading font-semibold text-lg tracking-tight">
        MENTA
      </Link>
      <nav className="flex items-center gap-6">
        <Link href="/faq" className="hidden sm:inline text-sm text-text-2 hover:text-text-1">
          FAQ
        </Link>
        <Link href="/login" className="text-sm text-text-2 hover:text-text-1">
          Log in
        </Link>
        <Link href="/signup" className="btn-primary">
          Join Beta
        </Link>
      </nav>
    </header>
  );
}
