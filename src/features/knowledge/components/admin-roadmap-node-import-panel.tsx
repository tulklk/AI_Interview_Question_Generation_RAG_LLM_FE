"use client";

import { useState } from "react";
import { apiClient } from "@/core/api/http-client";
import { useLanguage } from "@/shared/providers/language-context";

/** Tab import curated roadmap JSONL trên Admin Knowledge (SYSTEM/Roadmap). */
export function AdminRoadmapNodeImportPanel() {
  const { t } = useLanguage();
  const kb = t.knowledgePage;
  const [text, setText] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setResult(null);
    try {
      const res = await apiClient.post("/api/admin/roadmap-nodes/import-jsonl", text, {
        headers: { "Content-Type": "text/plain" },
      });
      setResult(JSON.stringify(res.data?.data ?? res.data, null, 2));
    } catch (e) {
      // SCRUM-474: thông báo lỗi theo ngôn ngữ UI
      setResult(e instanceof Error ? e.message : kb.roadmapImportFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-violet-200 dark:border-violet-800/50 p-3 space-y-2">
      <p className="text-[12px] font-semibold">Import roadmap nodes (JSONL)</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        className="w-full text-[11px] font-mono rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2"
        placeholder='{"kind":"roadmap","roleKey":"...","level":"Junior","skill":"...","topic":"..."}'
      />
      <button
        type="button"
        disabled={busy || !text.trim()}
        onClick={() => void submit()}
        className="h-8 px-3 rounded-lg text-[12px] font-semibold bg-violet-600 text-white disabled:opacity-50"
      >
        {busy ? "Đang import…" : "Import JSONL"}
      </button>
      {result && <pre className="text-[10px] overflow-auto max-h-32">{result}</pre>}
    </div>
  );
}
