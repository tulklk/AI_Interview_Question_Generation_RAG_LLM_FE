"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Edit2, Save, X, Plus, Target, BookOpen, Trophy, TrendingUp, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { achievements, practiceSessions } from "@/data/jobseeker";
import { useLanguage } from "@/context/language-context";

const INPUT_CLASS =
  "w-full text-[13px] text-[#111827] placeholder:text-[#9CA3AF] bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 outline-none transition-all focus:border-primary focus:shadow-[0_0_0_3px_rgba(108,71,255,0.1)]";

const INITIAL_SKILLS = ["React", "TypeScript", "Next.js", "Node.js", "Tailwind CSS", "PostgreSQL"];

export function CandidateProfile() {
  const { t } = useLanguage();
  const p = t.jobseekerProfilePage;

  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(
    "Frontend developer with 3+ years of experience building scalable SaaS products. Passionate about performance optimization and clean UI design. Targeting senior roles at top-tier tech companies."
  );
  const [targetRole, setTargetRole] = useState("Senior Frontend Developer");
  const [skills, setSkills] = useState(INITIAL_SKILLS);
  const [skillInput, setSkillInput] = useState("");

  const avgScore = Math.round(practiceSessions.reduce((a, s) => a + s.score, 0) / practiceSessions.length);
  const bestScore = Math.max(...practiceSessions.map((s) => s.score));

  function addSkill() {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) setSkills((prev) => [...prev, s]);
    setSkillInput("");
  }

  const profileStats = [
    { icon: BookOpen, label: p.stats.sessions, value: practiceSessions.length.toString(), color: "text-blue-500", bg: "bg-blue-50" },
    { icon: TrendingUp, label: p.stats.avgScore, value: `${avgScore}%`, color: "text-violet-500", bg: "bg-violet-50" },
    { icon: Trophy, label: p.stats.bestScore, value: `${bestScore}%`, color: "text-amber-500", bg: "bg-amber-50" },
    { icon: Flame, label: p.stats.streak, value: "7 days", color: "text-emerald-500", bg: "bg-emerald-50" },
  ];

  return (
    <div className="grid grid-cols-[300px_1fr] gap-6 items-start">
      {/* ── Left: Avatar + stats ──────────────────────────────────── */}
      <div className="flex flex-col gap-5">
        {/* Profile card */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-xl p-6 flex flex-col items-center text-center"
          style={{ boxShadow: "rgba(0,0,0,0.08) 0px 4px 6px -1px, rgba(0,0,0,0.06) 0px 2px 4px -2px" }}
        >
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center mb-4">
            <span className="text-white text-2xl font-[800]">AJ</span>
          </div>
          <h2 className="text-[18px] font-[700] text-[#111827]">Alex Johnson</h2>
          <p className="text-[13px] text-[#6B7280] mt-1">alex@example.com</p>

          {/* Target role */}
          <div className="flex items-center gap-1.5 mt-3 bg-[#F5F3FF] rounded-full px-3 py-1.5">
            <Target size={12} className="text-primary" />
            <span className="text-[12px] font-[600] text-primary">{targetRole}</span>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3 w-full mt-5">
            {profileStats.map((s) => (
              <div key={s.label} className="bg-[#F9FAFB] rounded-lg p-3 text-center">
                <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center mx-auto mb-1.5", s.bg)}>
                  <s.icon size={13} className={s.color} />
                </div>
                <p className="text-[16px] font-[700] text-[#111827] leading-none">{s.value}</p>
                <p className="text-[11px] text-[#6B7280] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Achievements */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl p-5"
          style={{ boxShadow: "rgba(0,0,0,0.08) 0px 4px 6px -1px, rgba(0,0,0,0.06) 0px 2px 4px -2px" }}
        >
          <h3 className="text-[14px] font-[700] text-[#111827] mb-4">{p.achievements}</h3>
          <div className="grid grid-cols-3 gap-2">
            {achievements.map((ach) => (
              <div
                key={ach.id}
                title={ach.description}
                className={cn(
                  "flex flex-col items-center text-center p-2 rounded-lg transition-all",
                  ach.earned
                    ? "bg-[#F5F3FF] cursor-default"
                    : "bg-gray-50 opacity-40 grayscale"
                )}
              >
                <span className="text-2xl leading-none mb-1">{ach.icon}</span>
                <p className="text-[10px] font-[600] text-[#111827] leading-tight">{ach.title}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-[#6B7280] mt-3 text-center">
            {achievements.filter((a) => a.earned).length}/{achievements.length} {p.earned}
          </p>
        </motion.div>
      </div>

      {/* ── Right: Editable info ──────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex flex-col gap-5"
      >
        {/* Edit header */}
        <div className="flex items-center justify-between">
          <h1 className="text-[24px] font-[800] text-[#111827]">{p.heading}</h1>
          {editing ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditing(false)}
                className="flex items-center gap-1.5 h-[34px] px-4 text-[12px] font-[600] text-[#6B7280] hover:text-[#111827] border border-[#E5E7EB] bg-white hover:bg-gray-50 rounded-lg transition-colors"
              >
                <X size={13} />
                {p.cancelBtn}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="flex items-center gap-1.5 h-[34px] px-4 text-[12px] font-[600] text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors"
              >
                <Save size={13} />
                {p.saveBtn}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 h-[34px] px-4 text-[12px] font-[600] text-[#111827] border border-[#E5E7EB] bg-white hover:bg-gray-50 rounded-lg transition-colors"
            >
              <Edit2 size={13} />
              {p.editBtn}
            </button>
          )}
        </div>

        {/* Bio */}
        <div className="bg-white rounded-xl p-6"
          style={{ boxShadow: "rgba(0,0,0,0.08) 0px 4px 6px -1px, rgba(0,0,0,0.06) 0px 2px 4px -2px" }}
        >
          <label className="block text-[14px] font-[700] text-[#111827] mb-3">{p.bio}</label>
          {editing ? (
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={p.bioPlaceholder}
              rows={4}
              className={cn(INPUT_CLASS, "resize-none min-h-[100px]")}
            />
          ) : (
            <p className="text-[14px] text-[#6B7280] leading-[22px]">{bio}</p>
          )}
        </div>

        {/* Target Role */}
        <div className="bg-white rounded-xl p-6"
          style={{ boxShadow: "rgba(0,0,0,0.08) 0px 4px 6px -1px, rgba(0,0,0,0.06) 0px 2px 4px -2px" }}
        >
          <label className="block text-[14px] font-[700] text-[#111827] mb-3">{p.targetRole}</label>
          {editing ? (
            <input
              type="text"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder={p.targetRolePlaceholder}
              className={INPUT_CLASS}
            />
          ) : (
            <div className="flex items-center gap-2">
              <Target size={14} className="text-primary" />
              <span className="text-[14px] font-[600] text-[#111827]">{targetRole}</span>
            </div>
          )}
        </div>

        {/* Skills */}
        <div className="bg-white rounded-xl p-6"
          style={{ boxShadow: "rgba(0,0,0,0.08) 0px 4px 6px -1px, rgba(0,0,0,0.06) 0px 2px 4px -2px" }}
        >
          <label className="block text-[14px] font-[700] text-[#111827] mb-4">{p.skills}</label>
          <div className="flex flex-wrap gap-2 mb-4">
            {skills.map((skill) => (
              <span key={skill}
                className="flex items-center gap-1.5 bg-[#F5F7FB] text-[#111827] text-[12px] font-[500] px-3 py-1.5 rounded-[6px]"
              >
                {skill}
                {editing && (
                  <button onClick={() => setSkills((prev) => prev.filter((s) => s !== skill))}
                    className="text-gray-400 hover:text-red-500 transition-colors ml-0.5"
                  >
                    <X size={11} />
                  </button>
                )}
              </span>
            ))}
          </div>
          {editing && (
            <div className="flex gap-2">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSkill()}
                placeholder={p.skillPlaceholder}
                className={cn(INPUT_CLASS, "flex-1")}
              />
              <button
                onClick={addSkill}
                disabled={!skillInput.trim()}
                className="flex items-center gap-1.5 h-[38px] px-4 text-[12px] font-[600] text-white bg-primary hover:bg-primary-hover disabled:opacity-40 rounded-lg transition-colors shrink-0"
              >
                <Plus size={13} />
                {p.addSkill}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
