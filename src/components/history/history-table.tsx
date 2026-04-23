import Link from "next/link";
import { FileText, Calendar, ArrowUpDown, Eye, Download, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { historySessions } from "@/data/history";

function ColumnHeader({ label }: { label: string }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown size={11} className="text-gray-300" />
      </div>
    </th>
  );
}

export function HistoryTable() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fade-up">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-100">
          <tr>
            <ColumnHeader label="Job Title" />
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Level</th>
            <ColumnHeader label="Date" />
            <ColumnHeader label="Questions" />
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {historySessions.map((session) => (
            <tr key={session.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                    <FileText size={13} className="text-gray-400" />
                  </div>
                  <span className="font-medium text-gray-800">{session.title}</span>
                </div>
              </td>
              <td className="px-4 py-3.5">
                <span
                  className={cn(
                    "text-xs font-semibold px-2 py-0.5 rounded-md",
                    session.roleBg,
                    session.roleColor
                  )}
                >
                  {session.role}
                </span>
              </td>
              <td className="px-4 py-3.5">
                <span
                  className={cn(
                    "text-xs font-semibold px-2 py-0.5 rounded-md",
                    session.levelBg,
                    session.levelColor
                  )}
                >
                  {session.level}
                </span>
              </td>
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-1.5 text-gray-500">
                  <Calendar size={13} className="text-gray-300 shrink-0" />
                  {session.date}
                </div>
              </td>
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#6c47ff] rounded-full"
                      style={{
                        width: `${(session.questionsCount / session.maxQuestions) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-600">
                    {session.questionsCount}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3.5">
                <div className="flex items-center justify-end gap-1">
                  <Link
                    href={`/history/${session.id}`}
                    className="p-1.5 text-gray-400 hover:text-[#6c47ff] hover:bg-indigo-50 rounded-lg transition-colors inline-flex"
                  >
                    <Eye size={14} />
                  </Link>
                  <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                    <Download size={14} />
                  </button>
                  <button className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
