let state = {
  projects: [],
  tasks: [],
  comms: [],
  leaves: [],
  selectedProjectId: null,
};

function isOverdue(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const today = new Date();
  d.setHours(0,0,0,0);
  today.setHours(0,0,0,0);
  return d < today;
}

function isDueWithinDays(dateStr, days) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const today = new Date();
  d.setHours(0,0,0,0);
  today.setHours(0,0,0,0);
  const diff = (d - today) / (1000*60*60*24);
  return diff >= 0 && diff <= days;
}

function completionRateForProject(projectId) {
  const tasks = state.tasks.filter(t => t.projectId === projectId);
  if (!tasks.length) return 0;
  const done = tasks.filter(t => (t.status || "").toLowerCase() === "completed").length;
  return Math.round((done / tasks.length) * 100);
}

function setAdminVisibility(role) {
  document.querySelectorAll(".admin-only").forEach(el => {
    el.style.display = (role === "admin") ? "" : "none";
  });
  const auditTab = document.getElementById("tab-audit");
  if (role !== "admin") auditTab.style.display = "none";
}

function bindTabs() {
  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.addEventListener("click", async () => {
      document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const tab = btn.dataset.tab;
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      document.getElementById(`tab-${tab}`).classList.add("active");

      if (tab === "dashboard") UI.setPage("Dashboard", "Overview of active projects and tasks");
      if (tab === "analytics") UI.setPage("Analytics", "Per project and overall charts");
      if (tab === "calendar") UI.setPage("Calendar", "Leave and project timelines");
      if (tab === "projects") UI.setPage("Projects", "Create and manage projects and tasks");
      if (tab === "kanban") UI.setPage("Kanban", "Move projects across statuses");
      if (tab === "workload") UI.setPage("Workload", "How many projects each member owns");
      if (tab === "comms") UI.setPage("Branding & Communication", "Track comms workflow and tasks");
      if (tab === "audit") UI.setPage("Audit Trail", "Admin-only change log");
      if (tab === "data") UI.setPage("Data Export", "Extract data from the site");
    });
  });
}

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
    await renderAudit();
  }
}

function renderDashboard() {
  const activeProjects = state.projects.filter(p => (p.status || "") !== "Completed");
  document.getElementById("kpiActiveProjects").textContent = activeProjects.length;
  document.getElementById("kpiActiveProjectsSub").textContent = `Total projects: ${state.projects.length}`;

  const overdueTasks = state.tasks.filter(t => (t.status || "").toLowerCase() !== "completed" && isOverdue(t.deadline));
  const dueWeek = state.tasks.filter(t => (t.status || "").toLowerCase() !== "completed" && isDueWithinDays(t.deadline, 7));

  document.getElementById("kpiOverdueTasks").textContent = overdueTasks.length;
  document.getElementById("kpiDueWeek").textContent = dueWeek.length;

  const highPriority = state.tasks
    .filter(t => (t.status || "").toLowerCase() !== "completed" && (t.priority || "").toLowerCase() === "high")
    .slice(0, 10);

  document.getElementById("listHighPriority").innerHTML = highPriority.length ? highPriority.map(t => {
    const p = state.projects.find(x => x.id === t.projectId);
    return `
      <div class="item">
        <div>
          <div class="item-title">${UI.esc(t.name)} ${UI.badgePriority("high")}</div>
          <div class="item-sub">Project: ${UI.esc(p?.name || "—")} • Owner: ${UI.esc(t.owner || "—")} • Support: ${UI.esc(t.supportTeam || "—")}</div>
        </div>
        <div class="item-meta">${UI.esc(t.deadline || "No deadline")}</div>
      </div>
    `;
  }).join("") : `<div class="hint">No high priority pending tasks.</div>`;

  document.getElementById("listOverdue").innerHTML = overdueTasks.slice(0, 12).map(t => {
    const p = state.projects.find(x => x.id === t.projectId);
    return `
      <div class="item">
        <div>
          <div class="item-title">${UI.esc(t.name)}</div>
          <div class="item-sub">Project: ${UI.esc(p?.name || "—")} • Owner: ${UI.esc(t.owner || "—")}</div>
        </div>
        <div class="item-meta" style="color:var(--danger);font-weight:800">${UI.esc(t.deadline)}</div>
      </div>
    `;
  }).join("") || `<div class="hint">No overdue tasks.</div>`;

  document.getElementById("listDueWeek").innerHTML = dueWeek.slice(0, 12).map(t => {
    const p = state.projects.find(x => x.id === t.projectId);
    return `
      <div class="item">
        <div>
          <div class="item-title">${UI.esc(t.name)}</div>
          <div class="item-sub">Project: ${UI.esc(p?.name || "—")} • Owner: ${UI.esc(t.owner || "—")}</div>
        </div>
        <div class="item-meta">${UI.esc(t.deadline)}</div>
      </div>
    `;
  }).join("") || `<div class="hint">Nothing due this week.</div>`;

  document.getElementById("listProjectCompletion").innerHTML = activeProjects.map(p => {
    const rate = completionRateForProject(p.id);
    return `
      <div class="item">
        <div>
          <div class="item-title">${UI.esc(p.name)}</div>
          <div class="item-sub">Owner: ${UI.esc(p.owner || "—")} • Status: ${UI.esc(p.status || "—")}</div>
        </div>
        <div class="item-meta"><strong>${rate}%</strong></div>
      </div>
    `;
  }).join("") || `<div class="hint">No active projects.</div>`;
}

