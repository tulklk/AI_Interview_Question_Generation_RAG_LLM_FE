"use client";

import { useState } from "react";
import { Zap, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";
import type { RankedUser, LeaderboardTab } from "@/features/candidate/data/leaderboard-dummy";

const INITIAL_VISIBLE = 7;

// ── Row animation ───────────────────────────────────────────────────────────
// ease as bezier array to satisfy Framer Motion v12 strict types
const EASE_OUT = [0.25, 0.46, 0.45, 0.94] as const;

const rowVariants = {
  hidden: { opacity: 0, x: -16 },
  show:   (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.28, ease: EASE_OUT, delay: i * 0.04 },
  }),
  exit:   { opacity: 0, x: 8, transition: { duration: 0.15 } },
};

// ── Rank circle ─────────────────────────────────────────────────────────────
function RankCircle({ rank, highlight }: { rank: number; highlight?: boolean }) {
  return (
    <div
      className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
        highlight
          ? "bg-primary text-white"
          : "bg-primary/10 dark:bg-primary/20 text-primary dark:text-[#a78bff]"
      )}
    >
      {rank}
    </div>
  );
}

// ── Avatar circle ───────────────────────────────────────────────────────────
function AvatarCircle({ initials, highlight }: { initials: string; highlight?: boolean }) {
  return (
    <div
      className={cn(
        "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
        highlight
          ? "bg-primary/15 dark:bg-primary/25 text-primary dark:text-[#a78bff]"
          : "bg-gray-100 dark:bg-gray-800 text-[#6B7280] dark:text-gray-300"
      )}
    >
      {initials}
    </div>
  );
}

// ── Score display ───────────────────────────────────────────────────────────
function Score({ user, tab }: { user: RankedUser; tab: LeaderboardTab }) {
  if (tab === "streak") {
    return (
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-orange-400">🔥</span>
        <span className="text-sm font-bold text-[#111827] dark:text-gray-100">{user.streak}</span>
        <span className="text-xs text-[#9CA3AF] dark:text-gray-500">ngày</span>
      </div>
    );
  }
  const xp = tab === "weeklyXp" ? user.weeklyXp : user.totalXp;
  return (
    <div className="flex items-center gap-1 shrink-0">
      <Zap size={13} className="text-amber-400" />
      <span className="text-sm font-bold text-[#111827] dark:text-gray-100">
        {xp.toLocaleString("vi-VN")}
      </span>
    </div>
  );
}

// ── Single row ──────────────────────────────────────────────────────────────
function LeaderboardRow({
  user,
  tab,
  displayName,
  index,
}: {
  user: RankedUser;
  tab: LeaderboardTab;
  displayName?: string;
  index: number;
}) {
  const isMe = user.isCurrentUser;
  const name = isMe && displayName ? displayName : user.name;

  return (
    <motion.div
      custom={index}
      variants={rowVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      layout
      whileHover={{ backgroundColor: isMe ? undefined : "rgba(124,58,237,0.03)" }}
      className={cn(
        "flex items-center gap-3 px-2 py-3 rounded-xl transition-colors",
        isMe ? "bg-primary/5 dark:bg-primary/10" : ""
      )}
    >
      <RankCircle rank={user.rank} highlight={isMe} />
      <AvatarCircle initials={user.initials} highlight={isMe} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={cn(
            "text-sm font-semibold truncate",
            isMe ? "text-primary dark:text-[#a78bff]" : "text-[#111827] dark:text-gray-100"
          )}>
            {name}
          </span>
          {isMe && (
            <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 dark:bg-primary/20 text-primary dark:text-[#a78bff] leading-none">
              Bạn
            </span>
          )}
        </div>
        <p className="text-xs text-[#9CA3AF] dark:text-gray-500">Cấp {user.level}</p>
      </div>
      <span className="hidden sm:block text-xs text-[#9CA3AF] dark:text-gray-500 shrink-0 w-16 text-right">
        {user.sessions} phiên
      </span>
      <Score user={user} tab={tab} />
    </motion.div>
  );
}

// ── List ────────────────────────────────────────────────────────────────────
interface LeaderboardListProps {
  rest: RankedUser[];
  all: RankedUser[];
  tab: LeaderboardTab;
  currentUserName?: string;
}

export function LeaderboardList({ rest, all, tab, currentUserName }: LeaderboardListProps) {
  const [expanded, setExpanded] = useState(false);
  const visible     = expanded ? rest : rest.slice(0, INITIAL_VISIBLE);
  const canExpand   = rest.length > INITIAL_VISIBLE;
  const currentUser = all.find((u) => u.isCurrentUser);
  const meInVisible = visible.some((u) => u.isCurrentUser);
  const showSticky  = currentUser && !meInVisible && currentUser.rank > 3 && !expanded;

  return (
    <div className="flex flex-col">
      {/* Column header */}
      <div className="flex items-center gap-3 px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF] dark:text-gray-600">
        <span className="w-8 text-center">Hạng</span>
        <span className="w-10 shrink-0" />
        <span className="flex-1">Ứng viên</span>
        <span className="hidden sm:block w-16 text-right">Phiên</span>
        <span className="shrink-0">Điểm</span>
      </div>

      <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
        <AnimatePresence mode="popLayout">
          {visible.map((user, i) => (
            <LeaderboardRow
              key={user.id}
              user={user}
              tab={tab}
              displayName={currentUserName}
              index={i}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Sticky current user */}
      <AnimatePresence>
        {showSticky && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex items-center gap-2 my-1.5 px-2">
              <div className="flex-1 border-t border-dashed border-gray-200 dark:border-gray-700" />
              <span className="text-[10px] text-[#9CA3AF] shrink-0">vị trí của bạn</span>
              <div className="flex-1 border-t border-dashed border-gray-200 dark:border-gray-700" />
            </div>
            <LeaderboardRow user={currentUser!} tab={tab} displayName={currentUserName} index={0} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expand / collapse */}
      {canExpand && (
        <motion.button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "mt-3 mx-2 flex items-center justify-center gap-1.5 py-2.5 rounded-xl",
            "text-sm font-medium text-[#6B7280] dark:text-gray-400",
            "border border-gray-200 dark:border-gray-700",
            "hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-200",
            "transition-colors"
          )}
        >
          {expanded ? <><ChevronUp size={15} /> Thu gọn</> : <><ChevronDown size={15} /> Xem thêm</>}
        </motion.button>
      )}
    </div>
  );
}
