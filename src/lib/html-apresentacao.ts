export function limparHtmlApresentacao(html: string): string {
  if (!html.trim() || typeof document === "undefined") return html;
  const box = document.createElement("div");
  box.innerHTML = html;
  box.querySelectorAll("*").forEach((no) => {
    if (no.tagName === "H2") return;
    no.removeAttribute("bgcolor");
    if (no instanceof HTMLElement) {
      no.style.removeProperty("background");
      no.style.removeProperty("background-color");
    }
  });
  return box.innerHTML;
}

export function textoDeHtml(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}