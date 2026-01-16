(function () {
  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setPage(title, sub) {
    const t = document.getElementById("pageTitle");
    const s = document.getElementById("pageSub");
    if (t) t.textContent = title || "";
    if (s) s.textContent = sub || "";
  }

  window.UI = { esc, setPage };
})();