function renderAnalytics() {
  const projects = state.projects;
  const overallMetric = document.getElementById("overallMetric").value;

  Analytics.buildOverall(projects, overallMetric);
  Analytics.renderFinanceTable(projects);

  const sel = document.getElementById("projectAnalyticsSelect");
  sel.innerHTML = projects.map(p => `<option value="${p.id}">${UI.esc(p.name)}</option>`).join("");
  const current = projects.find(p => p.id === sel.value) || projects[0];
  const metric = document.getElementById("overallMetric").value;
  Analytics.buildPerProject(current, metric);
}

document.getElementById("overallMetric").addEventListener("change", () => renderAnalytics());
document.getElementById("projectAnalyticsSelect").addEventListener("change", () => {
  const p = state.projects.find(x => x.id === document.getElementById("projectAnalyticsSelect").value);
  const metric = document.getElementById("overallMetric").value;
  Analytics.buildPerProject(p, metric);
});

function renderCalendar() {
  Cal.render(state.projects, state.leaves);

  const leaveList = document.getElementById("leaveList");
  leaveList.innerHTML = state.leaves.map(l => `
    <div class="item">
      <div>
        <div class="item-title">${UI.esc(l.member)}</div>
        <div class="item-sub">${UI.esc(l.startDate)} → ${UI.esc(l.endDate)} ${l.note ? "• " + UI.esc(l.note) : ""}</div>
      </div>
      <div class="item-meta">Leave</div>
    </div>
  `).join("") || `<div class="hint">No leaves added yet.</div>`;
}

function renderKanban() {
  Kanban.render(state.projects, async (id, newStatus) => {
    const before = state.projects.find(p => p.id === id);
    await Store.updateProject(id, { status: newStatus }, before);
    await refreshAll();
  });
}

