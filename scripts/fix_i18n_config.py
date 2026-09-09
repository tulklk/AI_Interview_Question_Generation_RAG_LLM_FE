import re
from pathlib import Path

I18N = Path(__file__).resolve().parents[1] / "src" / "core" / "i18n"

CONFIG_VI = r"""      config: {
        distributionHint: "Chỉnh % hoặc số câu — tổng phải khớp số câu hỏi và ~100%.",
        distributionInvalid: "Phân bổ không hợp lệ: {{count}}/{{total}} câu, {{pct}}% tổng.",
        focusHint: "Trọng số focus (0–100) — tổng nên ~100%.",
        focusSum: "Tổng: {{sum}}%",
        focusInvalid: "Tổng trọng số focus phải ~100%.",
        addFocus: "Thêm focus area",
        newFocusName: "Focus mới",
        stylesHint: "Chọn phong cách câu hỏi (ít nhất 1).",
        codingSection: "Loại bài code",
        codingHint: "Template code được phép khi JD cần coding.",
        codingNotRequired: "Không bắt buộc coding cho JD này.",
        advancedSection: "Tùy chọn nâng cao",
        applyConfig: "Áp dụng cấu hình",
        applyingConfig: "Đang lưu cấu hình…",
        configInvalidHint: "Hoàn thiện phân bổ + focus (tổng ~100%) rồi bấm Áp dụng.",
        appliedConfigTitle: "Cấu hình đang áp dụng",
        appliedConfigSubtitle: "Cấu hình HR cuối cùng dùng khi sinh/regenerate plan.",
        badgeAiRecommended: "AI đề xuất",
        badgeHrCustomized: "HR tùy chỉnh",
        badgeNotConfigured: "Chưa cấu hình",
        stalePlanBanner: "Cấu hình HR đã đổi sau khi tạo plan — cần regenerate để đồng bộ.",
        regeneratePlanCta: "Regenerate plan",
      },
"""

CONFIG_EN = r"""      config: {
        distributionHint: "Adjust % or counts — total must match question count and ~100%.",
        distributionInvalid: "Invalid distribution: {{count}}/{{total}} questions, {{pct}}% total.",
        focusHint: "Focus weights (0–100) — sum should be ~100%.",
        focusSum: "Sum: {{sum}}%",
        focusInvalid: "Focus weights must sum to ~100%.",
        addFocus: "Add focus area",
        newFocusName: "New focus",
        stylesHint: "Pick question styles (at least one).",
        codingSection: "Coding task types",
        codingHint: "Allowed code templates when JD requires coding.",
        codingNotRequired: "Coding not required for this JD.",
        advancedSection: "Advanced options",
        applyConfig: "Apply configuration",
        applyingConfig: "Saving configuration…",
        configInvalidHint: "Complete distribution + focus (~100% sum) then Apply.",
        appliedConfigTitle: "Applied configuration",
        appliedConfigSubtitle: "Final HR settings used for plan generate/regenerate.",
        badgeAiRecommended: "AI recommended",
        badgeHrCustomized: "HR customized",
        badgeNotConfigured: "Not configured",
        stalePlanBanner: "HR settings changed after this plan was created — regenerate to sync.",
        regeneratePlanCta: "Regenerate plan",
      },
"""

ADMIN_PATTERN = re.compile(
    r"\n      config: \{.*?\n        regeneratePlanCta: \"Regenerate plan\",\n      \},\n\n      aiConfig: \{\n        title: \"(?:Cấu hình AI|AI Configuration)\"",
    re.DOTALL,
)


def fix_file(lang: str, config_block: str) -> None:
    path = I18N / f"{lang}.ts"
    text = path.read_text(encoding="utf-8")
    text = ADMIN_PATTERN.sub(
        '\n      aiConfig: {\n        title: "Cấu hình AI"' if lang == "vi" else '\n      aiConfig: {\n        title: "AI Configuration"',
        text,
        count=1,
    )
    studio_marker = "      noFocusConfigured:"
    if studio_marker in text:
        segment = text.split(studio_marker, 1)[1].split("aiConfig:", 1)[0]
        if "config:" not in segment:
            text = text.replace(studio_marker, config_block + "\n" + studio_marker, 1)
    path.write_text(text, encoding="utf-8")
    print(f"{lang}.ts fixed")


if __name__ == "__main__":
    fix_file("vi", CONFIG_VI)
    fix_file("en", CONFIG_EN)
