import { type RubricCriterion } from "./types";

export type RubricPresetKey =
  | "technical"
  | "system_design"
  | "behavioral"
  | "problem_solving"
  | "code";

const PRESETS: Record<RubricPresetKey, Omit<RubricCriterion, "weight">[]> = {
  technical: [
    {
      id: "accuracy",
      label: "Hiểu đúng khái niệm kỹ thuật",
      anchors: {
        "25": "Không giải thích được hoặc sai cơ bản",
        "50": "Nêu định nghĩa và mục đích",
        "75": "Có ví dụ minh họa cụ thể",
        "100": "Nêu edge case / anti-pattern liên quan",
      },
    },
    {
      id: "depth",
      label: "Độ sâu và chi tiết kỹ thuật",
      anchors: {
        "25": "Trả lời sơ sài, thiếu chi tiết",
        "50": "Nêu được các thành phần chính",
        "75": "So sánh hoặc phân tích trade-off",
        "100": "Phân tích sâu, liên hệ thực tế production",
      },
    },
    {
      id: "clarity",
      label: "Truyền đạt rõ ràng",
      anchors: {
        "25": "Khó hiểu, lan man",
        "50": "Có cấu trúc cơ bản",
        "75": "Logic rõ, dễ theo dõi",
        "100": "Súc tích, chính xác, có ví dụ",
      },
    },
  ],
  system_design: [
    {
      id: "requirements",
      label: "Làm rõ yêu cầu và phạm vi",
      anchors: {
        "25": "Bỏ sót yêu cầu quan trọng",
        "50": "Nêu functional requirements cơ bản",
        "75": "Có non-functional (scale, availability)",
        "100": "Ưu tiên hóa và giả định rõ ràng",
      },
    },
    {
      id: "architecture",
      label: "Thiết kế kiến trúc",
      anchors: {
        "25": "Thiếu thành phần cốt lõi",
        "50": "Có các service/component chính",
        "75": "Luồng dữ liệu và API hợp lý",
        "100": "Phân tầng rõ, mở rộng được",
      },
    },
    {
      id: "tradeoffs",
      label: "Trade-off và rủi ro",
      anchors: {
        "25": "Không nêu trade-off",
        "50": "Nêu 1 trade-off đơn giản",
        "75": "So sánh 2+ phương án",
        "100": "Failure mode + mitigation cụ thể",
      },
    },
  ],
  behavioral: [
    {
      id: "star",
      label: "Cấu trúc STAR / tình huống cụ thể",
      anchors: {
        "25": "Chung chung, không có tình huống",
        "50": "Có tình huống nhưng thiếu chi tiết",
        "75": "STAR đầy đủ",
        "100": "STAR + số liệu / impact đo được",
      },
    },
    {
      id: "specificity",
      label: "Cụ thể và trung thực",
      anchors: {
        "25": "Trả lời mơ hồ",
        "50": "Có ví dụ chung",
        "75": "Vai trò và hành động rõ",
        "100": "Chi tiết đủ verify được",
      },
    },
    {
      id: "impact",
      label: "Kết quả và bài học",
      anchors: {
        "25": "Không nêu kết quả",
        "50": "Kết quả định tính",
        "75": "Impact team/dự án",
        "100": "Impact đo được + reflection",
      },
    },
  ],
  problem_solving: [
    {
      id: "approach",
      label: "Cách tiếp cận và phân rã",
      anchors: {
        "25": "Không có hướng giải",
        "50": "Có bước đầu phân tích",
        "75": "Phân rã bài toán hợp lý",
        "100": "Chiến lược tối ưu, có verification",
      },
    },
    {
      id: "correctness",
      label: "Đúng đắn và hoàn chỉnh",
      anchors: {
        "25": "Giải pháp sai",
        "50": "Đúng happy path",
        "75": "Xử lý edge case",
        "100": "Đúng + tối ưu độ phức tạp",
      },
    },
    {
      id: "communication",
      label: "Trình bày quá trình suy nghĩ",
      anchors: {
        "25": "Không giải thích reasoning",
        "50": "Nêu bước chính",
        "75": "Walkthrough rõ ràng",
        "100": "Giải thích trade-off trong giải pháp",
      },
    },
  ],
  code: [
    {
      id: "correctness",
      label: "Tính đúng đắn code",
      anchors: {
        "25": "Code sai logic cơ bản",
        "50": "Đúng happy path",
        "75": "Xử lý edge case trong code",
        "100": "Đúng + clean + idiomatic",
      },
    },
    {
      id: "approach",
      label: "Cách tiếp cận / debug",
      anchors: {
        "25": "Không có phương pháp",
        "50": "Thử-sai cơ bản",
        "75": "Debug có hệ thống",
        "100": "Root cause + prevention",
      },
    },
    {
      id: "edge_cases",
      label: "Edge case và chất lượng",
      anchors: {
        "25": "Bỏ qua edge case",
        "50": "Nêu 1 edge case",
        "75": "Xử lý nhiều edge case",
        "100": "Test / validation strategy",
      },
    },
  ],
};

function normalizeQuestionType(raw?: string | null): RubricPresetKey {
  const t = (raw ?? "").toLowerCase().replace(/[_\s-]/g, "");
  if (t.includes("system") && t.includes("design")) return "system_design";
  if (t.includes("behavior")) return "behavioral";
  if (t.includes("problem")) return "problem_solving";
  if (t.includes("code") || t.includes("bug") || t.includes("refactor")) return "code";
  return "technical";
}

export function getPresetKey(
  questionType?: string | null,
  contentMode?: "theory" | "code" | "system_design" | null
): RubricPresetKey {
  if (contentMode === "code") return "code";
  if (contentMode === "system_design") return "system_design";
  return normalizeQuestionType(questionType);
}

export function buildPresetCriteria(
  key: RubricPresetKey,
  selectedIds?: string[]
): RubricCriterion[] {
  const templates = PRESETS[key] ?? PRESETS.technical;
  const picked =
    selectedIds && selectedIds.length > 0
      ? templates.filter((t) => selectedIds.includes(t.id))
      : templates;
  const base = Math.floor(100 / picked.length);
  let remainder = 100 - base * picked.length;
  return picked.map((t, i) => ({
    ...t,
    weight: base + (i < remainder ? 1 : 0),
  }));
}

export function listPresetOptions(key: RubricPresetKey) {
  return (PRESETS[key] ?? PRESETS.technical).map((t) => ({ id: t.id, label: t.label }));
}
