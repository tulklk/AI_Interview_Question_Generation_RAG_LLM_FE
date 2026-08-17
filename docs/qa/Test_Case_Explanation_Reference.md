# Test Case Explanation Reference

**Mục đích:** Tài liệu tham chiếu nhanh khi hội đồng bảo vệ bốc ngẫu nhiên một file/test case và bắt chạy lại hoặc giải thích trực tiếp. Không phải bug — đây là bảng giải thích hành vi mà từng test case đang khoá lại, kèm lệnh chạy chính xác cho từng file. Danh sách bug thật nằm riêng ở `QA_Bug_Summary/QA_Bug_Summary_Report.md`.

---

## 0. Chiến lược chung

**Nếu hội đồng chỉ định một test case bất kỳ, không báo trước:**

1. **Hội đồng đọc đúng mã QA-ID** (VD `HIST-10`) — mã này được nhúng ngay trong tên test ở code, chạy thẳng:
   ```
   npm run test -- -t "HIST-10"
   ```
2. **Hội đồng chỉ mô tả bằng lời**, không đọc mã — dùng `grep -rn "<từ khóa tiếng Anh>" tests/unit/` để tìm ra đúng file/dòng trước, rồi chạy `-t` như trên.
3. **Test case đó không có coverage tự động hoặc thuộc phần Backend/RAG** — trả lời thẳng thắn là phần này kiểm thử thủ công/thuộc nhóm khác, không né tránh, rồi demo trực tiếp trên UI hoặc nhường lại cho đúng thành viên phụ trách.
4. **Nếu biết chính xác cả file** (đường dẫn đầy đủ, VD đang mở sẵn trong IDE) — chạy thẳng theo đường dẫn file thay vì lọc theo tên, nhanh hơn và không phải lọc qua các file khác:
   ```
   npm run test -- tests/unit/<tên-file>.test.tsx
   ```

**Điểm mấu chốt:** luôn ưu tiên lọc theo TÊN (`-t`) hoặc đường dẫn FILE chính xác đã biết trước — tránh gõ lại tên file theo trí nhớ vì rất dễ sai (từng gõ nhầm `candidate-biling.test` thiếu 1 chữ "l", Vitest báo lỗi khá mơ hồ "No test files found, exiting with code 1").

**Nếu bị bắt giải thích (không chỉ chạy):** không cần học thuộc — đọc trực tiếp từ nguồn có sẵn. Ở mức nghiệp vụ, mỗi dòng trong `SU26SE102-GSU26SE52_QA_TestCases.xlsx` đã có sẵn Description/Procedure/Expected/Precondition. Ở mức code, toàn bộ 535 test đều theo đúng 1 khuôn **Arrange–Act–Assert**, nên chỉ cần thuộc pattern chung thay vì từng test. Mỗi file test còn có comment đầu file ghi rõ nó "grounded in" đúng file source nào và map sang đúng sheet Excel nào — là bằng chứng truy vết trực tiếp nếu bị hỏi "sao biết test này đúng yêu cầu".

---

## 1. `tests/unit/forgot-reset-password.test.tsx` — AUTH005-2

Sheet Excel: `AUTH005_ForgotResetPassword`. Grounded in `src/app/forgot-password/page.tsx`, `reset-password-content.tsx`.

**Chạy:** `npm run test -- -t "AUTH005-2"`

