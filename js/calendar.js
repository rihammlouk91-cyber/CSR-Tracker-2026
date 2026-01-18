(function(){
  let calendar = null;

  function colorProject(){ return "#3b82f6"; }   // blue
  function colorLeave(){ return "#f59e0b"; }     // amber

  function toEventProject(p){
    const start = p.startDate || p.launchDate || "";
    const end = p.endDate || "";
    if (!start) return null;

    return {
      title: `Project: ${p.name || ""}`,
      start,
      end: end || undefined,
      allDay: true,
      backgroundColor: colorProject(),
      borderColor: colorProject(),
      textColor: "#ffffff"
    };
  }

  function toEventLeave(l){
    if (!l.startDate) return null;
    return {
      title: `Leave: ${l.member || ""}`,
      start: l.startDate,
      end: l.endDate ? addOneDay(l.endDate) : undefined,
      allDay: true,
      backgroundColor: colorLeave(),
      borderColor: colorLeave(),
      textColor: "#111827"
    };
  }

  function addOneDay(yyyyMmDd){
    const d = new Date(yyyyMmDd);
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,"0");
    const day = String(d.getDate()).padStart(2,"0");
    return `${y}-${m}-${day}`;
  }

  function render(projects, leaves){
    const root = document.getElementById("calendarRoot");
    if (!root) return;

    const events = [];
    projects.forEach(p => {
      const ev = toEventProject(p);
      if (ev) events.push(ev);
    });
    leaves.forEach(l => {
      const ev = toEventLeave(l);
      if (ev) events.push(ev);
    });

    if (calendar){
      calendar.removeAllEvents();
      events.forEach(e => calendar.addEvent(e));
      calendar.render();
      return;
    }

    calendar = new FullCalendar.Calendar(root, {
      initialView: "dayGridMonth",
      height: "auto",
      events,
      eventDisplay: "block",
      nowIndicator: true,
      firstDay: 1
    });
    calendar.render();
  }

  window.Cal = { render };
})();