function renderWorkload() {
  const members = Store.getMembers();
  const list = document.getElementById("memberWorkloadList");
  const counts = members.map(m => {
    const owned = state.projects.filter(p => (p.owner || "").toLowerCase() === (m.name || "").toLowerCase());
    return { name: m.name, count: owned.length };
  }).sort((a,b) => b.count - a.count);

  list.innerHTML = counts.map(x => `
    <div class="item" data-member="${UI.esc(x.name)}" style="cursor:pointer">
      <div>
        <div class="item-title">${UI.esc(x.name)}</div>
        <div class="item-sub">Owned projects</div>
      </div>
      <div class="item-meta"><strong>${x.count}</strong></div>
    </div>
  `).join("") || `<div class="hint">Add members in Firestore members collection.</div>`;

  list.querySelectorAll(".item").forEach(el => {
    el.addEventListener("click", () => {
      const name = el.getAttribute("data-member");
      const owned = state.projects.filter(p => (p.owner || "").toLowerCase() === name.toLowerCase());
      document.getElementById("memberDetailsTitle").textContent = name;
      document.getElementById("memberProjectsList").innerHTML = owned.map(p => `
        <div class="item">
          <div>
            <div class="item-title">${UI.esc(p.name)}</div>
            <div class="item-sub">Status: ${UI.esc(p.status)} • Priority: ${UI.esc(p.priority)}</div>
          </div>
          <div class="item-meta">${UI.esc(p.launchDate || "")}</div>
        </div>
      `).join("") || `<div class="hint">No projects owned by ${UI.esc(name)}.</div>`;
    });
  });
}

function renderProjects() {
  const list = document.getElementById("projectList");
  const q = (document.getElementById("projectSearch").value || "").toLowerCase().trim();
  const filtered = state.projects.filter(p => !q || (p.name || "").toLowerCase().includes(q));

  list.innerHTML = filtered.map(p => `
    <div class="item" data-pid="${p.id}" style="cursor:pointer">
      <div>
        <div class="item-title">${UI.esc(p.name)} ${UI.badgePriority(p.priority)}</div>
        <div class="item-sub">Owner: ${UI.esc(p.owner || "—")} • Status: ${UI.esc(p.status || "—")}</div>
      </div>
      <div class="item-meta">${UI.esc(p.launchDate || "")}</div>
    </div>
  `).join("") || `<div class="hint">No projects yet. Create one.</div>`;

  list.querySelectorAll(".item").forEach(el => {
    el.addEventListener("click", async () => {
      state.selectedProjectId = el.getAttribute("data-pid");
      await renderProjectDetails();
    });
  });
}

document.getElementById("projectSearch").addEventListener("input", renderProjects);

async function renderProjectDetails() {
  const pid = state.selectedProjectId;
  const p = state.projects.find(x => x.id === pid);
  const title = document.getElementById("projectDetailsTitle");
  const meta = document.getElementById("projectDetailsMeta");
  const addTaskBtn = document.getElementById("addTaskBtn");
  addTaskBtn.disabled = !p;

  if (!p) {
    title.textContent = "Select a project";
    meta.textContent = "Pick a project to see tasks.";
    document.querySelector("#taskTable tbody").innerHTML = "";
    return;
  }

  title.textContent = p.name;
  meta.textContent = `Owner: ${p.owner || "—"} • Budget: AED ${Number(p.budgetAed || 0).toLocaleString()} • Status: ${p.status || "—"}`;

  const tasks = state.tasks.filter(t => t.projectId === pid);
  const tbody = document.querySelector("#taskTable tbody");
  tbody.innerHTML = tasks.map(t => `
    <tr>
      <td><strong>${UI.esc(t.name)}</strong><div class="hint">${UI.esc(t.description || "")}</div></td>
      <td>${UI.esc(t.status || "")}</td>
      <td>${UI.esc(t.priority || "")}</td>
      <td>${UI.esc(t.owner || "")}</td>
      <td>${UI.esc(t.supportTeam || "")}</td>
      <td style="${isOverdue(t.deadline) && (t.status||"").toLowerCase()!=="completed" ? "color:var(--danger);font-weight:800" : ""}">
        ${UI.esc(t.deadline || "")}
      </td>
      <td><button class="btn soft" data-edit-task="${t.id}">Edit</button></td>
    </tr>
  `).join("") || `<tr><td colspan="7"><div class="hint">No tasks for this project yet.</div></td></tr>`;

  tbody.querySelectorAll("[data-edit-task]").forEach(btn => {
    btn.addEventListener("click", () => openEditTaskModal(btn.getAttribute("data-edit-task")));
  });
}

