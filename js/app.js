let state = {
  projects: [],
  tasks: [],
  selectedProjectId: null,
};

function isOverdue(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const t = new Date();
  d.setHours(0,0,0,0);
  t.setHours(0,0,0,0);
  return d < t;
}

function isDueWithinDays(dateStr, days) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const t = new Date();
  d.setHours(0,0,0,0);
  t.setHours(0,0,0,0);
  const diff = (d - t) / 86400000;
  return diff >= 0 && diff <= days;
}

function completionRateForProject(pid) {
  const tasks = state.tasks.filter(t => t.projectId === pid);
  if (!tasks.length) return 0;
  const done = tasks.filter(t => (t.status || "").toLowerCase() === "completed").length;
  return Math.round((done / tasks.length) * 100);
}

function setAdminVisibility(role) {
  const auditBtn = document.getElementById("tab-audit");
  if (auditBtn) auditBtn.style.display = (role === "admin") ? "" : "none";
}

function bindTabs() {
  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const tab = btn.dataset.tab;
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      document.getElementById(`tab-${tab}`)?.classList.add("active");

      if (tab === "dashboard") UI.setPage("Dashboard", "Overview");
      if (tab === "projects") UI.setPage("Projects", "Create and manage projects");
      if (tab === "audit") UI.setPage("Audit Trail", "Admin only");
    });
  });
}

async function refreshAll() {
  state.projects = await Store.listProjects();
  state.tasks = await Store.listAllTasks();

  renderDashboard();
  renderProjects();
  renderProjectDetails();
  if (Store.getRole() === "admin") await renderAudit();
}

function renderDashboard() {
  const active = state.projects.filter(p => (p.status || "") !== "Completed");
  const overdue = state.tasks.filter(t => (t.status || "").toLowerCase() !== "completed" && isOverdue(t.deadline));
  const dueWeek = state.tasks.filter(t => (t.status || "").toLowerCase() !== "completed" && isDueWithinDays(t.deadline, 7));

  document.getElementById("kpiActiveProjects").textContent = active.length;
  document.getElementById("kpiOverdueTasks").textContent = overdue.length;
  document.getElementById("kpiDueWeek").textContent = dueWeek.length;

  document.getElementById("listProjectCompletion").innerHTML =
    active.map(p => `
      <div class="item">
        <div>
          <div class="item-title">${UI.esc(p.name)}</div>
          <div class="item-sub">Owner: ${UI.esc(p.owner || "—")} • Status: ${UI.esc(p.status || "—")}</div>
        </div>
        <div class="item-meta"><strong>${completionRateForProject(p.id)}%</strong></div>
      </div>
    `).join("") || `<div class="hint">No active projects.</div>`;
}

function renderProjects() {
  const list = document.getElementById("projectList");
  const q = (document.getElementById("projectSearch").value || "").toLowerCase().trim();
  const filtered = state.projects.filter(p => !q || (p.name || "").toLowerCase().includes(q));

  list.innerHTML = filtered.map(p => `
    <div class="item" data-pid="${p.id}" style="cursor:pointer">
      <div>
        <div class="item-title">${UI.esc(p.name)}</div>
        <div class="item-sub">Owner: ${UI.esc(p.owner || "—")} • Status: ${UI.esc(p.status || "—")}</div>
      </div>
      <div class="item-meta">${UI.esc(p.launchDate || "")}</div>
    </div>
  `).join("") || `<div class="hint">No projects yet.</div>`;

  list.querySelectorAll(".item").forEach(el => {
    el.addEventListener("click", () => {
      state.selectedProjectId = el.getAttribute("data-pid");
      renderProjectDetails();
    });
  });
}

