import catalog from "@/lib/data/products.json";

export function GET() {
  return Response.json(catalog, { headers: { "Cache-Control": "public, max-age=300" } });
}
