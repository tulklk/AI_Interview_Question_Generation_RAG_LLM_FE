import { Zap, Bot, Timer, BarChart3 } from "lucide-react";

const features = [
  {
    icon: Bot,
    title: "RAG-Powered AI",
    description: "Questions grounded in your JD via retrieval-augmented generation",
  },
  {
    icon: Timer,
    title: "30-Second Turnaround",
    description: "Instant role-specific questions across all competency levels",
  },
  {
    icon: BarChart3,
    title: "Rich Analytics",
    description: "Track usage, categories, and hiring pipeline progress",
  },
];

const testimonials = [
  {
    quote: "Cut our interview prep time by 80%. Incredible tool.",
    name: "Sarah K.",
    role: "Talent Manager @ Meta",
    initials: "S",
  },
  {
    quote: "The questions are remarkably tailored to each role.",
    name: "James L.",
    role: "Head of HR @ Stripe",
    initials: "J",
  },
];

export function LoginHero() {
  return (
    <div className="flex flex-col justify-between h-full px-10 py-10 overflow-y-auto">
      <div>
        <div className="flex items-center gap-3 mb-10">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Zap size={18} className="text-white" fill="white" />
          </div>
          <div>
            <p className="text-white font-bold text-[15px] leading-tight">
              InterviewAI
            </p>
            <p className="text-white/60 text-[11px] leading-tight">
              Powered by GPT-4 + RAG
            </p>
          </div>
        </div>

        <h1 className="text-4xl font-extrabold text-white leading-tight mb-3">
          Transform Job Descriptions
          <br />
          Into{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
            Perfect Interviews
          </span>
        </h1>

        <p className="text-white/70 text-sm leading-relaxed mb-8 max-w-sm">
          Use AI to generate tailored, role-specific interview questions in seconds
          — from any job description.
        </p>

        <div className="space-y-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="flex items-start gap-3.5 bg-white/10 hover:bg-white/15 transition-colors rounded-xl px-4 py-3.5"
            >
              <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0 mt-0.5">
                <f.icon size={15} className="text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{f.title}</p>
                <p className="text-white/60 text-xs mt-0.5 leading-relaxed">
                  {f.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 space-y-3">
        {testimonials.map((t) => (
          <div key={t.name} className="bg-white/10 rounded-xl px-4 py-3.5">
            <p className="text-white/85 text-sm leading-relaxed">
              &ldquo;{t.quote}&rdquo;
            </p>
            <div className="flex items-center gap-2.5 mt-2.5">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-bold">{t.initials}</span>
              </div>
              <div>
                <p className="text-white text-xs font-semibold leading-tight">
                  {t.name}
                </p>
                <p className="text-white/50 text-[11px] leading-tight">{t.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
