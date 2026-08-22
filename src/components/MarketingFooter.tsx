import Link from "next/link";
import Image from "next/image";

export function MarketingFooter() {
  return (
    <footer className="border-t border-[var(--border)] px-6 md:px-10 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
      <Image
        src="/logo.png"
        alt="MENTA"
        width={863}
        height={194}
        className="h-5 w-auto"
        style={{ filter: "invert(1)" }}
        priority={false}
      />
      <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-text-2">
        <Link href="/faq" className="hover:text-text-1">FAQ</Link>
        <Link href="/trust" className="hover:text-text-1">Trust &amp; Safety</Link>
        <Link href="/privacy" className="hover:text-text-1">Privacy (draft)</Link>
        <Link href="/terms" className="hover:text-text-1">Terms (draft)</Link>
      </nav>
      <div className="mono text-text-3">© {new Date().getFullYear()} MENTA</div>
    </footer>
  );
}
