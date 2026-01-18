(function(){
  function esc(s){
    return String(s ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function setPage(title, sub){
    const t = document.getElementById("pageTitle");
    const s = document.getElementById("pageSub");
    if (t) t.textContent = title || "";
    if (s) s.textContent = sub || "";
  }

  function badgePriority(p){
    const v = String(p || "medium").toLowerCase();
    if (v === "high") return `<span class="badge high">High</span>`;
    if (v === "low") return `<span class="badge low">Low</span>`;
    return `<span class="badge medium">Medium</span>`;
  }

  function openModal({ title, sub, bodyHtml, footerHtml }){
    const modal = document.getElementById("modal");
    document.getElementById("modalTitle").textContent = title || "";
    document.getElementById("modalSub").textContent = sub || "";
    document.getElementById("modalBody").innerHTML = bodyHtml || "";
    document.getElementById("modalFoot").innerHTML = footerHtml || "";
    modal.hidden = false;
  }

  function closeModal(){
    const modal = document.getElementById("modal");
    modal.hidden = true;
    document.getElementById("modalBody").innerHTML = "";
    document.getElementById("modalFoot").innerHTML = "";
  }

  function wireModalClose(){
    const btn = document.getElementById("modalCloseBtn");
    const modal = document.getElementById("modal");
    if (!btn || !modal) return;

    btn.onclick = closeModal;
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modal.hidden) closeModal();
    });
  }

  window.UI = { esc, setPage, badgePriority, openModal, closeModal, wireModalClose };
})();
