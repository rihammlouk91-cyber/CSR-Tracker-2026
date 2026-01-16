(function () {
  let _role = "csr";

  function nowIso() {
    return new Date().toISOString();
  }

  async function whoAmI() {
    const u = auth.currentUser;
    return u ? (u.email || u.uid) : "—";
  }

  async function loadRole(uid) {
    const snap = await db.collection(COL.roles).doc(uid).get();
    const role = snap.exists ? (snap.data().role || "csr") : "csr";
    _role = role;
    return role;
  }

  async function ensureRole(user) {
    const ref = db.collection(COL.roles).doc(user.uid);
    const snap = await ref.get();
    if (!snap.exists) {
      await ref.set({ role: "csr", createdAt: nowIso() }, { merge: true });
      _role = "csr";
      return "csr";
    }
    _role = (snap.data().role || "csr");
    return _role;
  }

  function getRole() {
    return _role;
  }

  async function logAudit({ type, title, action, changes }) {
    // Only admins should see audit tab, but logging is allowed for everyone (optional).
    // You can restrict later with Firestore rules if you want.
    const u = auth.currentUser;
    await db.collection(COL.audit).add({
      at: Date.now(),
      atIso: nowIso(),
      byUid: u ? u.uid : "anon",
      byEmail: u ? (u.email || "") : "",
      type,
      title,
      action,
      changes: changes || null,
    });
  }

  async function listProjects() {
    const snap = await db.collection(COL.projects).orderBy("createdAt", "desc").get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  async function listAllTasks() {
    const snap = await db.collection(COL.tasks).orderBy("createdAt", "desc").get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  async function createProject(data) {
    const payload = {
      name: data.name || "",
      owner: data.owner || "",
      priority: data.priority || "Medium",
      status: data.status || "Pending",
      budgetAed: Number(data.budgetAed || 0),
      targetedBeneficiaries: Number(data.targetedBeneficiaries || 0),
      launchDate: data.launchDate || "",
      createdAt: Date.now(),
    };

    const ref = await db.collection(COL.projects).add(payload);
    await logAudit({ type: "project", title: payload.name, action: "created", changes: payload });
    return ref.id;
  }

  async function updateProject(id, patch, beforeObj) {
    await db.collection(COL.projects).doc(id).set(patch, { merge: true });
    await logAudit({
      type: "project",
      title: beforeObj?.name || id,
      action: "updated",
      changes: { before: beforeObj || null, after: patch },
    });
  }

  async function createTask(data) {
    const payload = {
      projectId: data.projectId,
      name: data.name || "",
      status: data.status || "Pending",
      priority: data.priority || "Medium",
      owner: data.owner || "",
      deadline: data.deadline || "",
      createdAt: Date.now(),
    };
    const ref = await db.collection(COL.tasks).add(payload);
    await logAudit({ type: "task", title: payload.name, action: "created", changes: payload });
    return ref.id;
  }

  async function listAudit() {
    const snap = await db.collection(COL.audit).orderBy("at", "desc").limit(200).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  window.Store = {
    whoAmI,
    loadRole,
    ensureRole,
    getRole,

    listProjects,
    createProject,
    updateProject,

    listAllTasks,
    createTask,

    listAudit,
  };
})();
