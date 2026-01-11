const Exporter = (() => {
  function download(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function toCsv(rows) {
    if (!rows.length) return "";
    const cols = Object.keys(flatten(rows[0]));
    const head = cols.join(",");
    const body = rows.map(r => {
      const fr = flatten(r);
      return cols.map(c => csvCell(fr[c])).join(",");
    }).join("\n");
    return head + "\n" + body;
  }

  function flatten(obj, prefix = "", out = {}) {
    for (const [k, v] of Object.entries(obj || {})) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, key, out);
      else out[key] = v;
    }
    return out;
  }

  function csvCell(v) {
    const s = String(v ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replaceAll('"', '""')}"`;
    }
    return s;
  }

  return { download, toCsv };
})();
