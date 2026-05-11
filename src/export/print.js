import { renderPrintHtml } from "./print_html.js";

const REVOKE_DELAY_MS = 60_000;

export function openPrintView(project, report) {
  const html = renderPrintHtml(project, report);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (!win) {
    URL.revokeObjectURL(url);
    alert("Не удалось открыть новую вкладку. Разрешите всплывающие окна для этого сайта.");
    return;
  }
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}
