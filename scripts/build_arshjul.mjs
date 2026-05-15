import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SpreadsheetFile, Workbook } from "/Users/sammofrad/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const buildDir = path.join(rootDir, "build");
const dataPath = path.join(buildDir, "sheet2_analysis.json");
const outPath = path.join(rootDir, "build", "Arshjul_analys.xlsx");

const raw = await fs.readFile(dataPath, "utf8");
const data = JSON.parse(raw);
const recordsByMonth = Object.fromEntries(
  data.monthOrder.map((month) => [month, data.records.filter((record) => record.month === month)])
);

const workbook = Workbook.create();
const sourceSheet = workbook.worksheets.add("Källdata");
const analysisSheet = workbook.worksheets.add("Analys");
const wheelSheet = workbook.worksheets.add("Årshjul");

const brand = {
  dark: "#1F3C88",
  blue: "#2563EB",
  lightBlue: "#DBEAFE",
  green: "#0F766E",
  lightGreen: "#CCFBF1",
  gold: "#B45309",
  lightGold: "#FEF3C7",
  gray: "#475569",
  lightGray: "#F8FAFC",
  border: "#CBD5E1",
};

const titleStyle = {
  fill: brand.dark,
  font: { bold: true, color: "#FFFFFF", size: 15 },
  horizontalAlignment: "center",
  verticalAlignment: "center",
};

