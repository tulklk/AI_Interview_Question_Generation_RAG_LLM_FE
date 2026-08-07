// Merges the freshly-generated (Form-styled) sheets from a temp workbook into
// the live workbook, replacing only the old-style test-case + summary sheets
// and leaving the user's hand-added Guideline/Cover/Functions/Statistics/Form
// sheets untouched.
//
// Usage: node merge-into-live.js <tempGeneratedFile> <liveFile>

const ExcelJS = require("exceljs");

function copySheetInto(targetWb, sourceWs) {
  const targetWs = targetWb.addWorksheet(sourceWs.name, {
    views: sourceWs.views,
  });
  targetWs.columns = sourceWs.columns.map((c) => ({ width: c && c.width }));

  for (let r = 1; r <= sourceWs.rowCount; r++) {
    const srcRow = sourceWs.getRow(r);
    const tgtRow = targetWs.getRow(r);
    if (srcRow.height) tgtRow.height = srcRow.height;
    for (let c = 1; c <= sourceWs.columnCount; c++) {
      const srcCell = sourceWs.getCell(r, c);
      const tgtCell = targetWs.getCell(r, c);
      if (srcCell.value !== null && srcCell.value !== undefined) tgtCell.value = srcCell.value;
      if (srcCell.font) tgtCell.font = srcCell.font;
      if (srcCell.fill) tgtCell.fill = srcCell.fill;
      if (srcCell.border) tgtCell.border = srcCell.border;
      if (srcCell.alignment) tgtCell.alignment = srcCell.alignment;
      if (srcCell.dataValidation) tgtCell.dataValidation = srcCell.dataValidation;
      if (srcCell.numFmt) tgtCell.numFmt = srcCell.numFmt;
    }
  }

  for (const range of sourceWs.model.merges || []) {
    targetWs.mergeCells(range);
  }
  return targetWs;
}

async function main() {
  const [tempPath, livePath] = process.argv.slice(2);
  if (!tempPath || !livePath) {
    console.error("Usage: node merge-into-live.js <tempGeneratedFile> <liveFile>");
    process.exit(1);
  }

  const tempWb = new ExcelJS.Workbook();
  await tempWb.xlsx.readFile(tempPath);

  const liveWb = new ExcelJS.Workbook();
  await liveWb.xlsx.readFile(livePath);

  const namesFromTemp = tempWb.worksheets.map((ws) => ws.name);

  // Remove old-style sheets in the live file that we're about to replace.
  for (const name of namesFromTemp) {
    const existing = liveWb.getWorksheet(name);
    if (existing) liveWb.removeWorksheet(existing.id);
  }

  // Re-add them, freshly styled, preserving the temp workbook's sheet order.
  // Insert right after any sheets NOT in namesFromTemp (i.e. after the user's
  // Guideline/Cover/Functions/Statistics/Form sheets), by simply appending —
  // ExcelJS appends new sheets at the end, and since we removed the old
  // matching sheets first, the untouched sheets keep their original position
  // at the front, with the freshly generated ones following.
  for (const sourceWs of tempWb.worksheets) {
    copySheetInto(liveWb, sourceWs);
  }

  await liveWb.xlsx.writeFile(livePath);
  console.log(`Merged ${namesFromTemp.length} sheets into ${livePath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
