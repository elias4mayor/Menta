"use client";

import { useState } from "react";

const ITEMS = ["Water bottle", "Sport footwear", "Training clothes", "Required protective gear", "Team equipment", "Travel essentials"];

export function KitCheck() {
  const [checked, setChecked] = useState<string[]>([]);
  return <div className="card p-6 max-w-xl">
    <p className="text-3xl font-semibold" role="status" aria-live="polite">{checked.length} / {ITEMS.length} packed</p>
    <p className="text-text-2 text-sm mt-2 mb-5">A quick packing check. Confirm your sport’s requirements with your coach. This list resets when you leave the page.</p>
    <div className="space-y-3">{ITEMS.map((item) => <label key={item} className="flex items-center gap-3 py-2 cursor-pointer">
      <input type="checkbox" checked={checked.includes(item)} onChange={(event) => {
        const selected = event.target.checked;
        setChecked((previous) => selected ? [...previous, item] : previous.filter((value) => value !== item));
      }} className="h-5 w-5 accent-white" />
      <span>{item}</span>
    </label>)}</div>
    <button type="button" className="btn-secondary mt-5" onClick={() => setChecked([])} disabled={!checked.length}>Reset checklist</button>
  </div>;
}
