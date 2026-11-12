import Link from "next/link";
import { MarketingNav } from "@/components/MarketingNav";
import { MarketingFooter } from "@/components/MarketingFooter";
import catalog from "@/lib/data/products.json";
import { KitCheck } from "@/components/KitCheck";

export const metadata = { title: "MENTA Gear — Built around your game" };

export default function GearPage() {
  return <>
    <MarketingNav />
    <main className="mx-auto max-w-6xl px-6 pt-36 pb-24">
      <p className="mono text-text-3 mb-6">MENTA / THE COLLECTION</p>
      <h1 className="text-5xl md:text-7xl font-semibold tracking-tight max-w-3xl">Built around<br />your game.</h1>
      <p className="text-text-2 mt-6 max-w-xl text-lg">Equipment, apparel and small details that belong in an athlete’s everyday routine.</p>
      <p className="text-text-3 text-sm mt-4">Collection preview. These concepts are not available to order. Prices and release dates have not been announced.</p>
      <div className="grid md:grid-cols-2 gap-5 mt-12">
        {catalog.products.map((product, index) => <article key={product.id} id={product.id} className="card p-7 flex flex-col gap-4">
          <div className="flex justify-between items-center gap-4"><span className="mono text-text-3">0{index + 1} / {product.category}</span><span className="text-xs rounded-full border border-[var(--border)] px-3 py-1">{product.status}</span></div>
          <h2 className="text-2xl font-semibold">{product.name}</h2>
          <p className="text-text-2">{product.summary}</p>
          <p className="mono text-text-3">{product.colors.join(" · ")}</p>
          <details className="text-sm mt-auto"><summary className="cursor-pointer py-2">Development details</summary><p className="text-text-2 pt-2">{product.detail}</p></details>
        </article>)}
      </div>
      <section className="mt-16" aria-labelledby="kit-heading">
        <p className="mono text-text-3">YOUR NEXT SESSION</p>
        <h2 id="kit-heading" className="text-3xl font-semibold mt-3 mb-6">Pack. Check. Go.</h2>
        <KitCheck />
      </section>
      <p className="text-text-3 text-sm mt-10">Read our <Link className="underline" href="/terms">terms draft</Link> and <Link className="underline" href="/privacy">privacy draft</Link>.</p>
    </main>
    <MarketingFooter />
  </>;
}
