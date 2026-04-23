import { stats } from "@/data/dashboard";
import { StatCard } from "./stat-card";

export function StatsGrid() {
  return (
    <div className="grid grid-cols-4 gap-4">
      {stats.map((stat) => (
        <StatCard key={stat.id} stat={stat} />
      ))}
    </div>
  );
}
