import { stats } from "@/data/dashboard";
import { StatCard } from "./stat-card";

export function StatsGrid() {
  return (
    <div className="grid grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <div key={stat.id} className="animate-fade-up" style={{ animationDelay: `${i * 70}ms` }}>
          <StatCard stat={stat} />
        </div>
      ))}
    </div>
  );
}
