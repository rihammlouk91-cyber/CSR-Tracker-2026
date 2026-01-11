const Store = (() => {
  let currentUser = null;
  let currentRole = "csr"; // default
  let membersCache = [];

  async function loadRole(uid) {
    const snap = await db.collection(COL.roles).doc(uid).get();
    currentRole = snap.exists ? (snap.data().role || "csr") : "csr";
    return currentRole;
  }

  async function loadMembers() {
    const snap = await db.collection(COL.members).orderBy("name").get();
    membersCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return membersCache;
  }

  function getMembers() { return membersCache; }
  function getRole() { return currentRole; }
  function getUser() { return currentUser; }

  function watchAuth(cb) {
    auth.onAuthStateChanged(async (u) => {
      currentUser = u || null;
      if (u) {
        await loadRole(u.uid);
        await loadMembers();
      }
      cb(u);
    });
  }

  // --- AUDIT ---
  async function logAudit({ type, title, action, entityId, changes }) {
    // CSR should not even see audit, but logs can be written by CSR too.
    // Only admin can read audit (rules enforce).
    const u = getUser();
    if (!u) return;

    const payload = {
      at: nowIso(),
      byUid: u.uid,
      byEmail: u.email || "",
      type,       // "project" | "task" | "communication" | "leave"
      title,      // headline
      action,     // "create" | "update" | "delete"
      entityId,
      changes: changes || null, // { field: {from,to}, ... }
    };
    await db.collection(COL.audit).add(payload);
  }

  // Utility: compute diffs
  function diffObjects(before, after, fields) {
    const out = {};
    for (const f of fields) {
      const b = before?.[f] ?? null;
      const a = after?.[f] ?? null;
      if (JSON.stringify(b) !== JSON.stringify(a)) out[f] = { from: b, to: a };
    }
    return Object.keys(out).length ? out : null;
  }

  // --- PROJECTS ---
  async function createProject(p) {
    const u = getUser();
    const doc = {
      name: p.name.trim(),
      priority: p.priority,
      budgetAed: Number(p.budgetAed || 0),
      utilizedAed: 0,
      targetedBeneficiaries: Number(p.targetedBeneficiaries || 0),
      actualBeneficiaries: 0,
      owner: p.owner,
      launchDate: p.launchDate,
      startDate: p.startDate || p.launchDate,
      endDate: p.endDate || "",
      status: p.status || "Pending",
      createdAt: nowIso(),
      createdBy: u?.email || "",
      updatedAt: nowIso(),
      updatedBy: u?.email || "",
      volunteersInternalTarget: Number(p.volIntTarget || 0),
      volunteersExternalTarget: Number(p.volExtTarget || 0),
      volunteersInternalActual: 0,
      volunteersExternalActual: 0,
    };
    const ref = await db.collection(COL.projects).add(doc);
    await logAudit({ type: "project", title: doc.name, action: "create", entityId: ref.id });
    return ref.id;
  }

  async function updateProject(id, patch, beforeDoc) {
    const u = getUser();
    patch.updatedAt = nowIso();
    patch.updatedBy = u?.email || "";
    await db.collection(COL.projects).doc(id).update(patch);

    const fields = Object.keys(patch).filter(k => !["updatedAt","updatedBy"].includes(k));
    const changes = diffObjects(beforeDoc, { ...beforeDoc, ...patch }, fields);
    await logAudit({
      type: "project",
      title: (beforeDoc?.name || "Project"),
      action: "update",
      entityId: id,
      changes
    });
  }

  async function listProjects() {
    const snap = await db.collection(COL.projects).orderBy("createdAt", "desc").get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  // --- TASKS ---
  async function createTask(t) {
    const u = getUser();
    const doc = {
      projectId: t.projectId,
      name: t.name.trim(),
      description: t.description || "",
      status: t.status || "Pending",
      priority: t.priority,
      owner: t.owner,
      supportTeam: t.supportTeam || "",
      deadline: t.deadline || "",
      targetedInternalVolunteers: Number(t.targetedInternalVolunteers || 0),
      targetedExternalVolunteers: Number(t.targetedExternalVolunteers || 0),
      nextSteps: t.nextSteps || "",
      notes: t.notes || "",
      createdAt: nowIso(),
      createdBy: u?.email || "",
      updatedAt: nowIso(),
      updatedBy: u?.email || "",
    };
    const ref = await db.collection(COL.tasks).add(doc);
    await logAudit({ type: "task", title: doc.name, action: "create", entityId: ref.id });
    return ref.id;
  }

  async function updateTask(id, patch, beforeDoc) {
    const u = getUser();
    patch.updatedAt = nowIso();
    patch.updatedBy = u?.email || "";
    await db.collection(COL.tasks).doc(id).update(patch);

    const fields = Object.keys(patch).filter(k => !["updatedAt","updatedBy"].includes(k));
    const changes = diffObjects(beforeDoc, { ...beforeDoc, ...patch }, fields);
    await logAudit({ type: "task", title: beforeDoc?.name || "Task", action: "update", entityId: id, changes });
  }

  async function listTasksByProject(projectId) {
    const snap = await db.collection(COL.tasks)
      .where("projectId", "==", projectId)
      .orderBy("deadline", "asc")
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  async function listAllTasks() {
    const snap = await db.collection(COL.tasks).orderBy("deadline", "asc").get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  // --- COMMUNICATIONS ---
  async function createCommunication(c) {
    const u = getUser();
    const doc = {
      date: c.date,
      status: c.status, // Idea/In progress/Done etc
      type: c.type,     // Announcement, etc
      campaign: c.campaign || "None - Standalone",
      subject: c.subject.trim(),
      audience: c.audience.trim(),
      channels: {
        email: !!c.channels.email,
        purespace: !!c.channels.purespace,
        other: !!c.channels.other
      },

      // Your screenshot section
      workflow: {
        contentReceived: !!c.workflow.contentReceived,
        contentApproved: !!c.workflow.contentApproved,
        designsReceived: !!c.workflow.designsReceived,
        designsApproved: !!c.workflow.designsApproved,
      },

      // Mandatory (your request)
      contentOwner: c.contentOwner.trim(),
      designRequirements: c.designRequirements.trim(),

      approvalNotes: c.approvalNotes || "",
      generalNotes: c.generalNotes || "",

      priority: c.priority || "Medium",
      deadline: c.deadline || "",

      createdAt: nowIso(),
      createdBy: u?.email || "",
      updatedAt: nowIso(),
      updatedBy: u?.email || "",
    };
    const ref = await db.collection(COL.communications).add(doc);
    await logAudit({ type: "communication", title: doc.subject, action: "create", entityId: ref.id });
    return ref.id;
  }

  async function listCommunications() {
    const snap = await db.collection(COL.communications).orderBy("date", "desc").get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  async function updateCommunication(id, patch, beforeDoc) {
    const u = getUser();
    patch.updatedAt = nowIso();
    patch.updatedBy = u?.email || "";
    await db.collection(COL.communications).doc(id).update(patch);

    const fields = Object.keys(patch).filter(k => !["updatedAt","updatedBy"].includes(k));
    const changes = diffObjects(beforeDoc, { ...beforeDoc, ...patch }, fields);
    await logAudit({ type: "communication", title: beforeDoc?.subject || "Communication", action: "update", entityId: id, changes });
  }

  // --- LEAVES ---
  async function createLeave(l) {
    const u = getUser();
    const doc = {
      member: l.member,
      startDate: l.startDate,
      endDate: l.endDate,
      note: l.note || "",
      createdAt: nowIso(),
      createdBy: u?.email || ""
    };
    const ref = await db.collection(COL.leaves).add(doc);
    await logAudit({ type: "leave", title: `${doc.member} leave`, action: "create", entityId: ref.id });
    return ref.id;
  }

  async function listLeaves() {
    const snap = await db.collection(COL.leaves).orderBy("startDate","asc").get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  async function listAudit() {
    // rules restrict reading to admin
    const snap = await db.collection(COL.audit).orderBy("at","desc").limit(300).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  return {
    watchAuth,
    loadRole,
    loadMembers,
    getMembers,
    getRole,
    getUser,
    createProject,
    updateProject,
    listProjects,
    createTask,
    updateTask,
    listTasksByProject,
    listAllTasks,
    createCommunication,
    updateCommunication,
    listCommunications,
    createLeave,
    listLeaves,
    listAudit,
    diffObjects,
  };
})();
