import ExcelJS from "exceljs";
import type { Booking, Room, RoomBlock } from "@/types";
import { calculateKpis } from "@/lib/analytics/calculate";
import { minutes } from "@/lib/booking/time";
const red = "FFE11D2E",
  black = "FF0B0B0D",
  gray = "FF6B7280",
  light = "FFF7F7F8";
function title(sheet: ExcelJS.Worksheet, text: string, subtitle: string, last = "H") {
  sheet.views = [{ state: "frozen", ySplit: 5 }];
  sheet.properties.defaultRowHeight = 22;
  sheet.properties.tabColor = { argb: red };
  sheet.mergeCells(`A1:${last}2`);
  sheet.getCell("A1").value = text;
  sheet.getCell("A1").font = {
    name: "Aptos Display",
    size: 22,
    bold: true,
    color: { argb: "FFFFFFFF" },
  };
  sheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: black } };
  sheet.getCell("A1").alignment = { vertical: "middle", indent: 1 };
  sheet.mergeCells(`A3:${last}3`);
  sheet.getCell("A3").value = subtitle;
  sheet.getCell("A3").font = { name: "Aptos", size: 10, color: { argb: gray } };
  sheet.getRow(3).height = 26;
  sheet.pageSetup = {
    paperSize: 9,
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    printTitlesRow: "1:5",
    margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
  };
  sheet.headerFooter.oddFooter = "&LInnovation Centre · Confidential&CPage &P of &N&RAsia/Yangon";
}
function header(sheet: ExcelJS.Worksheet, row: number, values: string[]) {
  sheet.getRow(row).values = values;
  sheet.getRow(row).height = 30;
  sheet.getRow(row).eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: red } };
    cell.font = { name: "Aptos", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", wrapText: true };
  });
}
function body(sheet: ExcelJS.Worksheet, start: number, end: number) {
  for (let r = start; r <= end; r++)
    sheet.getRow(r).eachCell((cell) => {
      cell.font = { name: "Aptos", size: 10, color: { argb: black } };
      cell.alignment = { vertical: "middle" };
      if (r % 2 === 0) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: light } };
    });
}
export async function buildWorkbook(
  rooms: Room[],
  bookings: Booking[],
  blocks: RoomBlock[],
  from: string,
  to: string,
) {
  const kpi = calculateKpis(rooms, bookings, blocks, from, to);
  const wb = new ExcelJS.Workbook();
  wb.creator = "Innovation Centre";
  wb.created = new Date();
  wb.calcProperties.fullCalcOnLoad = true;
  const summary = wb.addWorksheet("Overview");
  title(
    summary,
    "Innovation Centre | Room usage",
    `${from} to ${to} · Approved & completed bookings · Myanmar time`,
  );
  summary.columns = [
    { width: 32 },
    { width: 21 },
    { width: 19 },
    { width: 18 },
    { width: 18 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
  ];
  header(summary, 5, ["Metric", "Value", "", "", "", "", "", ""]);
  const details = wb.addWorksheet("Bookings");
  title(
    details,
    "Booking register",
    `Source: centre database · Exported ${new Date().toISOString()} · Contains private customer information`,
    "N",
  );
  const headers = [
    "Booking reference",
    "Room",
    "Full name",
    "Phone",
    "Date",
    "Start",
    "End",
    "Hours",
    "People",
    "Activity",
    "Status",
    "Created (Myanmar)",
    "Notes",
    "Email",
  ];
  details.columns = [24, 32, 24, 20, 16, 14, 14, 12, 12, 24, 16, 24, 45, 34].map((width) => ({
    width,
  }));
  header(details, 5, headers);
  for (const b of bookings)
    details.addRow([
      b.reference,
      rooms.find((r) => r.id === b.room_id)?.name || b.room_id,
      b.full_name,
      b.phone,
      new Date(`${b.booking_date}T00:00:00Z`),
      minutes(b.start_time) / 1440,
      minutes(b.end_time) / 1440,
      b.duration_minutes / 60,
      b.number_of_people,
      b.purpose,
      b.status,
      new Date(new Date(b.created_at).getTime() + 390 * 60000),
      b.notes,
      b.email || "",
    ]);
  const last = Math.max(6, bookings.length + 5);
  body(details, 6, last);
  details.autoFilter = `A5:N${last}`;
  details.views = [{ state: "frozen", xSplit: 2, ySplit: 5 }];
  details.getColumn(5).numFmt = "dd mmm yyyy";
  details.getColumn(6).numFmt = "h:mm AM/PM";
  details.getColumn(7).numFmt = "h:mm AM/PM";
  details.getColumn(8).numFmt = "0.0";
  details.getColumn(9).numFmt = "#,##0";
  details.getColumn(12).numFmt = "dd mmm yyyy h:mm AM/PM";
  details.getColumn(4).numFmt = "@";
  for (let r = 6; r <= bookings.length + 5; r++) {
    const cell = details.getCell(r, 11);
    const status = bookings[r - 6].status;
    const color =
      status === "pending"
        ? "FF92400E"
        : status === "approved"
          ? red
          : status === "completed"
            ? "FF166534"
            : gray;
    cell.font = { bold: true, color: { argb: color }, name: "Aptos", size: 10 };
    details.getCell(r, 13).alignment = { wrapText: true, vertical: "middle" };
  }
  const daily = wb.addWorksheet("Daily usage");
  title(
    daily,
    "Daily usage | Operating capacity",
    `${from} to ${to} · Current room settings · Blocked hours excluded`,
    "E",
  );
  daily.columns = [{ width: 20 }, { width: 22 }, { width: 22 }, { width: 24 }, { width: 20 }];
  header(daily, 5, ["Date", "Bookings", "Booked hours", "Available hours", "Utilization"]);
  kpi.days.forEach((d) =>
    daily.addRow([
      new Date(`${d.date}T00:00:00Z`),
      d.bookings,
      d.bookedHours,
      d.availableHours,
      {
        formula: `IF(D${daily.rowCount + 1}=0,0,C${daily.rowCount + 1}/D${daily.rowCount + 1})`,
        result: d.utilization / 100,
      },
    ]),
  );
  body(daily, 6, daily.rowCount);
  daily.autoFilter = `A5:E${daily.rowCount}`;
  daily.getColumn(1).numFmt = "dd mmm yyyy";
  daily.getColumn(3).numFmt = "0.0";
  daily.getColumn(4).numFmt = "0.0";
  daily.getColumn(5).numFmt = "0.0%";
  daily.addConditionalFormatting({
    ref: `E6:E${daily.rowCount}`,
    rules: [
      {
        type: "colorScale",
        priority: 1,
        cfvo: [
          { type: "num", value: 0 },
          { type: "num", value: 1 },
        ],
        color: [{ argb: "FFFFFFFF" }, { argb: "FFFCA5A5" }],
      },
    ],
  });
  const count = `COUNTIFS(Bookings!K6:K${last},"approved")+COUNTIFS(Bookings!K6:K${last},"completed")`;
  const sum = (col: string) =>
    `SUMIFS(Bookings!${col}6:${col}${last},Bookings!K6:K${last},"approved")+SUMIFS(Bookings!${col}6:${col}${last},Bookings!K6:K${last},"completed")`;
  const metrics: [string, ExcelJS.CellValue, string][] = [
    ["Total bookings", { formula: count, result: kpi.totalBookings }, "#,##0"],
    ["Booked hours", { formula: sum("H"), result: kpi.totalHours }, '0.0 "hrs"'],
    ["Room utilization", { formula: "IF(B15=0,0,B7/B15)", result: kpi.utilization / 100 }, "0.0%"],
    [
      "Average booking duration",
      { formula: "IF(B6=0,0,B7/B6)", result: kpi.averageDuration },
      '0.0 "hrs"',
    ],
    [
      "Average people per booking",
      { formula: "IF(B6=0,0,B11/B6)", result: kpi.averagePeople },
      "0.0",
    ],
    ["Total participants", { formula: sum("I"), result: kpi.totalParticipants }, "#,##0"],
    ["Most popular day", kpi.popularDay, "@"],
    ["Most popular time", kpi.popularTime, "@"],
    ["Eligible activities", kpi.activities.length, "#,##0"],
    [
      "Available operating hours",
      { formula: `SUM('Daily usage'!D6:D${daily.rowCount})`, result: kpi.availableHours },
      '0.0 "hrs"',
    ],
  ];
  metrics.forEach(([label, value, format], i) => {
    const r = i + 6;
    summary.getCell(r, 1).value = label;
    summary.getCell(r, 2).value = value;
    summary.getCell(r, 2).numFmt = format;
    summary.getRow(r).height = 29;
  });
  body(summary, 6, 15);
  for (let r = 6; r <= 15; r++) {
    summary.getCell(r, 2).font = {
      name: "Aptos",
      size: r <= 8 ? 18 : 12,
      bold: true,
      color: { argb: r === 8 ? red : black },
    };
  }
  header(summary, 18, ["Activity", "Bookings", "Share"]);
  kpi.activities.forEach((a, i) => {
    summary.getRow(19 + i).values = [a.name, a.value, a.percent / 100];
    summary.getCell(19 + i, 3).numFmt = "0.0%";
  });
  body(summary, 19, 18 + kpi.activities.length);
  const note = 22 + kpi.activities.length;
  summary.mergeCells(`A${note}:H${note + 2}`);
  summary.getCell(`A${note}`).value =
    "Usage includes approved and completed reservations only. Participants are attendee places, not unique people. Availability uses current room operating settings minus blocked hours. This workbook contains confidential customer contact details.";
  summary.getCell(`A${note}`).alignment = { wrapText: true, vertical: "top" };
  summary.getCell(`A${note}`).font = { size: 10, color: { argb: gray } };
  return wb.xlsx.writeBuffer();
}
