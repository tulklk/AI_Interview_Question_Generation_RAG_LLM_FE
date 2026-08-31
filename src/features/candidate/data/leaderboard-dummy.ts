// ── Leaderboard dummy data ─────────────────────────────────────────────────
// All data here is purely for UI demonstration. Replace with real API calls
// when the backend leaderboard endpoint is ready.

export type LeaderboardTab = "totalXp" | "streak" | "weeklyXp";

export interface LeaderboardUser {
  id: string;
  name: string;
  initials: string;
  level: number;
  totalXp: number;
  weeklyXp: number;
  streak: number;
  sessions: number;
  /** Positions moved this week: positive = up, negative = down, 0 = same */
  trend?: number;
  isCurrentUser?: boolean;
}

export interface WeeklyChallenge {
  id: string;
  title: string;
  progress: number;
  total: number;
  reward: number;
  daysLeft: number;
  iconType: "target" | "trending-up" | "flame";
  unit?: string;
}

export interface LeagueLevel {
  id: string;
  name: string;
  minXp: number;
}

// ── 18 dummy users ─────────────────────────────────────────────────────────
export const LEADERBOARD_USERS: LeaderboardUser[] = [
  { id: "u1",  name: "Nguyễn Minh Anh",   initials: "MA", level: 12, totalXp: 12840, weeklyXp: 2480, streak: 42, sessions: 124, trend: 2 },
  { id: "u2",  name: "Trần Gia Huy",      initials: "GH", level: 11, totalXp: 11950, weeklyXp: 2220, streak: 37, sessions: 108, trend: 0 },
  { id: "u3",  name: "Lê Khánh Linh",    initials: "KL", level: 10, totalXp: 10720, weeklyXp: 1980, streak: 31, sessions: 95,  trend: 1 },
  { id: "u4",  name: "Phạm Hoàng Nam",    initials: "HN", level: 9,  totalXp: 9880,  weeklyXp: 1750, streak: 28, sessions: 87,  trend: -1 },
  { id: "u5",  name: "Vũ Thu Hà",        initials: "TH", level: 9,  totalXp: 9120,  weeklyXp: 1640, streak: 25, sessions: 82,  trend: 3 },
  { id: "u6",  name: "Đặng Quốc Bảo",    initials: "QB", level: 8,  totalXp: 8450,  weeklyXp: 1520, streak: 22, sessions: 76,  trend: 0 },
  { id: "u7",  name: "Bùi Thanh Trúc",   initials: "TT", level: 8,  totalXp: 7890,  weeklyXp: 1380, streak: 19, sessions: 71,  trend: -2 },
  { id: "u8",  name: "Ngô Minh Đức",     initials: "MD", level: 8,  totalXp: 7340,  weeklyXp: 1240, streak: 17, sessions: 68,  trend: 1 },
  { id: "u9",  name: "Hoàng Lan Anh",    initials: "LA", level: 7,  totalXp: 6820,  weeklyXp: 1120, streak: 15, sessions: 63,  trend: 4 },
  { id: "u10", name: "Đinh Công Thắng",  initials: "CT", level: 7,  totalXp: 6310,  weeklyXp: 980,  streak: 13, sessions: 59,  trend: -1 },
  { id: "u11", name: "Lý Thị Phương",    initials: "TP", level: 7,  totalXp: 5800,  weeklyXp: 920,  streak: 11, sessions: 56,  trend: 0 },
  { id: "u12", name: "Thành Tú",         initials: "TT", level: 7,  totalXp: 5420,  weeklyXp: 840,  streak: 3,  sessions: 53,  trend: 2, isCurrentUser: true },
  { id: "u13", name: "Trương Hải Long",  initials: "HL", level: 6,  totalXp: 4980,  weeklyXp: 760,  streak: 8,  sessions: 49,  trend: -1 },
  { id: "u14", name: "Nguyễn Thảo Nhi",  initials: "TN", level: 6,  totalXp: 4540,  weeklyXp: 680,  streak: 6,  sessions: 45,  trend: 3 },
  { id: "u15", name: "Phan Văn Khoa",    initials: "VK", level: 6,  totalXp: 4120,  weeklyXp: 620,  streak: 5,  sessions: 42,  trend: 0 },
  { id: "u16", name: "Mai Thị Hương",    initials: "MH", level: 5,  totalXp: 3760,  weeklyXp: 540,  streak: 4,  sessions: 38,  trend: -2 },
  { id: "u17", name: "Cao Xuân Trường",  initials: "XT", level: 5,  totalXp: 3380,  weeklyXp: 480,  streak: 3,  sessions: 34,  trend: 1 },
  { id: "u18", name: "Trịnh Bảo Châu",  initials: "BC", level: 5,  totalXp: 3020,  weeklyXp: 420,  streak: 2,  sessions: 31,  trend: 0 },
];

// ── League levels ──────────────────────────────────────────────────────────
export const LEAGUE_LEVELS: LeagueLevel[] = [
  { id: "bronze",   name: "Đồng",      minXp: 0 },
  { id: "silver",   name: "Bạc",       minXp: 3000 },
  { id: "gold",     name: "Vàng",      minXp: 6000 },
  { id: "platinum", name: "Bạch kim",  minXp: 10000 },
  { id: "diamond",  name: "Kim cương", minXp: 15000 },
];

// ── Weekly challenges ──────────────────────────────────────────────────────
export const WEEKLY_CHALLENGES: WeeklyChallenge[] = [
  {
    id: "wc1",
    title: "Hoàn thành 5 phiên luyện tập",
    progress: 3,
    total: 5,
    reward: 300,
    daysLeft: 4,
    iconType: "target",
  },
  {
    id: "wc2",
    title: "Đạt điểm trung bình ≥ 80",
    progress: 78,
    total: 80,
    reward: 150,
    daysLeft: 4,
    iconType: "trending-up",
    unit: "điểm",
  },
  {
    id: "wc3",
    title: "Luyện tập 3 ngày liên tiếp",
    progress: 1,
    total: 3,
    reward: 200,
    daysLeft: 4,
    iconType: "flame",
  },
];

// ── Derived helpers ────────────────────────────────────────────────────────
export type RankedUser = LeaderboardUser & { rank: number };

export function rankUsers(
  users: LeaderboardUser[],
  by: LeaderboardTab
): RankedUser[] {
  const key = by === "totalXp" ? "totalXp" : by === "streak" ? "streak" : "weeklyXp";
  return [...users]
    .sort((a, b) => b[key] - a[key])
    .map((u, i) => ({ ...u, rank: i + 1 }));
}

export function getCurrentLeagueIndex(totalXp: number): number {
  let idx = 0;
  for (let i = 0; i < LEAGUE_LEVELS.length; i++) {
    if (totalXp >= LEAGUE_LEVELS[i].minXp) idx = i;
    else break;
  }
  return idx;
}
