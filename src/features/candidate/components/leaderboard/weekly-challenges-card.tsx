"use client";

import { Trophy } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalCard } from "@/shared/utils/portal-ui";

export function WeeklyChallengesCard() {
  return (
    <section className={cn(portalCard, "p-6 shadow-sm")}>
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center shrink-0">
          <Trophy size={18} className="text-amber-500" />
        </div>
        <h2 className="text-base font-bold text-[#111827] dark:text-gray-100">
          Thi đua luyện tập mỗi tuần
        </h2>
      </div>

      {/* Explanation */}
      <div className="space-y-3 text-sm text-[#6B7280] dark:text-gray-300 leading-relaxed">
        <p>
          Bảng xếp hạng biến việc luyện tập phỏng vấn thành một cuộc thi nhẹ nhàng và đầy động lực.
          Mỗi tuần, top ứng viên có XP cao nhất được vinh danh, nhờ đó bạn có thêm lý do để luyện tập
          đều đặn thay vì để kỹ năng bị mai một.
        </p>
        <p>
          Bên cạnh bảng xếp hạng tuần, HireGen còn có hệ thống liên đoàn từ Đồng, Bạc, Vàng, Bạch kim
          đến Kim cương. Bạn thi đua với những người cùng bậc — nhóm dẫn đầu thăng hạng lên liên đoàn
          cao hơn, còn nhóm cuối bảng có thể rớt xuống — một vòng cạnh tranh công bằng và hấp dẫn.
        </p>
        <p>
          Mọi hoạt động luyện tập đều cộng XP: hoàn thành phiên thử, đạt điểm cao, duy trì chuỗi hàng
          ngày hay hoàn thành lộ trình. Bảng và liên đoàn reset vào 00:00 UTC Thứ Hai mỗi tuần, nên ai
          cũng có cơ hội làm lại từ đầu. Hãy biến áp lực thi đua thành thói quen luyện tập phỏng vấn
          mỗi ngày.
        </p>
      </div>
    </section>
  );
}