function renderComms() {
  const active = state.comms.filter(c => (c.status || "").toLowerCase() !== "done" && (c.status || "").toLowerCase() !== "completed");
  document.getElementById("kpiActiveComms").textContent = active.length;

  // "Comms overdue tasks" concept: use comm.deadline (optional)
  const overdue = state.comms.filter(c => (c.status || "").toLowerCase() !== "done" && isOverdue(c.deadline));
  const dueWeek = state.comms.filter(c => (c.status || "").toLowerCase() !== "done" && isDueWithinDays(c.deadline, 7));

  document.getElementById("kpiOverdueComms").textContent = overdue.length;
  document.getElementById("kpiDueCommsWeek").textContent = dueWeek.length;

  const q = (document.getElementById("commSearch").value || "").toLowerCase().trim();
  const filtered = state.comms.filter(c => !q || (c.subject || "").toLowerCase().includes(q));

  document.getElementById("commList").innerHTML = filtered.map(c => `
    <div class="item">
      <div>
        <div class="item-title">${UI.esc(c.subject)} ${UI.badgePriority(c.priority || "medium")}</div>
        <div class="item-sub">${UI.esc(c.type || "")} • ${UI.esc(c.status || "")} • Audience: ${UI.esc(c.audience || "")}</div>
        <div class="item-sub">Owner: ${UI.esc(c.contentOwner || "—")}</div>
      </div>
      <div class="item-meta">${UI.esc(c.date || "")}${c.deadline ? `<div class="hint">Deadline: ${UI.esc(c.deadline)}</div>` : ""}</div>
    </div>
  `).join("") || `<div class="hint">No communications yet.</div>`;

  const high = state.comms
    .filter(c => (c.status || "").toLowerCase() !== "done" && (c.priority || "").toLowerCase() === "high")
    .slice(0, 10);

  document.getElementById("commHighPriorityList").innerHTML = high.map(c => `
    <div class="item">
      <div>
        <div class="item-title">${UI.esc(c.subject)}</div>
        <div class="item-sub">Pending with: ${UI.esc(c.contentOwner)} • Campaign: ${UI.esc(c.campaign)}</div>
      </div>
      <div class="item-meta">${UI.esc(c.status)}</div>
    </div>
  `).join("") || `<div class="hint">No high priority comms pending.</div>`;
}

document.getElementById("commSearch").addEventListener("input", renderComms);

