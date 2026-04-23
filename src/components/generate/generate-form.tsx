"use client";

import { useState } from "react";
import { JdInputCard } from "./jd-input-card";
import { FileUploadArea } from "./file-upload-area";
import { ConfigurationSection } from "./configuration-section";
import { GeneratingProgress } from "./generating-progress";
import type { GenerateView } from "@/types/generate";

export function GenerateForm() {
  const [view, setView] = useState<GenerateView>("form");
  const [jdText, setJdText] = useState("");
  const [role, setRole] = useState("");
  const [level, setLevel] = useState("");
  const [questionCount, setQuestionCount] = useState("15");

  if (view === "generating") {
    return <GeneratingProgress />;
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="space-y-3">
        <div className="animate-fade-up">
          <JdInputCard value={jdText} onChange={setJdText} />
        </div>
        <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
          <FileUploadArea />
        </div>
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "160ms" }}>
        <ConfigurationSection
          role={role}
          level={level}
          questionCount={questionCount}
          jdText={jdText}
          onRoleChange={setRole}
          onLevelChange={setLevel}
          onCountChange={setQuestionCount}
          onSubmit={() => setView("generating")}
        />
      </div>
    </div>
  );
}