const headerStyle = {
  fill: brand.blue,
  font: { bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
};

const sectionStyle = {
  fill: brand.green,
  font: { bold: true, color: "#FFFFFF", size: 12 },
  horizontalAlignment: "left",
  verticalAlignment: "center",
};

sourceSheet.showGridLines = false;
analysisSheet.showGridLines = false;
wheelSheet.showGridLines = false;

sourceSheet.getRange("A1:E1").values = [[
  "Månad",
  "Månadsnr",
  "Metod",
  "Aktivitet",
  "Värde",
]];
sourceSheet.getRange("A1:E1").format = headerStyle;

sourceSheet.getRange(`A2:E${data.records.length + 1}`).values = data.records.map((record) => [
  record.month,
  record.monthNumber,
  record.method,
  record.activity,
  record.value,
]);
sourceSheet.tables.add(`A1:E${data.records.length + 1}`, true, "KalldataTabell");
sourceSheet.getRange("A:E").format.wrapText = true;
sourceSheet.getRange("A:A").format.columnWidth = 12;
sourceSheet.getRange("B:B").format.columnWidth = 12;
sourceSheet.getRange("C:C").format.columnWidth = 30;
sourceSheet.getRange("D:D").format.columnWidth = 42;
sourceSheet.getRange("E:E").format.columnWidth = 10;
sourceSheet.getRange(`E2:E${data.records.length + 1}`).format.numberFormat = "0";

analysisSheet.getRange("A1:G1").merge();
analysisSheet.getRange("A1").values = [["Analys av Blad 2"]];
analysisSheet.getRange("A1:G1").format = titleStyle;
analysisSheet.getRange("A2:G2").merge();
analysisSheet.getRange("A2").values = [[
  "49 aktiviteter identifierades i Blad 2. Aktivitetstopparna ligger i mars, september, november och december.",
]];
analysisSheet.getRange("A2:G2").format = {
  fill: brand.lightBlue,
  font: { color: brand.gray, italic: true },
  wrapText: true,
  horizontalAlignment: "left",
  verticalAlignment: "center",
};

analysisSheet.getRange("A4:B4").merge();
analysisSheet.getRange("A4").values = [["Aktiviteter per månad"]];
analysisSheet.getRange("A4:B4").format = sectionStyle;
analysisSheet.getRange("A5:B5").values = [["Månad", "Antal aktiviteter"]];
analysisSheet.getRange("A5:B5").format = headerStyle;
analysisSheet.getRange(`A6:B${data.monthCounts.length + 5}`).values = data.monthCounts.map((row) => [
  row.month,
  row.count,
]);

analysisSheet.getRange("D4:E4").merge();
analysisSheet.getRange("D4").values = [["Aktiviteter per metod"]];
analysisSheet.getRange("D4:E4").format = sectionStyle;
analysisSheet.getRange("D5:E5").values = [["Metod", "Antal aktiviteter"]];
analysisSheet.getRange("D5:E5").format = headerStyle;
analysisSheet.getRange(`D6:E${data.methodCounts.length + 5}`).values = data.methodCounts.map((row) => [
  row.method,
  row.count,
]);
analysisSheet.getRange("D:D").format.columnWidth = 34;

analysisSheet.getRange("A20:N20").merge();
analysisSheet.getRange("A20").values = [["Månad x metod"]];
analysisSheet.getRange("A20:N20").format = sectionStyle;

const matrixHeader = ["Metod", ...data.monthOrder];
analysisSheet.getRange("A21:M21").values = [matrixHeader];
analysisSheet.getRange("A21:M21").format = headerStyle;
analysisSheet.getRange(`A22:M${data.methodMonthMatrix.length + 21}`).values = data.methodMonthMatrix.map((row) => [
  row.method,
  ...data.monthOrder.map((month) => row[month]),
]);
analysisSheet.getRange("A:A").format.columnWidth = 34;
analysisSheet.getRange("B:M").format.columnWidth = 11;
analysisSheet.getRange("A:Z").format.wrapText = true;

const monthChart = analysisSheet.charts.add("line", analysisSheet.getRange(`A5:B${data.monthCounts.length + 5}`));
monthChart.title = "Aktiviteter per månad";
monthChart.hasLegend = false;
monthChart.setPosition("G4", "N18");
monthChart.xAxis = { axisType: "textAxis" };
monthChart.yAxis = { numberFormatCode: "0" };

const methodChart = analysisSheet.charts.add("bar", analysisSheet.getRange(`D5:E${data.methodCounts.length + 5}`));
methodChart.title = "Aktiviteter per metod";
methodChart.hasLegend = false;
methodChart.barOptions.direction = "bar";
methodChart.setPosition("G19", "N34");
methodChart.xAxis = { numberFormatCode: "0" };
methodChart.yAxis = { axisType: "textAxis" };

wheelSheet.getRange("A1:H1").merge();
wheelSheet.getRange("A1").values = [["Årshjul"]];
wheelSheet.getRange("A1:H1").format = titleStyle;
wheelSheet.getRange("A2:H2").merge();
wheelSheet.getRange("A2").values = [[
  "Bladet visar året som en planeringstavla: först en översikt per metod och månad, sedan månadskort med aktiviteter.",
]];
wheelSheet.getRange("A2:H2").format = {
  fill: brand.lightGold,
  font: { color: brand.gold, italic: true },
  wrapText: true,
  horizontalAlignment: "left",
  verticalAlignment: "center",
};

wheelSheet.getRange("A4:M4").merge();
wheelSheet.getRange("A4").values = [["Översikt per metod och månad"]];
wheelSheet.getRange("A4:M4").format = sectionStyle;
wheelSheet.getRange("A5:M5").values = [["Metod", ...data.monthOrder]];
wheelSheet.getRange("A5:M5").format = headerStyle;
wheelSheet.getRange(`A6:M${data.methodMonthMatrix.length + 5}`).values = data.methodMonthMatrix.map((row) => [
  row.method,
  ...data.monthOrder.map((month) => row[month]),
]);

const methodMatrixEnd = data.methodMonthMatrix.length + 5;
for (let rowOffset = 0; rowOffset < data.methodMonthMatrix.length; rowOffset += 1) {
  const row = data.methodMonthMatrix[rowOffset];
  const rowIndex = 6 + rowOffset;
  for (let monthOffset = 0; monthOffset < data.monthOrder.length; monthOffset += 1) {
    const colIndex = monthOffset + 2;
    const value = Number(row[data.monthOrder[monthOffset]] ?? 0);
    const colLabel = String.fromCharCode(64 + colIndex);
    const cell = wheelSheet.getRange(`${colLabel}${rowIndex}`);
    if (value >= 3) {
      cell.format = {
        fill: "#93C5FD",
        font: { bold: true, color: brand.dark },
        horizontalAlignment: "center",
      };
    } else if (value === 2) {
      cell.format = { fill: "#DBEAFE", horizontalAlignment: "center" };
    } else if (value === 1) {
      cell.format = { fill: "#EFF6FF", horizontalAlignment: "center" };
    } else {
      cell.format = { horizontalAlignment: "center" };
    }
  }
}

wheelSheet.getRange("O4:P4").merge();
wheelSheet.getRange("O4").values = [["Aktivitetstopp"]];
wheelSheet.getRange("O4:P4").format = sectionStyle;
wheelSheet.getRange("O5:P8").values = [
  ["Flest aktiviteter", "Mars, Sep, Nov, Dec"],
  ["Största metod", data.methodCounts[0].method],
  ["Antal i största metod", data.methodCounts[0].count],
  ["Totalt antal aktiviteter", data.records.length],
];

wheelSheet.getRange("A12:P12").merge();
wheelSheet.getRange("A12").values = [["Månadsplanering"]];
wheelSheet.getRange("A12:P12").format = sectionStyle;

const cardColumns = [
  ["A", "D"],
  ["F", "I"],
  ["K", "N"],
];

for (let index = 0; index < data.monthOrder.length; index += 1) {
  const month = data.monthOrder[index];
  const records = recordsByMonth[month];
  const gridRow = Math.floor(index / 3);
  const gridCol = index % 3;
  const startRow = 14 + gridRow * 8;
  const endRow = startRow + 5;
  const [startCol, endCol] = cardColumns[gridCol];
  const boxRange = `${startCol}${startRow}:${endCol}${endRow}`;
  const headerRange = `${startCol}${startRow}:${endCol}${startRow}`;
  const bodyCell = `${startCol}${startRow + 1}`;
  const monthSummary = data.monthCounts.find((row) => row.month === month);
  const lines = records.length
    ? records.map((record) => `${record.method}: ${record.activity}`)
    : ["Inga registrerade aktiviteter"];

  wheelSheet.getRange(boxRange).format = {
    fill: "#FFFFFF",
    wrapText: true,
    verticalAlignment: "top",
  };
  wheelSheet.getRange(headerRange).merge();
  wheelSheet.getRange(`${startCol}${startRow}`).values = [[`${month} (${monthSummary.count})`]];
  wheelSheet.getRange(headerRange).format = headerStyle;
  wheelSheet.getRange(`${startCol}${startRow + 1}:${endCol}${endRow}`).merge();
  wheelSheet.getRange(bodyCell).values = [[lines.join("\n")]];
  wheelSheet.getRange(`${startCol}${startRow + 1}:${endCol}${endRow}`).format = {
    fill: brand.lightGray,
    font: { color: brand.gray, size: 10 },
    wrapText: true,
    verticalAlignment: "top",
  };
}

wheelSheet.getRange("A:A").format.columnWidth = 28;
wheelSheet.getRange("B:M").format.columnWidth = 10;
wheelSheet.getRange("N:N").format.columnWidth = 4;
wheelSheet.getRange("O:P").format.columnWidth = 20;
wheelSheet.getRange("A:P").format.wrapText = true;

for (const sheet of [sourceSheet, analysisSheet, wheelSheet]) {
  sheet.getUsedRange().format.verticalAlignment = "top";
}

await fs.mkdir(buildDir, { recursive: true });

const previewBlob = await workbook.render({
  sheetName: "Årshjul",
  autoCrop: "all",
  scale: 1,
  format: "png",
});
const previewBytes = new Uint8Array(await previewBlob.arrayBuffer());
await fs.writeFile(path.join(buildDir, "Arshjul_preview.png"), previewBytes);

const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(outPath);

console.log(`Saved ${outPath}`);