`AUTH005-2: rejects an invalid email format` ([forgot-reset-password.test.tsx:52-59](tests/unit/forgot-reset-password.test.tsx#L52-L59)):
- **Arrange**: `renderWithProviders(<ForgotPasswordPage />)` — dựng component thật, không mock UI.
- **Act**: `user.type(..., "not-an-email")` rồi `user.click("Send reset link")` — mô phỏng thao tác người dùng thật qua Testing Library, không gọi thẳng hàm nội bộ.
- **Assert**: thông báo lỗi hiển thị đúng, và `expect(forgotPassword).not.toHaveBeenCalled()` — kiểm tra API KHÔNG bị gọi khi input sai, tức khoá đúng luồng validation chặn trước khi ra network.

---

## 2. `tests/unit/feedback-result-client.test.tsx` — FRC-1 đến FRC-4

Sheet nguồn: cover state machine "poll điểm bài làm" của `FeedbackResultClient` (score-polling), không có coverage tự động trước đó. Grounded in `src/features/candidate/components/feedback/feedback-result-client.tsx`.

**Chạy:** `npm run test -- -t "FRC-"` (chạy cả nhóm 4 test) — đã verify: **4/4 pass, 372ms**.

| Mã | Nội dung |
|---|---|
| FRC-1 | Đang null → poll vài lần (mỗi 3s, `SCORE_POLL_INTERVAL_MS`) → có điểm thì chuyển "done". |
| FRC-2 | Null suốt `SCORE_POLL_MAX_ATTEMPTS` (8 lần) → chuyển "timed-out" thay vì poll vô hạn. |
| FRC-3 | Bấm nút Retry sau timeout → poll lại và vẫn có thể thành công. |
| FRC-4 | Đã có điểm sẵn lúc load đầu → bỏ qua poll hoàn toàn. |

**Câu chuyện bug thật gắn với file này:** khi viết bộ test này (commit `a9af7b1`), phát hiện nhánh `.catch()` của mỗi lần poll thiếu guard `cancelled`/`pollCancelledRef` mà nhánh `.then()` cạnh đó đã có — một poll cũ bị huỷ (đổi session/rời trang) nhưng reject muộn vẫn có thể ghi đè nhầm trạng thái đang hiển thị. Sửa trong commit `4ca3b72` (xem `QA_Bug_Summary_Report.md` để biết định dạng bug đầy đủ, hoặc `Dong_Gop_Ca_Nhan_khoa3107.docx` Phần IV).

**Lưu ý kỹ thuật nếu bị hỏi "sao dùng `flush()` custom thay vì `waitFor`":** comment đầu file giải thích `vi.useFakeTimers()` + `waitFor` polling nội bộ của RTL không ăn khớp với React 18 scheduler, dễ bị hang — dùng `vi.advanceTimersByTimeAsync(0)` bơm vài lần thay thế (verify thực nghiệm).

---

## 3. `tests/unit/history-published-set.test.tsx` — RAG028-1, RAG028-2, RAG028-3

Sheet Excel: `RAG028` (published-set edit restrictions). Grounded in `review-questions-section.tsx` (biến `isLocked = publishStatus === "PUBLISHED"`).

**Chạy:** `npm run test -- -t "RAG028"` — đã verify: **3/3 pass**.

| Mã | Nội dung |
|---|---|
| RAG028-1 | Set đã PUBLISHED → khoá toàn bộ Add/Edit/Delete/Reorder — hiện dòng cảnh báo khoá, ẩn "Add Question", mỗi câu hỏi riêng lẻ cũng không còn nút Delete. |
| RAG028-2 | Set còn DRAFT → sửa bình thường — không cảnh báo, còn "Add Question", mỗi câu hỏi vẫn có Delete (2 câu × 2 action bar desktop/mobile = 4 nút). |
| RAG028-3 | Ngoại lệ có chủ đích: dù set đã PUBLISHED, HR vẫn được sửa **time limit** của bài thi — vì thời gian làm bài của phiên đang chạy được chốt server-side lúc bắt đầu (`expiresAt`), đổi `timeLimitMinutes` sau đó không ảnh hưởng phiên đang thi. |

**Lưu ý dễ nhầm:** `RAG028` (file này, khoá Add/Edit/Delete/Reorder ở trang review chi tiết per-question) là **một mã khác** với `HIST-10` (mục 5 dưới đây, khoá nút Delete ở trang danh sách lịch sử list-level) — hai lớp bảo vệ riêng biệt cho cùng một business rule "không được sửa/xoá set đã publish".

---

## 4. `tests/unit/auth-interceptor.test.ts` — RGA001-1 đến RGA007-1 (11 test)

Sheet Excel: RGA001/RGA002/RGA004/RGA013 (HRRAGAuthErrorHandling). Grounded in `auth.interceptor.ts` + `token.service.ts`. Viết trong commit `987bd61` (chuyển toàn bộ suite Playwright E2E sang Vitest unit test).

**Chạy toàn bộ file (đường dẫn chính xác, nhanh nhất khi biết trước):**
```
npm run test -- tests/unit/auth-interceptor.test.ts
```
Đã verify: **11/11 pass, 1.64s**.

| Mã | Hành vi được khoá lại |
|---|---|
| RGA001-1 | 401 → refresh thành công → tự động retry request cũ, không đăng xuất. (Luồng của bug thật `8976041`.) |
| RGA002-1 | 401 → refresh THẤT BẠI (refresh token hết hạn) → `clearAuth()` + redirect `/login`. |
| RGA003-1 | Không có refresh token nào cả → bỏ qua network call refresh, redirect ngay. |
| RGA004-1 | 401 ngay trên chính endpoint refresh → `clearAuth()` + redirect ngay, không gọi refresh lần 2. |
| RGA006-1 | 401 trên endpoint public (VD login sai mật khẩu) → không kích hoạt refresh/redirect. |
| RGA005-1a | 403 (Forbidden, khác 401) → không coi là hết phiên, không refresh, không redirect. |
| RGA005-1b | 401 ngay cả sau khi đã retry 1 lần → bỏ cuộc (logout), không refresh lần 2. |
| RGA017-1 | Token đọc qua `getAccessToken()`/`getRefreshToken()` (localStorage), không phải cookie. |
| RGA019-1 | Refresh thất bại → gọi đúng `clearAuth()` (xoá luôn profile cache). |
| RGA020-1 | Refresh thành công → dùng đúng token MỚI server trả về (rotated), không tái sử dụng token cũ. |
| RGA007-1 | 2 request cùng lúc đều 401 → chỉ gọi refresh 1 lần duy nhất (de-dup). |

**Gap đã biết** (chi tiết đầy đủ ở `QA_Bug_Summary_Report.md`, mục #20): `RGA001-1` chỉ khoá logic retry/refresh, không khoá được nguyên nhân gốc thật của bug `8976041` (giá trị `.env` sai) — vì Vitest không load `.env` thật khi chạy test.

---

## 5. `tests/unit/hr-history.test.tsx` — HIST-10

`HIST-10: a PUBLISHED set's Delete button is disabled and never opens the confirm dialog` ([hr-history.test.tsx:167](tests/unit/hr-history.test.tsx#L167)) — nút Delete ở **trang danh sách lịch sử** (list-level) cho set đã publish bị disable và không mở dialog xác nhận.

**Chạy:** `npm run test -- -t "HIST-10"` — đã verify: **1/1 pass**.

---

## 6. `tests/unit/studio-flow.test.tsx` — RGA-SUB-1

`RGA-SUB-1: a QUOTA_EXCEEDED errorCode on the generate call opens the quota-exceeded blocking dialog (not a toast)` ([studio-flow.test.tsx:144](tests/unit/studio-flow.test.tsx#L144)).

**Chạy:** `npm run test -- -t "RGA-SUB-1"`.
