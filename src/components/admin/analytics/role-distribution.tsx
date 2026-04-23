import { roleDistribution } from "@/data/admin";

export function RoleDistribution() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col animate-fade-up">
      <div className="mb-5">
        <h3 className="text-base font-semibold text-gray-900">User Role Distribution</h3>
        <p className="text-xs text-gray-400 mt-0.5">Breakdown by account type</p>
      </div>

      <div className="space-y-5">
        {roleDistribution.map((item) => {
          const pct = Math.round((item.count / item.total) * 100);
          return (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${item.color} inline-block`} />
                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{item.count} users</span>
                  <span className="text-sm font-bold text-gray-700">{pct}%</span>
                </div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${item.color}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-between">
        <span className="text-sm text-gray-500">Total registered users</span>
        <span className="text-xl font-bold text-gray-900">142</span>
      </div>
    </div>
  );
}
