"use client";

import { ScrollText } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import type { AuditLogEntry, AuditEventType } from "@/features/admin/types/admin";

const DUMMY_ENTRIES: AuditLogEntry[] = [
  {
    id: "a1",
    type: "user_created",
    summary: "Tài khoản mới đăng ký",
    actor: "Phan Thành Tú",
    ip: "113.160.14.22",
    detail: "Ứng viên tuptse182945@fpt.edu.vn tạo tài khoản thành công.",
    timeLabel: "2 phút trước",
  },
  {
    id: "a2",
    type: "jd_generation",
    summary: "Sinh câu hỏi phỏng vấn",
    actor: "Nguyễn Trung Hiền",
    ip: "27.72.58.101",
    detail: "Tạo bộ câu hỏi 'Fullstack Developer' · 10 câu · Medium.",
    timeLabel: "14 phút trước",
  },
  {
    id: "a3",
    type: "recruiter_login",
    summary: "HR đăng nhập hệ thống",
    actor: "Hoàng Đăng Khoa",
    ip: "14.161.25.87",
    detail: "Đăng nhập thành công từ Chrome/Windows.",
    timeLabel: "31 phút trước",
  },
  {
    id: "a4",
    type: "admin_action",
    summary: "Phê duyệt tài khoản HR",
    actor: "Admin",
    ip: "192.168.1.1",
    detail: "Kích hoạt tài khoản testhr.khoa@gmail.com (HR Manager).",
    timeLabel: "1 giờ trước",
  },
  {
    id: "a5",
    type: "settings_change",
    summary: "Cập nhật cấu hình AI",
    actor: "Admin",
    ip: "192.168.1.1",
    detail: "Đổi mô hình từ gpt-3.5-turbo → gpt-4o, temperature 0.7.",
    timeLabel: "2 giờ trước",
  },
  {
    id: "a6",
    type: "export",
    summary: "Xuất báo cáo người dùng",
    actor: "Admin",
    ip: "192.168.1.1",
    detail: "Xuất danh sách 25 người dùng ra file CSV.",
    timeLabel: "3 giờ trước",
  },
  {
    id: "a7",
    type: "jd_generation",
    summary: "Sinh câu hỏi phỏng vấn",
    actor: "NGUYEN MINH NAM",
    ip: "117.4.252.33",
    detail: "Tạo bộ câu hỏi 'Senior Full-Stack Developer' · 8 câu · Hard.",
    timeLabel: "5 giờ trước",
  },
  {
    id: "a8",
    type: "user_created",
    summary: "Tài khoản mới đăng ký",
    actor: "Nguyễn Hiền",
    ip: "14.168.72.55",
    detail: "Ứng viên hien1245466@gmail.com tạo tài khoản thành công.",
    timeLabel: "6 giờ trước",
  },
];

const EVENT_BADGE: Record<AuditEventType, { bg: string; text: string; label: string }> = {
  user_created:    { bg: "bg-blue-100 dark:bg-blue-950/40",     text: "text-blue-600 dark:text-blue-400",     label: "Tạo TK"       },
  recruiter_login: { bg: "bg-gray-100 dark:bg-gray-800/60",     text: "text-gray-500 dark:text-gray-400",     label: "Đăng nhập"    },
  jd_generation:   { bg: "bg-violet-100 dark:bg-violet-950/40", text: "text-violet-600 dark:text-violet-400", label: "Sinh câu hỏi" },
  export:          { bg: "bg-emerald-100 dark:bg-emerald-950/40",text: "text-emerald-600 dark:text-emerald-400",label: "Xuất báo cáo"},
  settings_change: { bg: "bg-amber-100 dark:bg-amber-950/40",   text: "text-amber-600 dark:text-amber-400",   label: "Cài đặt"      },
  admin_action:    { bg: "bg-red-100 dark:bg-red-950/40",       text: "text-red-600 dark:text-red-400",       label: "Admin"        },
};

export function AdminAuditFeed() {
  return (
    <div className="hr-glass-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center shrink-0">
            <ScrollText size={14} className="text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h2 className={cn("text-sm font-bold leading-tight", portalHeadingAlt)}>Nhật ký kiểm toán</h2>
            <p className={cn("text-[11px] mt-0.5", portalSubtextAlt)}>Lịch sử bảo mật và tuân thủ</p>
          </div>
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">
          Demo
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">
              <th className={cn("text-left px-4 py-2.5 font-semibold whitespace-nowrap", portalSubtextAlt)}>Loại</th>
              <th className={cn("text-left px-4 py-2.5 font-semibold", portalSubtextAlt)}>Tóm tắt</th>
              <th className={cn("text-left px-4 py-2.5 font-semibold whitespace-nowrap", portalSubtextAlt)}>Người thực hiện</th>
              <th className={cn("text-left px-4 py-2.5 font-semibold whitespace-nowrap", portalSubtextAlt)}>IP</th>
              <th className={cn("text-left px-4 py-2.5 font-semibold", portalSubtextAlt)}>Chi tiết</th>
              <th className={cn("text-right px-4 py-2.5 font-semibold whitespace-nowrap", portalSubtextAlt)}>Thời gian</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {DUMMY_ENTRIES.map((row) => {
              const badge = EVENT_BADGE[row.type];
              return (
                <tr key={row.id} className="hr-table-row">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={cn("inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold", badge.bg, badge.text)}>
                      {badge.label}
                    </span>
                  </td>
                  <td className={cn("px-4 py-3 font-medium max-w-44 truncate", portalHeadingAlt)}>
                    {row.summary}
                  </td>
                  <td className={cn("px-4 py-3 whitespace-nowrap", portalSubtextAlt)}>{row.actor}</td>
                  <td className={cn("px-4 py-3 font-mono text-[11px] whitespace-nowrap", portalSubtextAlt)}>{row.ip}</td>
                  <td className={cn("px-4 py-3 text-[11px] max-w-72", portalSubtextAlt)}>{row.detail}</td>
                  <td className={cn("px-4 py-3 text-right whitespace-nowrap", portalSubtextAlt)}>{row.timeLabel}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
