(function(){
  function download(filename, text){
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function toCsv(rows){
    if (!rows.length) return "";
    const headers = Object.keys(rows[0]);
    const escCell = (v) => {
      const s = String(v ?? "");
      if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replaceAll('"','""')}"`;
      return s;
    };
    const lines = [
      headers.join(","),
      ...rows.map(r => headers.map(h => escCell(r[h])).join(","))
    ];
    return lines.join("\n");
  }

  async function buildExportBundle(state){
    // Keep it simple: export flat lists per collection
    return {
      exportedAt: new Date().toISOString(),
      projects: state.projects || [],
      tasks: state.tasks || [],
      communications: state.comms || [],
      leaves: state.leaves || []
    };
  }

  async function exportJson(state){
    const bundle = await buildExportBundle(state);
    download(`csr-tracker-export-${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(bundle, null, 2));
  }

  async function exportCsv(state){
    // Export multiple CSVs in one: easiest approach = one CSV containing everything as rows with "type"
    const rows = [];

    (state.projects || []).forEach(p => rows.push({ type:"project", id:p.id, name:p.name, owner:p.owner, status:p.status, priority:p.priority, budgetAed:p.budgetAed, utilizedAed:p.utilizedAed, targetedBeneficiaries:p.targetedBeneficiaries, achievedBeneficiaries:p.achievedBeneficiaries, startDate:p.startDate, endDate:p.endDate }));
    (state.tasks || []).forEach(t => rows.push({ type:"task", id:t.id, projectId:t.projectId, name:t.name, owner:t.owner, status:t.status, priority:t.priority, supportTeam:t.supportTeam, deadline:t.deadline }));
    (state.comms || []).forEach(c => rows.push({ type:"communication", id:c.id, date:c.date, subject:c.subject, status:c.status, priority:c.priority, contentOwner:c.contentOwner, deadline:c.deadline, audience:c.audience, channels: JSON.stringify(c.channels || {}) }));
    (state.leaves || []).forEach(l => rows.push({ type:"leave", id:l.id, member:l.member, startDate:l.startDate, endDate:l.endDate, note:l.note }));

    const csv = toCsv(rows);
    download(`csr-tracker-export-${new Date().toISOString().slice(0,10)}.csv`, csv);
  }

  window.ExportTool = { exportJson, exportCsv, buildExportBundle };
})();
