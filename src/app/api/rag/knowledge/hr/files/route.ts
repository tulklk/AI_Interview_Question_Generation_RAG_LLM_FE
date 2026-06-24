import { type NextRequest, NextResponse } from "next/server";

const RAG_BASE = (process.env.NEXT_PUBLIC_RAG_BASE_URL ?? "https://iqgsrag.cloud").replace(/\/+$/, "");
const RAG_KEY = process.env.RAG_API_KEY ?? process.env.NEXT_PUBLIC_RAG_API_KEY ?? "";

export async function POST(req: NextRequest) {
  const owner_id = new URL(req.url).searchParams.get("owner_id") ?? "";
  const url = `${RAG_BASE}/api/v1/knowledge/hr/${encodeURIComponent(owner_id)}/files`;

  const headers: Record<string, string> = {};
  if (RAG_KEY) headers["X-Internal-Api-Key"] = RAG_KEY;

  try {
    const formData = await req.formData();
    const upstream = await fetch(url, { method: "POST", headers, body: formData });
    const text = await upstream.text();
    let json: unknown;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }
    return NextResponse.json(json, { status: upstream.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
