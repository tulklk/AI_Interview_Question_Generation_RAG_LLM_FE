import { adminStats } from "@/data/admin";
import { StatCard } from "@/components/dashboard/stat-card";

export function AdminStatsGrid() {
  return (
    <div className="grid grid-cols-4 gap-4">
      {adminStats.map((stat, i) => (
        <div key={stat.id} className="animate-fade-up" style={{ animationDelay: `${i * 70}ms` }}>
          <StatCard stat={stat} />
        </div>
      ))}
    </div>
  );
}
