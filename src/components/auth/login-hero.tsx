import { Bot, Timer, BarChart3 } from "lucide-react";

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
    <div className="flex flex-col h-full px-10 py-10 overflow-y-auto">
      <div>
        <h1
          className="text-4xl font-extrabold text-white leading-tight mb-3 animate-fade-up"
          style={{ animationDelay: "80ms" }}
        >
          Transform Job Descriptions
          <br />
          Into{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
            Perfect Interviews
          </span>
        </h1>

        <p
          className="text-white/70 text-sm leading-relaxed mb-8 max-w-sm animate-fade-up"
          style={{ animationDelay: "160ms" }}
        >
          Use AI to generate tailored, role-specific interview questions in seconds
          — from any job description.
        </p>

        <div className="space-y-3">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="flex items-start gap-3.5 bg-white/10 hover:bg-white/15 transition-colors rounded-lg px-4 py-3.5 animate-fade-up"
              style={{ animationDelay: `${240 + i * 80}ms` }}
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

      <div className="mt-6 space-y-3">
        {testimonials.map((t, i) => (
          <div
            key={t.name}
            className="bg-white/10 rounded-lg px-4 py-3.5 animate-fade-up"
            style={{ animationDelay: `${480 + i * 80}ms` }}
          >
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
