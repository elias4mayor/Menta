"use client";

import { StateSelect } from "@/components/StateSelect";

/**
 * State/province field — now backed by the real global states/provinces
 * dataset (src/lib/data/states.json, ~4,936 entries across 195 countries)
 * via StateSelect, instead of the old US-only list. StateSelect itself
 * degrades honestly (a disabled, clearly-labeled field) for the one
 * country the real dataset has no divisions for.
 */
export function StateField({
  id,
  country,
  value,
  onChange,
}: {
  id?: string;
  country: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return <StateSelect id={id} country={country} value={value} onChange={onChange} />;
}