// --- AUDIT ---
async function renderAudit() {
  const tbody = document.querySelector("#auditTable tbody");
  tbody.innerHTML = `<tr><td colspan="6"><div class="hint">Loading...</div></td></tr>`;
  try {
    const logs = await Store.listAudit();
    tbody.innerHTML = logs.map(l => `
      <tr>
        <td>${UI.esc(new Date(l.at).toLocaleString())}</td>
        <td>${UI.esc(l.byEmail)}</td>
        <td>${UI.esc(l.type)}</td>
        <td><strong>${UI.esc(l.title)}</strong></td>
        <td>${UI.esc(l.action)}</td>
        <td><pre style="white-space:pre-wrap;margin:0">${UI.esc(l.changes ? JSON.stringify(l.changes, null, 2) : "")}</pre></td>
      </tr>
    `).join("") || `<tr><td colspan="6"><div class="hint">No audit logs yet.</div></td></tr>`;
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="error">Cannot load audit (admin only). ${UI.esc(e.message)}</div></td></tr>`;
  }
}

// --- FORMS: Project / Task / Communication / Leave ---
function openNewProjectModal() {
  const members = Store.getMembers().map(m => `<option>${UI.esc(m.name)}</option>`).join("");
  UI.openModal({
    title: "New Project",
    bodyHtml: `
      <div class="grid grid2">
        <div><label>Name *</label><input id="p_name" /></div>
        <div><label>Owner (CSR) *</label><select id="p_owner">${members}</select></div>

        <div><label>Priority *</label>
          <select id="p_priority">
            <option>High</option><option selected>Medium</option><option>Low</option>
          </select>
        </div>
        <div><label>Status *</label>
          <select id="p_status">
            <option selected>Pending</option><option>Ongoing</option><option>On Hold</option><option>Completed</option>
          </select>
        </div>

        <div><label>Budget (AED) *</label><input id="p_budget" type="number" min="0" /></div>
        <div><label>Targeted beneficiaries *</label><input id="p_benef" type="number" min="0" /></div>

        <div><label>Launch date *</label><input id="p_launch" type="date" /></div>
        <div><label>End date</label><input id="p_end" type="date" /></div>

        <div><label>Target internal volunteers</label><input id="p_vint" type="number" min="0" /></div>
        <div><label>Target external volunteers</label><input id="p_vext" type="number" min="0" /></div>
      </div>
      <div class="error" id="p_err" hidden></div>
    `,
    footerHtml: `
      <button class="btn ghost" id="p_cancel">Cancel</button>
      <button class="btn" id="p_save">Save</button>
    `
  });

  document.getElementById("p_cancel").onclick = UI.closeModal;
  document.getElementById("p_save").onclick = async () => {
    const name = document.getElementById("p_name").value.trim();
    const owner = document.getElementById("p_owner").value.trim();
    const budgetAed = document.getElementById("p_budget").value;
    const targetedBeneficiaries = document.getElementById("p_benef").value;
    const launchDate = document.getElementById("p_launch").value;

    const err = document.getElementById("p_err");
    if (!name || !owner || !launchDate) {
      err.hidden = false;
      err.textContent = "Name, Owner, and Launch date are required.";
      return;
    }

    await Store.createProject({
      name,
      owner,
      priority: document.getElementById("p_priority").value,
      status: document.getElementById("p_status").value,
      budgetAed,
      targetedBeneficiaries,
      launchDate,
      endDate: document.getElementById("p_end").value,
      volIntTarget: document.getElementById("p_vint").value,
      volExtTarget: document.getElementById("p_vext").value,
      startDate: launchDate
    });

    UI.closeModal();
    await refreshAll();
  };
}

function openNewTaskModal() {
  const pid = state.selectedProjectId;
  const p = state.projects.find(x => x.id === pid);
  if (!p) return;

  const members = Store.getMembers().map(m => `<option>${UI.esc(m.name)}</option>`).join("");

  UI.openModal({
    title: `New Task • ${p.name}`,
    bodyHtml: `
      <div class="grid grid2">
        <div class="grid-span-2"><label>Name *</label><input id="t_name" /></div>
        <div class="grid-span-2"><label>Description</label><textarea id="t_desc"></textarea></div>

        <div><label>Status *</label>
          <select id="t_status">
            <option selected>Pending</option><option>Ongoing</option><option>On Hold</option><option>Completed</option>
          </select>
        </div>
        <div><label>Priority *</label>
          <select id="t_priority"><option>High</option><option selected>Medium</option><option>Low</option></select>
        </div>

        <div><label>Owner *</label><select id="t_owner">${members}</select></div>
        <div><label>Support team</label><input id="t_support" placeholder="e.g., Marketing / External vendor" /></div>

        <div><label>Deadline</label><input id="t_deadline" type="date" /></div>
        <div><label>Target internal volunteers</label><input id="t_vint" type="number" min="0" /></div>

        <div><label>Target external volunteers</label><input id="t_vext" type="number" min="0" /></div>
        <div><label>Next steps</label><input id="t_next" /></div>

        <div class="grid-span-2"><label>Notes</label><textarea id="t_notes"></textarea></div>
      </div>
      <div class="error" id="t_err" hidden></div>
    `,
    footerHtml: `
      <button class="btn ghost" id="t_cancel">Cancel</button>
      <button class="btn" id="t_save">Save</button>
    `
  });

  document.getElementById("t_cancel").onclick = UI.closeModal;
  document.getElementById("t_save").onclick = async () => {
    const name = document.getElementById("t_name").value.trim();
    const owner = document.getElementById("t_owner").value.trim();
    const err = document.getElementById("t_err");
    if (!name || !owner) {
      err.hidden = false;
      err.textContent = "Task Name and Owner are required.";
      return;
    }

    await Store.createTask({
      projectId: pid,
      name,
      description: document.getElementById("t_desc").value,
      status: document.getElementById("t_status").value,
      priority: document.getElementById("t_priority").value,
      owner,
      supportTeam: document.getElementById("t_support").value,
      deadline: document.getElementById("t_deadline").value,
      targetedInternalVolunteers: document.getElementById("t_vint").value,
      targetedExternalVolunteers: document.getElementById("t_vext").value,
      nextSteps: document.getElementById("t_next").value,
      notes: document.getElementById("t_notes").value,
    });

    UI.closeModal();
    await refreshAll();
    await renderProjectDetails();
  };
}

function openNewCommunicationModal() {
  // Form matches your screenshot, plus your mandatory fields
  UI.openModal({
    title: "New Communication",
    bodyHtml: `
      <div class="grid grid2">
        <div><label>Date *</label><input id="c_date" type="date" /></div>
        <div><label>Status *</label>
          <select id="c_status">
            <option>Idea</option>
            <option>In progress</option>
            <option>Pending approval</option>
            <option>Done</option>
          </select>
        </div>

        <div><label>Type *</label>
          <select id="c_type">
            <option>Announcement</option>
            <option>Email campaign</option>
            <option>Event comms</option>
            <option>Reminder</option>
            <option>Other</option>
          </select>
        </div>

        <div>
          <label>Campaign (Optional)</label>
          <select id="c_campaign">
            <option selected>None - Standalone</option>
          </select>
          <div class="hint">Link this communication to an existing campaign</div>
        </div>

        <div class="grid-span-2"><label>Subject *</label><input id="c_subject" /></div>
        <div class="grid-span-2"><label>Audience *</label><input id="c_audience" placeholder="e.g., All Staff, Leadership, New Hires" /></div>

        <div class="grid-span-2">
          <label>Channels *</label>
          <div class="row gap" style="margin-top:8px;">
            <label style="display:flex;gap:8px;align-items:center;font-weight:700;"><input type="checkbox" id="ch_email"> Email</label>
            <label style="display:flex;gap:8px;align-items:center;font-weight:700;"><input type="checkbox" id="ch_ps"> PureSpace</label>
            <label style="display:flex;gap:8px;align-items:center;font-weight:700;"><input type="checkbox" id="ch_other"> Other</label>
          </div>
        </div>

        <div class="grid-span-2 card" style="box-shadow:none;">
          <div class="card-header"><h3 style="margin:0;">Workflow Status</h3></div>
          <div class="card-body">
            <div class="row gap" style="flex-wrap:wrap;">
              <label style="display:flex;gap:8px;align-items:center;"><input type="checkbox" id="wf_cr"> Content Received</label>
              <label style="display:flex;gap:8px;align-items:center;"><input type="checkbox" id="wf_ca"> Content Approved</label>
              <label style="display:flex;gap:8px;align-items:center;"><input type="checkbox" id="wf_dr"> Designs Received</label>
              <label style="display:flex;gap:8px;align-items:center;"><input type="checkbox" id="wf_da"> Designs Approved</label>
            </div>
          </div>
        </div>

        <div><label>Priority</label>
          <select id="c_priority"><option>High</option><option selected>Medium</option><option>Low</option></select>
        </div>
        <div><label>Deadline</label><input id="c_deadline" type="date" /></div>

        <div><label>Content Owner *</label><input id="c_owner" placeholder="Person responsible for content" /></div>
        <div><label>Design Requirements *</label><textarea id="c_design" placeholder="What designs are needed?"></textarea></div>

        <div class="grid-span-2"><label>Approval Notes</label><textarea id="c_approval" placeholder="Any approval notes or feedback"></textarea></div>
        <div class="grid-span-2"><label>General Notes</label><textarea id="c_notes" placeholder="Additional notes about this communication"></textarea></div>
      </div>

      <div class="error" id="c_err" hidden></div>
    `,
    footerHtml: `
      <button class="btn ghost" id="c_cancel">Cancel</button>
      <button class="btn" id="c_save">Save Communication</button>
    `
  });

  document.getElementById("c_cancel").onclick = UI.closeModal;
  document.getElementById("c_save").onclick = async () => {
    const err = document.getElementById("c_err");
    const date = document.getElementById("c_date").value;
    const subject = document.getElementById("c_subject").value.trim();
    const audience = document.getElementById("c_audience").value.trim();
    const contentOwner = document.getElementById("c_owner").value.trim();
    const designRequirements = document.getElementById("c_design").value.trim();

    const channels = {
      email: document.getElementById("ch_email").checked,
      purespace: document.getElementById("ch_ps").checked,
      other: document.getElementById("ch_other").checked
    };

    if (!date || !subject || !audience) {
      err.hidden = false;
      err.textContent = "Date, Subject, and Audience are required.";
      return;
    }
    if (!channels.email && !channels.purespace && !channels.other) {
      err.hidden = false;
      err.textContent = "At least one Channel is required.";
      return;
    }
    if (!contentOwner || !designRequirements) {
      err.hidden = false;
      err.textContent = "Content Owner and Design Requirements are required.";
      return;
    }

    await Store.createCommunication({
      date,
      status: document.getElementById("c_status").value,
      type: document.getElementById("c_type").value,
      campaign: document.getElementById("c_campaign").value,
      subject,
      audience,
      channels,
      workflow: {
        contentReceived: document.getElementById("wf_cr").checked,
        contentApproved: document.getElementById("wf_ca").checked,
        designsReceived: document.getElementById("wf_dr").checked,
        designsApproved: document.getElementById("wf_da").checked,
      },
      contentOwner,
      designRequirements,
      approvalNotes: document.getElementById("c_approval").value,
      generalNotes: document.getElementById("c_notes").value,
      priority: document.getElementById("c_priority").value,
      deadline: document.getElementById("c_deadline").value,
    });

    UI.closeModal();
    await refreshAll();
  };
}

function openNewLeaveModal() {
  const members = Store.getMembers().map(m => `<option>${UI.esc(m.name)}</option>`).join("");
  UI.openModal({
    title: "Add leave",
    bodyHtml: `
      <div class="grid grid2">
        <div><label>Member *</label><select id="l_member">${members}</select></div>
        <div><label>Note</label><input id="l_note" placeholder="Optional note" /></div>
        <div><label>Start date *</label><input id="l_start" type="date" /></div>
        <div><label>End date *</label><input id="l_end" type="date" /></div>
      </div>
      <div class="error" id="l_err" hidden></div>
    `,
    footerHtml: `
      <button class="btn ghost" id="l_cancel">Cancel</button>
      <button class="btn" id="l_save">Save</button>
    `
  });

  document.getElementById("l_cancel").onclick = UI.closeModal;
  document.getElementById("l_save").onclick = async () => {
    const err = document.getElementById("l_err");
    const member = document.getElementById("l_member").value;
    const startDate = document.getElementById("l_start").value;
    const endDate = document.getElementById("l_end").value;
    if (!member || !startDate || !endDate) {
      err.hidden = false;
      err.textContent = "Member, start date, and end date are required.";
      return;
    }
    await Store.createLeave({ member, startDate, endDate, note: document.getElementById("l_note").value });
    UI.closeModal();
    await refreshAll();
  };
}

// --- AUTH + BOOT ---
function init() {
  bindTabs();

  document.getElementById("loginBtn").onclick = async () => {
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
  };

  document.getElementById("registerBtn").onclick = async () => {
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const err = document.getElementById("authError");
    err.hidden = true;

    try {
      await auth.createUserWithEmailAndPassword(email, password);
      // default role: csr (admin should be assigned manually in Firestore)
      const u = auth.currentUser;
      await db.collection(COL.roles).doc(u.uid).set({ role: "csr" }, { merge: true });
    } catch (e) {
      err.hidden = false;
      err.textContent = e.message;
    }
  };

  document.getEl
