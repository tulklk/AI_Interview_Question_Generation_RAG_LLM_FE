# QA artifact generators

Các script trong thư mục này dựng lại hai workbook và hai báo cáo Word trong `docs/qa/`
từ **kết quả chạy test thật**. Nguyên tắc: không sửa tay kết quả trong file Excel/Word —
chạy lại test, cập nhật data file, rồi build lại.

Bốn script cũ (`gen-testcases.js`, `gen-report5-new-sheets.js`,
`fill-functions-statistics.js`, `merge-into-live.js`) đã bị xoá ngày 19/09/2026: chúng dựng
bố cục workbook cũ (114 sheet theo từng file test, còn cả module `ManualQuestionModule` của
trang tạo câu hỏi thủ công đã gỡ) và ghi **đè thẳng** lên file live, nên chạy nhầm là mất
toàn bộ workbook hiện tại. Nếu cần tham khảo, lấy lại từ git history.

## Cài đặt

Các script cần `exceljs` và `jszip`. Chúng **không** nằm trong `package.json` của frontend
(đây là công cụ tài liệu, không phải dependency của app), nên cài riêng ở một thư mục ngoài
repo rồi trỏ `NODE_PATH` vào đó:

```
mkdir C:\tmp\qa-tools && cd C:\tmp\qa-tools
npm install exceljs@4.4.0 jszip@3.10.2
```

Khi chạy script, đặt biến môi trường:

```
$env:NODE_PATH = "C:/tmp/qa-tools/node_modules"
```

## Files

| File | Vai trò |
|---|---|
| `build-test-report.js` | Dựng `Report5_Test_Report.xlsx` (348 functional test case, 10 module) |
| `tc-data-1..4.js` | Dữ liệu test case: 1–3 là 309 case Vitest, 4 là 39 case pytest của RAG |
| `build-unit-workbook.js` | Dựng `SU26SE102-GSU26SE52_QA_TestCases.xlsx` (393 unit test case, 57 function sheet) |
| `unit-data-fe.js` / `unit-data-be.js` | 19 hàm frontend (161 case) / 38 hàm backend (232 case) |
| `build-docs.js` | Dựng mục II của Report 5 và chương V của Report 7 |
| `content.js` | Nội dung dùng chung cho hai báo cáo, gồm bảng phạm vi FT-01…FT-15 |
| `approve.txt` | Đoạn văn phê duyệt kế hoạch test, `build-docs.js` chèn vào |

## Quy trình build lại

1. Chạy test và xuất kết quả máy đọc được:

   ```
   npx vitest run --reporter=json --outputFile=C:/tmp/qa/vitest.json
   ```

   Backend .NET (repo riêng): `dotnet test ApplicationLayer.UnitTests --logger "trx;LogFileName=be-unit.trx"`.
   RAG service: xem `TestExecutionGuide.docx` mục 3 — **bắt buộc** trỏ `CHROMA_PERSIST_DIR`
   và `DATA_FOLDER` sang thư mục tạm, nếu không sẽ ghi đè dữ liệu thật của container RAG.

2. Kiểm tra trước khi ghi file (`--check` chỉ đối chiếu, không ghi gì):

   ```
   node build-test-report.js C:/tmp/qa/vitest.json out.xlsx --check --pytest=C:/tmp/qa/pytest.xml
   ```

   Script thoát với mã lỗi nếu **bất kỳ** test case nào không khớp đúng một test đã chạy và
   pass. Đây là chốt chặn giữ cho workbook không chứa kết quả bịa.

3. Build ra thư mục tạm, mở kiểm tra trong Excel/Word, rồi mới copy đè vào `docs/qa/`.
   `build-docs.js` build từ bản backup gốc (biến `SRC`) chứ không build chồng lên file đã
   sửa, nên chạy lại nhiều lần vẫn ra kết quả giống nhau.

4. Sau khi thay file Word, mở bằng Word và cập nhật lại mục lục
   (`TablesOfContents(1).Update()` rồi Save) để số trang không bị lệch.

## Lưu ý

- `build-docs.js` đọc `SRC` và `OUT_DIR` từ đường dẫn tuyệt đối ngoài repo
  (`C:/tmp/qa-backup-0913/`). Nếu chạy trên máy khác thì sửa hai hằng số đó ở đầu file.
- Ngày chạy nằm ở hằng số đầu `build-test-report.js`: `RUN_DATE` cho frontend và
  `RAG_RUN_DATE` cho RAG service — hai bộ test chạy ngày khác nhau nên tách riêng.
