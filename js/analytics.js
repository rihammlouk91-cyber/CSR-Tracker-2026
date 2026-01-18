(function(){
  let overallChart = null;
  let projectChart = null;

  function destroyIf(chart){
    if (chart && typeof chart.destroy === "function") chart.destroy();
  }

  function sumProjects(projects, key){
    return projects.reduce((acc,p)=> acc + (Number(p[key] || 0) || 0), 0);
  }

  function ensureCanvas(id){
    const el = document.getElementById(id);
    if (!el) throw new Error(`Missing canvas #${id}`);
    return el.getContext("2d");
  }

  function chartBar(ctx, labels, data, title){
    return new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: title,
          data
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  function buildOverall(projects, metric){
    destroyIf(overallChart);

    const ctx = ensureCanvas("chartOverall");
    if (metric === "volunteers"){
      const internal = sumProjects(projects, "volIntTarget");
      const external = sumProjects(projects, "volExtTarget");
      overallChart = chartBar(ctx, ["Internal", "External"], [internal, external], "Volunteers");
      return;
    }

    if (metric === "beneficiaries"){
      const target = sumProjects(projects, "targetedBeneficiaries");
      const achieved = sumProjects(projects, "achievedBeneficiaries");
      overallChart = chartBar(ctx, ["Target", "Achieved"], [target, achieved], "Beneficiaries");
      return;
    }

    if (metric === "budget"){
      const budget = sumProjects(projects, "budgetAed");
      const utilized = sumProjects(projects, "utilizedAed");
      overallChart = chartBar(ctx, ["Budgeted", "Utilized"], [budget, utilized], "Budget (AED)");
      return;
    }
  }

  function buildPerProject(project, metric){
    destroyIf(projectChart);

    const ctx = ensureCanvas("chartProject");
    if (!project){
      projectChart = chartBar(ctx, ["—"], [0], "No project selected");
      return;
    }

    if (metric === "volunteers"){
      const internal = Number(project.volIntTarget || 0) || 0;
      const external = Number(project.volExtTarget || 0) || 0;
      projectChart = chartBar(ctx, ["Internal", "External"], [internal, external], "Volunteers");
      return;
    }

    if (metric === "beneficiaries"){
      const target = Number(project.targetedBeneficiaries || 0) || 0;
      const achieved = Number(project.achievedBeneficiaries || 0) || 0;
      projectChart = chartBar(ctx, ["Target", "Achieved"], [target, achieved], "Beneficiaries");
      return;
    }

    if (metric === "budget"){
      const budget = Number(project.budgetAed || 0) || 0;
      const utilized = Number(project.utilizedAed || 0) || 0;
      projectChart = chartBar(ctx, ["Budgeted", "Utilized"], [budget, utilized], "Budget (AED)");
      return;
    }
  }

  function renderFinanceTable(projects){
    const wrap = document.getElementById("financeTableWrap");
    if (!wrap) return;

    const rows = projects.map(p => {
      const budget = Number(p.budgetAed || 0) || 0;
      const utilized = Number(p.utilizedAed || 0) || 0;
      const pct = budget > 0 ? Math.round((utilized / budget) * 100) : 0;
      return `
        <tr>
          <td><strong>${UI.esc(p.name || "")}</strong></td>
          <td>AED ${budget.toLocaleString()}</td>
          <td>AED ${utilized.toLocaleString()}</td>
          <td><strong>${pct}%</strong></td>
        </tr>
      `;
    }).join("");

    wrap.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>Project</th>
            <th>Budgeted</th>
            <th>Utilized</th>
            <th>Utilization</th>
          </tr>
        </thead>
        <tbody>
          ${rows || `<tr><td colspan="4"><div class="hint">No projects yet.</div></td></tr>`}
        </tbody>
      </table>
    `;
  }

  window.Analytics = { buildOverall, buildPerProject, renderFinanceTable };
})();
