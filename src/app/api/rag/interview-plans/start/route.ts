import { type NextRequest, NextResponse } from "next/server";

const RAG_BASE = (process.env.NEXT_PUBLIC_RAG_BASE_URL ?? "https://iqgsrag.cloud").replace(/\/+$/, "");
const RAG_KEY  = process.env.RAG_API_KEY ?? process.env.NEXT_PUBLIC_RAG_API_KEY ?? "";

function ragHeaders(extra?: Record<string, string>): Record<string, string> {
  const h: Record<string, string> = {};
  if (RAG_KEY) h["X-Internal-Api-Key"] = RAG_KEY;
  return { ...h, ...extra };
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const {
    jd_text,
    owner_id = "anonymous",
    session_id,
    num_questions,
    question_types,
    focus_skills,
    additional_notes,
  } = body as {
    jd_text?: string;
    owner_id?: string;
    session_id?: string;
    num_questions?: number;
    question_types?: string[];
    focus_skills?: string;
    additional_notes?: string;
  };

  // Step 1: If inline JD text is provided, upload it to HR knowledge base first.
  // RAG v1 /interview-plans/start does NOT accept jd_text inline — JD must be pre-ingested.
  if (jd_text && jd_text.trim().length > 0) {
    const filename = `jd_inline_${Date.now()}.txt`;
    const blob = new Blob([jd_text], { type: "text/plain" });
    const form = new FormData();
    form.append("files", blob, filename);

    const uploadUrl = `${RAG_BASE}/api/v1/knowledge/hr/${encodeURIComponent(owner_id)}/files`;
    try {
      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        headers: ragHeaders(),
        body: form,
      });
      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        console.warn("[rag/start] JD upload failed:", uploadRes.status, errText.substring(0, 200));
        // If 422 (validation), return error immediately so user knows JD is invalid
        if (uploadRes.status === 422) {
          let detail = "JD không hợp lệ. Vui lòng nhập đủ nội dung (ít nhất 80 từ / 400 ký tự).";
          try {
            const parsed = JSON.parse(errText);
            if (parsed?.error?.message) detail = parsed.error.message;
          } catch { /* ignore */ }
          return NextResponse.json(
            { success: false, error: { code: "JD_INVALID", message: detail }, data: {}, meta: {} },
            { status: 422 }
          );
        }
        // Other errors: continue — RAG may still have previous JD for this owner
      }
    } catch (err) {
      console.warn("[rag/start] JD upload error:", err);
    }
  }

  // Step 2: Build start payload with extra context fields RAG accepts
  const startPayload: Record<string, unknown> = { owner_id };
  if (session_id) startPayload.session_id = session_id;
  if (num_questions) startPayload.num_questions = num_questions;
  if (question_types?.length) startPayload.question_types = question_types;
  if (focus_skills) startPayload.focus_skills = focus_skills;
  if (additional_notes) startPayload.additional_notes = additional_notes;

  // Step 3: Call /api/v1/interview-plans/start
  const startUrl = `${RAG_BASE}/api/v1/interview-plans/start`;
  try {
    const upstream = await fetch(startUrl, {
      method: "POST",
      headers: ragHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(startPayload),
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
