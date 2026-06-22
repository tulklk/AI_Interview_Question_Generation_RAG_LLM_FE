import { Box, MessageSquare, FileText, HelpCircle, Sparkles, CheckCircle2 } from "lucide-react";

interface Auth3DItem {
  className: string;
  size: number;
  idleDur: number;
  idleDelay: number;
  glowDur: number;
  gradient: string;
  glowColor: string;
  icon: React.ReactNode;
}

const items: Auth3DItem[] = [
  {
    className: "top-2 right-10",
    size: 76,
    idleDur: 9,
    idleDelay: 0,
    glowDur: 5,
    gradient: "linear-gradient(135deg, rgba(167,139,250,0.9), rgba(124,58,237,0.88))",
    glowColor: "rgba(167,139,250,0.55)",
    icon: <Box className="w-7 h-7 text-white/90" strokeWidth={1.75} />,
  },
  {
    className: "top-28 right-0",
    size: 60,
    idleDur: 11,
    idleDelay: 0.6,
    glowDur: 6,
    gradient: "linear-gradient(135deg, rgba(129,140,248,0.9), rgba(139,92,246,0.85))",
    glowColor: "rgba(129,140,248,0.5)",
    icon: <MessageSquare className="w-5 h-5 text-white/90" strokeWidth={1.75} />,
  },
  {
    className: "top-44 right-20",
    size: 68,
    idleDur: 13,
    idleDelay: 1.2,
    glowDur: 4.5,
    gradient: "linear-gradient(135deg, rgba(196,181,253,0.9), rgba(139,92,246,0.8))",
    glowColor: "rgba(196,181,253,0.5)",
    icon: <FileText className="w-6 h-6 text-white/90" strokeWidth={1.75} />,
  },
  {
    className: "top-4 right-44",
    size: 48,
    idleDur: 8,
    idleDelay: 0.9,
    glowDur: 5.5,
    gradient: "linear-gradient(135deg, rgba(252,211,77,0.9), rgba(251,146,60,0.8))",
    glowColor: "rgba(252,211,77,0.4)",
    icon: <HelpCircle className="w-5 h-5 text-white/90" strokeWidth={1.75} />,
  },
  {
    className: "top-64 right-2",
    size: 44,
    idleDur: 10,
    idleDelay: 1.6,
    glowDur: 4,
    gradient: "linear-gradient(135deg, rgba(237,233,254,0.95), rgba(167,139,250,0.75))",
    glowColor: "rgba(237,233,254,0.5)",
    icon: <Sparkles className="w-4 h-4 text-white/90" strokeWidth={1.75} />,
  },
  {
    className: "top-80 right-32",
    size: 52,
    idleDur: 14,
    idleDelay: 0.3,
    glowDur: 6,
    gradient: "linear-gradient(135deg, rgba(196,181,253,0.9), rgba(99,102,241,0.85))",
    glowColor: "rgba(167,139,250,0.45)",
    icon: <CheckCircle2 className="w-5 h-5 text-white/90" strokeWidth={1.75} />,
  },
];

export function Auth3DVisual() {
  return (
    <div className="auth-3d-visual hidden xl:block absolute top-10 right-6 w-80 h-[28rem] z-[5]" aria-hidden="true">
      {items.map((item, i) => (
        <div
          key={i}
          className={`auth-3d-item ${item.className}`}
          style={{
            width: item.size,
            height: item.size,
            ["--idle-dur" as string]: `${item.idleDur}s`,
            ["--idle-delay" as string]: `${item.idleDelay}s`,
            ["--glow-dur" as string]: `${item.glowDur}s`,
          }}
        >
          <div className="auth-3d-glow" style={{ background: item.glowColor }} />
          <div className="auth-3d-card" style={{ background: item.gradient }}>
            {item.icon}
          </div>
        </div>
      ))}
    </div>
  );
}
