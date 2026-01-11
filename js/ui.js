const UI = (() => {
  const modal = document.getElementById("modal");
  const modalTitle = document.getElementById("modalTitle");
  const modalBody = document.getElementById("modalBody");
  const modalFooter = document.getElementById("modalFooter");

  function setPage(title, subtitle) {
    document.getElementById("pageTitle").textContent = title;
    document.getElementById("pageSubtitle").textContent = subtitle || "";
  }

  function openModal({ title, bodyHtml, footerHtml }) {
    modalTitle.textContent = title;
    modalBody.innerHTML = bodyHtml || "";
    modalFooter.innerHTML = footerHtml || "";
    modal.hidden = false;
  }

  function closeModal() {
    modal.hidden = true;
    modalBody.innerHTML = "";
    modalFooter.innerHTML = "";
  }

  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function pill(text, kind) {
    const cls = kind ? `pill ${kind}` : "pill";
    return `<span class="${cls}">${esc(text)}</span>`;
  }

  function badgePriority(p) {
    const x = (p || "").toLowerCase();
    if (x === "high") return `<span class="badge high">High</span>`;
    if (x === "medium") return `<span class="badge med">Medium</span>`;
    return `<span class="badge low">Low</span>`;
  }

  return { setPage, openModal, closeModal, esc, pill, badgePriority };
})();

document.getElementById("closeModalBtn").addEventListener("click", UI.closeModal);
document.getElementById("modal").addEventListener("click", (e) => {
  if (e.target.id === "modal") UI.closeModal();
});
