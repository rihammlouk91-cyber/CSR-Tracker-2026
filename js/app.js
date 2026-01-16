/* =========================
   GLOBAL STATE
========================= */
let state = {
  projects: [],
  tasks: [],
  comms: [],
  leaves: [],
  selectedProjectId: null,
};

/* =========================
   UTILITIES
========================= */
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
  const list = state.tasks.filter(t => t.projectId === pid);
  if (!list.length) return 0;
  const done = list.filter(t => (t.status || "").toLowerCase() === "completed").length;
  return Math.round((done / list.length) * 100);
}

/* =========================
   UI VISIBILITY
========================= */
function setAdminVisibility(role) {
  document.querySelectorAll(".admin-only").forEach(el => {
    el.style.display = role === "admin" ? "" : "none";
  });
  const audit = document.getElementById("tab-audit");
  if (audit) audit.style.display = role === "admin" ? "" : "none";
}

/* =========================
   NAVIGATION
========================= */
function bindTabs() {
  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const tab = btn.dataset.tab;
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      document.getElementById(`tab-${tab}`)?.classList.add("active");

      const titles = {
        dashboard: "Dashboard",
        analytics: "Analytics",
        calendar: "Calendar",
        projects: "Projects",
        kanban: "Kanban",
        workload: "Workload",
        comms: "Branding & Communication",
        audit: "Audit Trail",
        data: "Data Export"
      };
      UI.setPage(titles[tab] || "", "");
    };
  });
}

/* =========================
   DATA LOAD
========================= */
async function refreshAll() {
  state.projects = await Store.listProjects();
  state.tasks = await Store.listAllTasks();
  state.comms = await Store.listCommunications();
  state.leaves = await Store.listLeaves();

  renderDashboard();
  renderProjects();
  renderAnalytics();
  renderKanban();
  renderWorkload();
  renderComms();
  renderCalendar();

  if (Store.getRole() === "admin") {
    renderAudit();
  }
}

/* =========================
   DASHBOARD
========================= */
function renderDashboard() {
  const active = state.projects.filter(p => p.status !== "Completed");
  document.getElementById("kpiActiveProjects").textContent = active.length;
  document.getElementById("kpiActiveProjectsSub").textContent = `Total: ${state.projects.length}`;

  const overdue = state.tasks.filter(t => t.status !== "Completed" && isOverdue(t.deadline));
  const dueWeek = state.tasks.filter(t => t.status !== "Completed" && isDueWithinDays(t.deadline, 7));

  document.getElementById("kpiOverdueTasks").textContent = overdue.length;
  document.getElementById("kpiDueWeek").textContent = dueWeek.length;

  document.getElementById("listProjectCompletion").innerHTML =
    active.map(p => `
      <div class="item">
        <div>
          <div class="item-title">${UI.esc(p.name)}</div>
          <div class="item-sub">${p.owner || "—"}</div>
        </div>
        <div class="item-meta"><strong>${completionRateForProject(p.id)}%</strong></div>
      </div>
    `).join("") || `<div class="hint">No active projects</div>`;
}

/* =========================
   PROJECTS
========================= */
function renderProjects() {
  const list = document.getElementById("projectList");
  if (!list) return;

  list.innerHTML = state.projects.map(p => `
    <div class="item" data-id="${p.id}">
      <div>
        <div class="item-title">${UI.esc(p.name)}</div>
        <div class="item-sub">${UI.esc(p.owner || "")} • ${p.status}</div>
      </div>
    </div>
  `).join("") || `<div class="hint">No projects</div>`;

  list.querySelectorAll(".item").forEach(el => {
    el.onclick = () => {
      state.selectedProjectId = el.dataset.id;
      renderProjectDetails();
    };
  });
}

function renderProjectDetails() {
  const pid = state.selectedProjectId;
  const p = state.projects.find(x => x.id === pid);
  if (!p) return;

  document.getElementById("projectDetailsTitle").textContent = p.name;
  document.getElementById("addTaskBtn").disabled = false;

  const tbody = document.querySelector("#taskTable tbody");
  const tasks = state.tasks.filter(t => t.projectId === pid);

  tbody.innerHTML = tasks.map(t => `
    <tr>
      <td>${UI.esc(t.name)}</td>
      <td>${t.status}</td>
      <td>${t.priority}</td>
      <td>${UI.esc(t.owner)}</td>
      <td>${t.deadline || ""}</td>
    </tr>
  `).join("") || `<tr><td colspan="5">No tasks</td></tr>`;
}

/* =========================
   ANALYTICS / KANBAN / ETC
========================= */
function renderAnalytics() {
  Analytics.buildOverall(state.projects, document.getElementById("overallMetric").value);
  Analytics.renderFinanceTable(state.projects);
}

function renderKanban() {
  Kanban.render(state.projects, async (id, status) => {
    const before = state.projects.find(p => p.id === id);
    await Store.updateProject(id, { status }, before);
    refreshAll();
  });
}

function renderWorkload() {
  const box = document.getElementById("memberWorkloadList");
  if (!box) return;

  const members = Store.getMembers();
  box.innerHTML = members.map(m => {
    const count = state.projects.filter(p => p.owner === m.name).length;
    return `
      <div class="item">
        <div class="item-title">${m.name}</div>
        <div class="item-meta">${count}</div>
      </div>
    `;
  }).join("");
}

function renderComms() {
  const list = document.getElementById("commList");
  if (!list) return;

  list.innerHTML = state.comms.map(c => `
    <div class="item">
      <div>
        <div class="item-title">${UI.esc(c.subject)}</div>
        <div class="item-sub">${c.status}</div>
      </div>
    </div>
  `).join("") || `<div class="hint">No communications</div>`;
}

function renderCalendar() {
  Cal.render(state.projects, state.leaves);
}

async function renderAudit() {
  const tbody = document.querySelector("#auditTable tbody");
  if (!tbody) return;

  const logs = await Store.listAudit();
  tbody.innerHTML = logs.map(l => `
    <tr>
      <td>${new Date(l.at).toLocaleString()}</td>
      <td>${l.byEmail}</td>
      <td>${l.type}</td>
      <td>${l.title}</td>
      <td>${l.action}</td>
    </tr>
  `).join("");
}

/* =========================
   INIT + AUTH
========================= */
function init() {
  bindTabs();

  document.getElementById("loginBtn").onclick = async () => {
    const email = loginEmail.value.trim();
    const password = loginPassword.value;
    authError.hidden = true;
    try {
      await auth.signInWithEmailAndPassword(email, password);
    } catch (e) {
      authError.hidden = false;
      authError.textContent = e.message;
    }
  };

  document.getElementById("registerBtn").onclick = async () => {
    const email = loginEmail.value.trim();
    const password = loginPassword.value;
    authError.hidden = true;
    try {
      await auth.createUserWithEmailAndPassword(email, password);
      const u = auth.currentUser;
      await db.collection(COL.roles).doc(u.uid).set({ role: "csr" }, { merge: true });
    } catch (e) {
      authError.hidden = false;
      authError.textContent = e.message;
    }
  };

  document.getElementById("signOutBtn").onclick = () => auth.signOut();

  auth.onAuthStateChanged(async user => {
    const authGate = document.getElementById("authGate");
    const tabs = document.getElementById("tabs");

    if (!user) {
      authGate.hidden = false;
      tabs.hidden = true;
      return;
    }

    authGate.hidden = true;
    tabs.hidden = false;

    const role = await Store.loadRole(user.uid);
    setAdminVisibility(role);

    await refreshAll();
  });
}

init();
