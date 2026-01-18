(function(){
  let _role = "csr";
  let _membersCache = null;

  function nowIso(){ return new Date().toISOString(); }
  function num(x){ const n = Number(x); return Number.isFinite(n) ? n : 0; }

  async function ensureRole(user){
    const ref = db.collection(COL.roles).doc(user.uid);
    const snap = await ref.get();
    if (!snap.exists){
      await ref.set({ role: "csr", createdAt: nowIso() }, { merge: true });
      _role = "csr";
      return _role;
    }
    _role = (snap.data().role || "csr");
    return _role;
  }

  async function loadRole(uid){
    const snap = await db.collection(COL.roles).doc(uid).get();
    _role = snap.exists ? (snap.data().role || "csr") : "csr";
    return _role;
  }

  function getRole(){ return _role; }

  async function whoAmI(){
    const u = auth.currentUser;
    return u ? (u.email || u.uid) : "—";
  }

  async function listMembers(force=false){
    if (!force && _membersCache) return _membersCache;
    const snap = await db.collection(COL.members).orderBy("name").get().catch(() => null);
    const items = snap ? snap.docs.map(d => ({ id:d.id, ...d.data() })) : [];
    _membersCache = items;
    return items;
  }

  async function logAudit({ type, title, action, changes }){
    const u = auth.currentUser;
    await db.collection(COL.audit).add({
      at: Date.now(),
      atIso: nowIso(),
      byUid: u ? u.uid : "anon",
      byEmail: u ? (u.email || "") : "",
      type,
      title,
      action,
      changes: changes || null
    });
  }

  // -------- Projects --------
  async function listProjects(){
    const snap = await db.collection(COL.projects).orderBy("createdAt","desc").get();
    return snap.docs.map(d => ({ id:d.id, ...d.data() }));
  }

  async function createProject(data){
    const payload = {
      name: (data.name || "").trim(),
      priority: data.priority || "Medium",
      status: data.status || "Pending",
      owner: (data.owner || "").trim(),

      budgetAed: num(data.budgetAed),
      utilizedAed: num(data.utilizedAed),
      targetedBeneficiaries: num(data.targetedBeneficiaries),
      achievedBeneficiaries: num(data.achievedBeneficiaries),

      volIntTarget: num(data.volIntTarget),
      volExtTarget: num(data.volExtTarget),

      startDate: data.startDate || data.launchDate || "",
      launchDate: data.launchDate || "",
      endDate: data.endDate || "",

      createdAt: Date.now(),
      createdAtIso: nowIso(),
    };

    const ref = await db.collection(COL.projects).add(payload);
    await logAudit({ type:"project", title: payload.name, action:"created", changes: payload });
    return ref.id;
  }

  async function updateProject(id, patch, before){
    const clean = { ...patch };
    if ("budgetAed" in clean) clean.budgetAed = num(clean.budgetAed);
    if ("utilizedAed" in clean) clean.utilizedAed = num(clean.utilizedAed);
    if ("targetedBeneficiaries" in clean) clean.targetedBeneficiaries = num(clean.targetedBeneficiaries);
    if ("achievedBeneficiaries" in clean) clean.achievedBeneficiaries = num(clean.achievedBeneficiaries);
    if ("volIntTarget" in clean) clean.volIntTarget = num(clean.volIntTarget);
    if ("volExtTarget" in clean) clean.volExtTarget = num(clean.volExtTarget);

    await db.collection(COL.projects).doc(id).set(clean, { merge:true });
    await logAudit({
      type:"project",
      title: before?.name || id,
      action:"updated",
      changes:{ before: before || null, after: clean }
    });
  }

  // -------- Tasks --------
  async function listAllTasks(){
    const snap = await db.collection(COL.tasks).orderBy("createdAt","desc").get();
    return snap.docs.map(d => ({ id:d.id, ...d.data() }));
  }

  async function createTask(data){
    const payload = {
      projectId: data.projectId,
      name: (data.name || "").trim(),
      description: data.description || "",
      status: data.status || "Pending",
      priority: data.priority || "Medium",
      owner: (data.owner || "").trim(),
      supportTeam: data.supportTeam || "",
      deadline: data.deadline || "",
      targetedInternalVolunteers: num(data.targetedInternalVolunteers),
      targetedExternalVolunteers: num(data.targetedExternalVolunteers),
      nextSteps: data.nextSteps || "",
      notes: data.notes || "",
      createdAt: Date.now(),
      createdAtIso: nowIso(),
    };

    const ref = await db.collection(COL.tasks).add(payload);
    await logAudit({ type:"task", title: payload.name, action:"created", changes: payload });
    return ref.id;
  }

  async function updateTask(id, patch, before){
    const clean = { ...patch };
    await db.collection(COL.tasks).doc(id).set(clean, { merge:true });
    await logAudit({
      type:"task",
      title: before?.name || id,
      action:"updated",
      changes:{ before: before || null, after: clean }
    });
  }

  // -------- Communications --------
  async function listCommunications(){
    const snap = await db.collection(COL.communications).orderBy("createdAt","desc").get();
    return snap.docs.map(d => ({ id:d.id, ...d.data() }));
  }

  async function createCommunication(data){
    const payload = {
      date: data.date || "",
      status: data.status || "Idea",
      type: data.type || "Announcement",
      campaign: data.campaign || "None - Standalone",
      subject: (data.subject || "").trim(),
      audience: (data.audience || "").trim(),
      channels: data.channels || { email:false, purespace:false, other:false },
      workflow: data.workflow || {},
      contentOwner: (data.contentOwner || "").trim(),
      designRequirements: (data.designRequirements || "").trim(),
      approvalNotes: data.approvalNotes || "",
      generalNotes: data.generalNotes || "",
      priority: data.priority || "Medium",
      deadline: data.deadline || "",
      createdAt: Date.now(),
      createdAtIso: nowIso(),
    };

    const ref = await db.collection(COL.communications).add(payload);
    await logAudit({ type:"communication", title: payload.subject, action:"created", changes: payload });
    return ref.id;
  }

  async function updateCommunication(id, patch, before){
    await db.collection(COL.communications).doc(id).set(patch, { merge:true });
    await logAudit({
      type:"communication",
      title: before?.subject || id,
      action:"updated",
      changes:{ before: before || null, after: patch }
    });
  }

  // -------- Leaves --------
  async function listLeaves(){
    const snap = await db.collection(COL.leaves).orderBy("startDate","asc").get();
    return snap.docs.map(d => ({ id:d.id, ...d.data() }));
  }

  async function createLeave(data){
    const payload = {
      member: (data.member || "").trim(),
      startDate: data.startDate || "",
      endDate: data.endDate || "",
      note: data.note || "",
      createdAt: Date.now(),
      createdAtIso: nowIso(),
    };
    const ref = await db.collection(COL.leaves).add(payload);
    await logAudit({ type:"leave", title: payload.member, action:"created", changes: payload });
    return ref.id;
  }

  async function updateLeave(id, patch, before){
    await db.collection(COL.leaves).doc(id).set(patch, { merge:true });
    await logAudit({
      type:"leave",
      title: before?.member || id,
      action:"updated",
      changes:{ before: before || null, after: patch }
    });
  }

  // -------- Audit (admin reads) --------
  async function listAudit(limit=250){
    const snap = await db.collection(COL.audit).orderBy("at","desc").limit(limit).get();
    return snap.docs.map(d => ({ id:d.id, ...d.data() }));
  }

  window.Store = {
    ensureRole, loadRole, getRole, whoAmI,
    listMembers,

    listProjects, createProject, updateProject,
    listAllTasks, createTask, updateTask,

    listCommunications, createCommunication, updateCommunication,
    listLeaves, createLeave, updateLeave,

    listAudit,
  };
})();
