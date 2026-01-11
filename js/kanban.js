const Kanban = (() => {
  function render(projects, onMove) {
    const cols = document.querySelectorAll(".kanban-drop");
    cols.forEach(c => c.innerHTML = "");

    for (const p of projects) {
      const card = document.createElement("div");
      card.className = "kanban-card";
      card.draggable = true;
      card.dataset.id = p.id;
      card.dataset.title = p.name;
      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;">
          <div>
            <div style="font-weight:900">${UI.esc(p.name)}</div>
            <div style="color:#64748b;font-size:12px;margin-top:4px;">Owner: ${UI.esc(p.owner || "—")}</div>
          </div>
          ${UI.badgePriority(p.priority)}
        </div>
      `;

      card.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", p.id);
      });

      const drop = document.querySelector(`.kanban-drop[data-drop="${p.status || "Pending"}"]`);
      if (drop) drop.appendChild(card);
    }

    document.querySelectorAll(".kanban-drop").forEach(drop => {
      drop.addEventListener("dragover", (e) => e.preventDefault());
      drop.addEventListener("drop", async (e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData("text/plain");
        const newStatus = drop.dataset.drop;
        await onMove(id, newStatus);
      });
    });
  }

  return { render };
})();
