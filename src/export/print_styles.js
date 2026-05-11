export const PRINT_STYLES = `
@page { size: A4 landscape; margin: 10mm; }
* { box-sizing: border-box; }
body {
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  color: #000; background: #fff;
  margin: 0; padding: 0;
  font-size: 12px;
}
.print-controls {
  position: fixed; top: 8px; right: 8px;
  background: #222; color: #eee;
  border: 1px solid #555; border-radius: 3px;
  padding: 6px 12px; font-size: 13px;
  cursor: pointer;
  z-index: 100;
}
.report-header {
  display: flex; align-items: baseline; justify-content: space-between;
  border-bottom: 1px solid #888; padding-bottom: 4px; margin-bottom: 8px;
}
.report-header h1 { margin: 0; font-size: 18px; }
.report-header .meta { font-size: 11px; color: #444; }
.report-header .meta span { margin-left: 12px; }
.scheme { width: 100%; max-height: 72vh; display: block; margin: 0 auto; }
.report-tables { margin-top: 8px; display: grid; grid-template-columns: 2fr 1fr; gap: 12px; }
table.points { border-collapse: collapse; width: 100%; font-size: 11px; }
table.points th, table.points td { border: 1px solid #888; padding: 3px 6px; text-align: left; }
table.points th { background: #eee; }
table.points tr { break-inside: avoid; }
tr.overloaded td { font-weight: bold; color: #c00; }
.summary { font-size: 11px; }
.summary h3 { font-size: 12px; margin: 0 0 4px 0; }
.summary ul { margin: 0; padding-left: 16px; }
.warnings { color: #b00; margin-top: 4px; }
@media print {
  .print-controls { display: none; }
}
`;
