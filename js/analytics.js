const Analytics = (() => {
  let overallChart = null;
  let projectChart = null;

  function destroy(c) { if (c) c.destroy(); }

  function buildOverall(projects, metric) {
    const labels = projects.map(p => p.name);
    let data = [];
    let dsLabel = "";

    if (metric === "volunteers") {
      dsLabel = "Total Volunteers (Int+Ext actual)";
      data = projects.map(p => (p.volunteersInternalActual || 0) + (p.volunteersExternalActual || 0));
    } else if (metric === "beneficiaries") {
      dsLabel = "Actual Beneficiaries";
      data = projects.map(p => (p.actualBeneficiaries || 0));
    } else {
      dsLabel = "Utilized AED";
      data = projects.map(p => (p.utilizedAed || 0));
    }

    const ctx = document.getElementById("overallChart");
    destroy(overallChart);
    overallChart = new Chart(ctx, {
      type: "bar",
      data: { labels, datasets: [{ label: dsLabel, data }] },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  function buildPerProject(p, metric) {
    const ctx = document.getElementById("projectChart");
    destroy(projectChart);

    if (!p) return;

    if (metric === "volunteers") {
      projectChart = new Chart(ctx, {
        type: "doughnut",
        data: {
          labels: ["Internal", "External"],
          datasets: [{ data: [p.volunteersInternalActual || 0, p.volunteersExternalActual || 0] }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
      return;
    }

    if (metric === "beneficiaries") {
      projectChart = new Chart(ctx, {
        type: "bar",
        data: {
          labels: ["Target", "Actual"],
          datasets: [{ label: "Beneficiaries", data: [p.targetedBeneficiaries || 0, p.actualBeneficiaries || 0] }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
      return;
    }

    projectChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Budget", "Utilized"],
        datasets: [{ label: "AED", data: [p.budgetAed || 0, p.utilizedAed || 0] }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  function renderFinanceTable(projects) {
    const tbody = document.querySelector("#financeTable tbody");
    tbody.innerHTML = projects.map(p => {
      const budget = Number(p.budgetAed || 0);
      const utilized = Number(p.utilizedAed || 0);
      const utilPct = budget > 0 ? Math.round((utilized / budget) * 100) : 0;
      const volInt = p.volunteersInternalActual || 0;
      const volExt = p.volunteersExternalActual || 0;
      return `
        <tr>
          <td><strong>${UI.esc(p.name)}</strong></td>
          <td>${budget.toLocaleString()}</td>
          <td>${utilized.toLocaleString()}</td>
          <td>${utilPct}%</td>
          <td>${(p.targetedBeneficiaries || 0)} / ${(p.actualBeneficiaries || 0)}</td>
          <td>${volInt} / ${volExt}</td>
        </tr>
      `;
    }).join("");
  }

  return { buildOverall, buildPerProject, renderFinanceTable };
})();
