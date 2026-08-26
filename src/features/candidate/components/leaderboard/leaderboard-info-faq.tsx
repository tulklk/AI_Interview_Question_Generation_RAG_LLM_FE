"use client";

import { useState } from "react";
import { HelpCircle, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";
import { portalCard } from "@/shared/utils/portal-ui";

const FAQ_ITEMS = [
  {
    q: "Bảng xếp hạng được tính như thế nào?",
    a: "XP được tích lũy từ các phiên luyện tập, kết quả phỏng vấn thử, chuỗi luyện tập hàng ngày và tiến độ lộ trình học. Tổng XP quyết định thứ hạng dài hạn, còn tab Tuần này chỉ tính XP kiếm được trong 7 ngày gần nhất.",
  },
  {
    q: "Làm sao để kiếm thêm XP?",
    a: "Hoàn thành phiên luyện tập (+100 XP), đạt điểm cao: ≥70 (+20 XP), ≥80 (+40 XP), ≥90 (+70 XP bonus); duy trì chuỗi hàng ngày (+10 XP/ngày); hoàn thành thử thách tuần và tiến trình lộ trình (+50 XP).",
  },
  {
    q: "Chuỗi luyện tập được tính như thế nào?",
    a: "Bạn cần hoàn thành ít nhất 1 phiên luyện tập mỗi ngày để duy trì chuỗi. Bỏ qua 1 ngày sẽ mất chuỗi. Chuỗi được tính theo ngày dương lịch (00:00–23:59 giờ Việt Nam).",
  },
  {
    q: "Khi nào bảng xếp hạng và liên đoàn được reset?",
    a: "Bảng xếp hạng tuần và liên đoàn làm mới vào 00:00 UTC Thứ Hai mỗi tuần. XP tổng và chuỗi ngày không bị reset — chỉ XP tuần về 0 mỗi chu kỳ mới.",
  },
  {
    q: "XP có ảnh hưởng đến kết quả tuyển dụng không?",
    a: "Không. XP và bảng xếp hạng chỉ phục vụ mục đích luyện tập và tạo động lực cá nhân. Đây không phải điểm tuyển dụng chính thức và không được chia sẻ với nhà tuyển dụng.",
  },
];

// ── Single accordion item ───────────────────────────────────────────────────
function FaqItem({
  item,
  isOpen,
  onToggle,
  index,
}: {
  item: (typeof FAQ_ITEMS)[0];
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, delay: index * 0.07 }}
      className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden"
    >
      <button
        type="button"
        className={cn(
          "w-full flex items-center gap-3 px-4 py-4 text-left",
          "hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
        )}
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-xs font-bold text-primary dark:text-[#a78bff]">
          Q
        </span>
        <span className="flex-1 text-sm font-medium text-[#111827] dark:text-gray-100 text-left">
          {item.q}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.22, ease: "easeInOut" }}
          className="shrink-0"
        >
          <ChevronDown size={16} className="text-[#9CA3AF] dark:text-gray-500" />
        </motion.div>
      </button>

      {/* Smooth height animation */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <p className="px-4 pb-4 pt-1 text-sm text-[#6B7280] dark:text-gray-300 leading-relaxed border-t border-gray-50 dark:border-gray-800">
              {item.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────
export function LeaderboardInfoFaq() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className={cn(portalCard, "p-5 shadow-sm")}
    >
      <div className="flex items-center gap-2 mb-4">
        <HelpCircle size={16} className="text-primary dark:text-[#a78bff] shrink-0" />
        <h2 className="text-sm font-bold text-[#111827] dark:text-gray-100">
          Câu hỏi thường gặp
        </h2>
      </div>

      <div className="flex flex-col gap-2">
        {FAQ_ITEMS.map((item, idx) => (
          <FaqItem
            key={idx}
            item={item}
            index={idx}
            isOpen={openIdx === idx}
            onToggle={() => setOpenIdx(openIdx === idx ? null : idx)}
          />
        ))}
      </div>
    </motion.section>
  );
}
