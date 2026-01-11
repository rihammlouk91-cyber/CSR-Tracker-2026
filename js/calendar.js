const Cal = (() => {
  let cal = null;

  async function render(projects, leaves) {
    const el = document.getElementById("calendar");
    el.innerHTML = "";

    const projectEvents = projects.map((p, idx) => {
      const start = p.startDate || p.launchDate;
      const end = p.endDate || p.startDate || p.launchDate;
      if (!start) return null;
      return {
        title: `Project: ${p.name}`,
        start,
        end: end ? addOneDay(end) : start,
        allDay: true,
        color: pickColor(idx),
      };
    }).filter(Boolean);

    const leaveEvents = leaves.map(l => ({
      title: `Leave: ${l.member}`,
      start: l.startDate,
      end: addOneDay(l.endDate),
      allDay: true,
      color: "#f59e0b"
    }));

    cal = new FullCalendar.Calendar(el, {
      initialView: "dayGridMonth",
      height: "auto",
      events: [...projectEvents, ...leaveEvents],
    });

    cal.render();
  }

  function addOneDay(dateStr) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + 1);
    return toDateOnlyISO(d);
  }

  function pickColor(i) {
    // not specifying exact palette per your preference? you asked light friendly colors.
    // Keeping a subtle deterministic set.
    const colors = ["#2563eb", "#16a34a", "#7c3aed", "#0891b2", "#e11d48", "#334155"];
    return colors[i % colors.length];
  }

  return { render };
})();
