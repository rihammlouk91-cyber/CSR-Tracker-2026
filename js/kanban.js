(function(){
  const STATUSES = ["Pending", "Ongoing", "On Hold", "Completed"];

  function render(projects, onMove){
    const root = document.getElementById("kanbanRoot");
    if (!root) return;

    root.innerHTML = STATUSES.map(st => `
      <div class="kcol">
        <h4>${UI.esc(st)}</h4>
        <div class="kdrop" data-status="${UI.esc(st)}"></div>
      </div>
    `).join("");

    const byStatus = {};
    STATUSES.forEach(s => byStatus[s] = []);
    projects.forEach(p => {
      const s = p.status || "Pending";
      if (!byStatus[s]) byStatus[s] = [];
      byStatus[s].push(p);
    });

    root.querySelectorAll(".kdrop").forEach(drop => {
      const st = drop.getAttribute("data-status");
      const items = (byStatus[st] || []);

      drop.innerHTML = items.map(p => `
        <div class="kcard" draggable="true" data-id="${UI.esc(p.id)}">
          <div class="t">${UI.esc(p.name)} ${UI.badgePriority(p.priority)}</div>
          <div class="s">Owner: ${UI.esc(p.owner || "—")}</div>
        </div>
      `).join("") || `<div class="hint">No projects</div>`;
    });

    // Drag & drop
    let draggedId = null;

    root.querySelectorAll(".kcard").forEach(card => {
      card.addEventListener("dragstart", (e) => {
        draggedId = card.getAttribute("data-id");
        e.dataTransfer.setData("text/plain", draggedId);
      });
    });

    root.querySelectorAll(".kdrop").forEach(drop => {
      drop.addEventListener("dragover", (e) => {
        e.preventDefault();
        drop.classList.add("over");
      });
      drop.addEventListener("dragleave", () => drop.classList.remove("over"));
      drop.addEventListener("drop", async (e) => {
        e.preventDefault();
        drop.classList.remove("over");
        const id = e.dataTransfer.getData("text/plain") || draggedId;
        const newStatus = drop.getAttribute("data-status");
        if (id && newStatus && typeof onMove === "function"){
          await onMove(id, newStatus);
        }
      });
    });
  }

  window.Kanban = { render };
})();
