// StudyPilot — front-end logic (vanilla JS + supabase-js v2)
(() => {
  const cfg = window.STUDYPILOT_CONFIG || {};
  const $ = (id) => document.getElementById(id);

  const configured =
    cfg.SUPABASE_URL && cfg.SUPABASE_KEY &&
    !cfg.SUPABASE_URL.startsWith("YOUR_") && !cfg.SUPABASE_KEY.startsWith("YOUR_");

  if (!configured || !window.supabase) {
    $("setupView").classList.remove("hidden");
    return;
  }

  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY);

  const state = { tasks: [], filter: "open", course: "", editingId: null, authMode: "signin" };

  // ---------- helpers ----------
  const todayStr = () => {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  };
  const daysUntil = (dateStr) => {
    if (!dateStr) return null;
    const a = new Date(todayStr() + "T00:00:00");
    const b = new Date(dateStr + "T00:00:00");
    return Math.round((b - a) / 86400000);
  };
  const fmtDate = (dateStr) =>
    new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

  let toastTimer;
  function toast(text) {
    const t = $("toast");
    t.textContent = text;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
  }
  function el(tag, attrs = {}, ...children) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") n.className = v;
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    }
    for (const c of children) if (c != null) n.append(c);
    return n;
  }

  // ---------- auth ----------
  document.querySelectorAll(".tab").forEach((btn) =>
    btn.addEventListener("click", () => {
      state.authMode = btn.dataset.mode;
      document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("active", b === btn));
      $("authSubmit").textContent = state.authMode === "signin" ? "Sign in" : "Create account";
      $("authPassword").autocomplete = state.authMode === "signin" ? "current-password" : "new-password";
      setAuthMsg("");
    })
  );

  function setAuthMsg(text, kind = "") {
    const m = $("authMsg");
    m.textContent = text;
    m.className = "msg " + kind;
  }

  $("authForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("authEmail").value.trim();
    const password = $("authPassword").value;
    const btn = $("authSubmit");
    btn.disabled = true;
    setAuthMsg("Working…");
    try {
      if (state.authMode === "signup") {
        const { data, error } = await sb.auth.signUp({
          email, password, options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) setAuthMsg("Account created! Check your email to confirm, then sign in.", "ok");
        else setAuthMsg("");
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setAuthMsg("");
      }
    } catch (err) {
      setAuthMsg(err.message || "Something went wrong.", "err");
    } finally {
      btn.disabled = false;
    }
  });

  $("signOutBtn").addEventListener("click", () => sb.auth.signOut());

  sb.auth.onAuthStateChange((_event, session) => render(session));
  sb.auth.getSession().then(({ data }) => render(data.session));

  let currentUserId = null;
  function render(session) {
    const signedIn = !!session;
    $("authView").classList.toggle("hidden", signedIn);
    $("appView").classList.toggle("hidden", !signedIn);
    $("userbox").classList.toggle("hidden", !signedIn);
    if (signedIn) {
      $("userEmail").textContent = session.user.email;
      if (currentUserId !== session.user.id) {
        currentUserId = session.user.id;
        loadTasks();
      }
    } else {
      currentUserId = null;
      state.tasks = [];
      resetForm();
    }
  }

  // ---------- data ----------
  async function loadTasks() {
    const { data, error } = await sb
      .from("tasks")
      .select("*")
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("priority", { ascending: true });
    if (error) return toast("Could not load tasks: " + error.message);
    state.tasks = data;
    drawAll();
  }

  $("taskForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const row = {
      title: $("fTitle").value.trim(),
      course: $("fCourse").value.trim() || "General",
      kind: $("fKind").value,
      due_date: $("fDue").value || null,
      priority: Number($("fPriority").value),
      notes: $("fNotes").value.trim() || null,
    };
    if (!row.title) return;
    const btn = $("fSubmit");
    btn.disabled = true;
    const q = state.editingId
      ? sb.from("tasks").update(row).eq("id", state.editingId).select().single()
      : sb.from("tasks").insert(row).select().single();
    const { data, error } = await q;
    btn.disabled = false;
    if (error) return toast("Save failed: " + error.message);
    if (state.editingId) {
      state.tasks = state.tasks.map((t) => (t.id === data.id ? data : t));
      toast("Task updated");
    } else {
      state.tasks.push(data);
      toast("Task added ✈️");
    }
    resetForm();
    drawAll();
  });

  $("fCancel").addEventListener("click", resetForm);

  function resetForm() {
    state.editingId = null;
    $("taskForm").reset();
    $("fPriority").value = "2";
    $("formTitle").textContent = "Add a task";
    $("fSubmit").textContent = "Add task";
    $("fCancel").classList.add("hidden");
  }

  function startEdit(t) {
    state.editingId = t.id;
    $("fTitle").value = t.title;
    $("fCourse").value = t.course;
    $("fKind").value = t.kind;
    $("fDue").value = t.due_date || "";
    $("fPriority").value = String(t.priority);
    $("fNotes").value = t.notes || "";
    $("formTitle").textContent = "Edit task";
    $("fSubmit").textContent = "Save changes";
    $("fCancel").classList.remove("hidden");
    $("fTitle").focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggleDone(t) {
    const { data, error } = await sb.from("tasks").update({ done: !t.done }).eq("id", t.id).select().single();
    if (error) { drawList(); return toast("Update failed: " + error.message); }
    state.tasks = state.tasks.map((x) => (x.id === t.id ? data : x));
    drawAll();
  }

  async function removeTask(t) {
    if (!confirm(`Delete "${t.title}"?`)) return;
    const { error } = await sb.from("tasks").delete().eq("id", t.id);
    if (error) return toast("Delete failed: " + error.message);
    state.tasks = state.tasks.filter((x) => x.id !== t.id);
    if (state.editingId === t.id) resetForm();
    toast("Task deleted");
    drawAll();
  }

  // ---------- filters ----------
  document.querySelectorAll(".segbtn").forEach((b) =>
    b.addEventListener("click", () => {
      state.filter = b.dataset.filter;
      document.querySelectorAll(".segbtn").forEach((x) => x.classList.toggle("active", x === b));
      drawList();
    })
  );
  $("filterCourse").addEventListener("change", (e) => {
    state.course = e.target.value;
    drawList();
  });

  // ---------- drawing ----------
  function drawAll() {
    drawStats();
    drawCourses();
    drawList();
  }

  function drawStats() {
    const open = state.tasks.filter((t) => !t.done);
    const overdue = open.filter((t) => t.due_date && daysUntil(t.due_date) < 0);
    const week = open.filter((t) => t.due_date && daysUntil(t.due_date) >= 0 && daysUntil(t.due_date) <= 7);
    const pct = state.tasks.length ? Math.round(((state.tasks.length - open.length) / state.tasks.length) * 100) : 0;
    $("statWeek").textContent = week.length;
    $("statOverdue").textContent = overdue.length;
    $("statOpen").textContent = open.length;
    $("statDone").textContent = pct + "%";
    $("statBar").style.width = pct + "%";
  }

  function drawCourses() {
    const courses = [...new Set(state.tasks.map((t) => t.course))].sort();
    const sel = $("filterCourse");
    const prev = state.course;
    sel.replaceChildren(el("option", { value: "" }, "All courses"), ...courses.map((c) => el("option", { value: c }, c)));
    sel.value = courses.includes(prev) ? prev : "";
    state.course = sel.value;
    $("courseList").replaceChildren(...courses.map((c) => el("option", { value: c })));
  }

  function groupLabel(t) {
    if (t.done) return "Completed";
    const d = daysUntil(t.due_date);
    if (d === null) return "No due date";
    if (d < 0) return "Overdue";
    if (d === 0) return "Today";
    if (d <= 7) return "This week";
    if (d <= 30) return "This month";
    return "Later";
  }

  function dueText(t) {
    const d = daysUntil(t.due_date);
    if (d === null) return null;
    let rel = d < 0 ? `${-d} day${d === -1 ? "" : "s"} late` : d === 0 ? "today" : d === 1 ? "tomorrow" : `in ${d} days`;
    const cls = t.done ? "due" : d < 0 ? "due over" : d <= 2 ? "due soon" : "due";
    return el("span", { class: cls }, `📅 ${fmtDate(t.due_date)} · ${rel}`);
  }

  function drawList() {
    let list = state.tasks.slice();
    if (state.course) list = list.filter((t) => t.course === state.course);
    if (state.filter === "open") list = list.filter((t) => !t.done);
    if (state.filter === "done") list = list.filter((t) => t.done);
    if (state.filter === "overdue") list = list.filter((t) => !t.done && t.due_date && daysUntil(t.due_date) < 0);

    list.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (a.due_date && b.due_date && a.due_date !== b.due_date) return a.due_date < b.due_date ? -1 : 1;
      if (!!a.due_date !== !!b.due_date) return a.due_date ? -1 : 1;
      return a.priority - b.priority;
    });

    const ul = $("taskList");
    ul.replaceChildren();
    let lastGroup = null;
    for (const t of list) {
      const g = groupLabel(t);
      if (g !== lastGroup) {
        ul.append(el("li", { class: "group" }, g));
        lastGroup = g;
      }
      const kindLabel = { assignment: "Assignment", exam: "Exam", project: "Project", reading: "Reading" }[t.kind];
      const prioLabel = { 1: "High", 2: "Medium", 3: "Low" }[t.priority];
      const cb = el("input", { type: "checkbox", class: "check", "aria-label": "Mark done", onchange: () => toggleDone(t) });
      cb.checked = t.done;
      ul.append(
        el("li", { class: `task p${t.priority}${t.done ? " done" : ""}` },
          cb,
          el("div", {},
            el("div", { class: "ttl" }, t.title),
            el("div", { class: "meta" },
              el("span", { class: "chip" }, t.course),
              el("span", { class: `chip kind-${t.kind}` }, kindLabel),
              el("span", {}, `${prioLabel} priority`),
              dueText(t)
            ),
            t.notes ? el("div", { class: "notes" }, t.notes) : null
          ),
          el("div", { class: "tactions" },
            el("button", { class: "icon", title: "Edit", "aria-label": "Edit", onclick: () => startEdit(t) }, "✏️"),
            el("button", { class: "icon", title: "Delete", "aria-label": "Delete", onclick: () => removeTask(t) }, "🗑️")
          )
        )
      );
    }
    $("emptyMsg").classList.toggle("hidden", list.length > 0);
  }
})();
