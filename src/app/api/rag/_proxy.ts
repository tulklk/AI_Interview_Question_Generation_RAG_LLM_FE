// Shared helper: forward a JSON request to the RAG service server-side (no CORS).
import { NextResponse } from "next/server";

const RAG_BASE = (process.env.NEXT_PUBLIC_RAG_BASE_URL ?? "https://iqgsrag.cloud").replace(/\/+$/, "");
const RAG_KEY = process.env.RAG_API_KEY ?? process.env.NEXT_PUBLIC_RAG_API_KEY ?? "";

export async function proxyToRag(ragPath: string, body: unknown): Promise<NextResponse> {
  const url = `${RAG_BASE}${ragPath}`;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (RAG_KEY) headers["X-Internal-Api-Key"] = RAG_KEY;

  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const text = await upstream.text();
    let json: unknown;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }

    return NextResponse.json(json, { status: upstream.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