function renderProjectDetails() {
  const pid = state.selectedProjectId;
  const p = state.projects.find(x => x.id === pid);

  const title = document.getElementById("projectDetailsTitle");
  const meta = document.getElementById("projectDetailsMeta");
  const addTaskBtn = document.getElementById("addTaskBtn");

  if (!p) {
    title.textContent = "Select a project";
    meta.textContent = "Pick a project to see tasks.";
    addTaskBtn.disabled = true;
    document.querySelector("#taskTable tbody").innerHTML = "";
    return;
  }

  title.textContent = p.name;
  meta.textContent = `Owner: ${p.owner || "—"} • Budget: AED ${Number(p.budgetAed || 0).toLocaleString()} • Status: ${p.status || "—"}`;
  addTaskBtn.disabled = false;

  const tasks = state.tasks.filter(t => t.projectId === pid);
  document.querySelector("#taskTable tbody").innerHTML = tasks.map(t => `
    <tr>
      <td><strong>${UI.esc(t.name)}</strong></td>
      <td>${UI.esc(t.status || "")}</td>
      <td>${UI.esc(t.priority || "")}</td>
      <td>${UI.esc(t.owner || "")}</td>
      <td style="${isOverdue(t.deadline) && (t.status||"").toLowerCase()!=="completed" ? "color:var(--danger);font-weight:900" : ""}">
        ${UI.esc(t.deadline || "")}
      </td>
    </tr>
  `).join("") || `<tr><td colspan="5"><div class="hint">No tasks for this project yet.</div></td></tr>`;
}

/* ---------- SIMPLE FORMS (prompt-based for now) ---------- */
async function createProjectPrompt() {
  const name = prompt("Project name?");
  if (!name) return;

  const owner = prompt("Owner (CSR name)?") || "";
  const budgetAed = Number(prompt("Budget AED? (number)") || "0");

  await Store.createProject({
    name,
    owner,
    budgetAed,
    priority: "Medium",
    status: "Pending",
    targetedBeneficiaries: 0,
    launchDate: "",
  });

  await refreshAll();
}

async function createTaskPrompt() {
  const pid = state.selectedProjectId;
  if (!pid) return;

  const name = prompt("Task name?");
  if (!name) return;

  const owner = prompt("Task owner?") || "";
  const deadline = prompt("Deadline (YYYY-MM-DD) optional") || "";

  await Store.createTask({
    projectId: pid,
    name,
    owner,
    deadline,
    status: "Pending",
    priority: "Medium"
  });

  await refreshAll();
}

async function renderAudit() {
  const tbody = document.querySelector("#auditTable tbody");
  tbody.innerHTML = `<tr><td colspan="5"><div class="hint">Loading...</div></td></tr>`;
  try {
    const logs = await Store.listAudit();
    tbody.innerHTML = logs.map(l => `
      <tr>
        <td>${new Date(l.at).toLocaleString()}</td>
        <td>${UI.esc(l.byEmail || "")}</td>
        <td>${UI.esc(l.type || "")}</td>
        <td>${UI.esc(l.title || "")}</td>
        <td>${UI.esc(l.action || "")}</td>
      </tr>
    `).join("") || `<tr><td colspan="5"><div class="hint">No logs yet.</div></td></tr>`;
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="error">${UI.esc(e.message)}</div></td></tr>`;
  }
}

/* ---------- AUTH + BOOT ---------- */
function init() {
  bindTabs();

  document.getElementById("projectSearch").addEventListener("input", renderProjects);
  document.getElementById("newProjectBtn").addEventListener("click", createProjectPrompt);
  document.getElementById("addTaskBtn").addEventListener("click", createTaskPrompt);
  document.getElementById("logoutBtn").addEventListener("click", () => auth.signOut());

  document.getElementById("loginBtn").addEventListener("click", async () => {
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const err = document.getElementById("authError");
    err.hidden = true;

    try {
      await auth.signInWithEmailAndPassword(email, password);
    } catch (e) {
      err.hidden = false;
      err.textContent = e.message;
    }
  });

  document.getElementById("registerBtn").addEventListener("click", async () => {
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const err = document.getElementById("authError");
    err.hidden = true;

    try {
      await auth.createUserWithEmailAndPassword(email, password);
      const u = auth.currentUser;
      await db.collection(COL.roles).doc(u.uid).set({ role: "csr" }, { merge: true });
    } catch (e) {
      err.hidden = false;
      err.textContent = e.message;
    }
  });

  auth.onAuthStateChanged(async (user) => {
    const authWrap = document.getElementById("authWrap");
    const appWrap = document.getElementById("appWrap");
    const who = document.getElementById("whoami");

    if (!user) {
      authWrap.hidden = false;
      appWrap.hidden = true;
      who.textContent = "—";
      return;
    }

    authWrap.hidden = true;
    appWrap.hidden = false;
    who.textContent = await Store.whoAmI();

    const role = await Store.ensureRole(user);
    setAdminVisibility(role);

    await refreshAll();
  });
}

init();
