import { useState, useRef, useEffect, useCallback } from "react";

const CATEGORIES = ["All", "Work", "Personal", "Urgent"];
const CATEGORY_COLORS = { Work: "#6ee7f7", Personal: "#3db870", Urgent: "#e05555" };
const CATEGORY_COLORS_LIGHT = { Work: "#0891b2", Personal: "#16a34a", Urgent: "#dc2626" };
const PRIORITIES = ["low", "medium", "high"];
const PRIORITY_COLORS = { low: "#999", medium: "#d97706", high: "#e05555" };
const PRIORITY_COLORS_LIGHT = { low: "#777", medium: "#b45309", high: "#dc2626" };
const PRIORITY_LABELS = { low: "▽ Low", medium: "◈ Med", high: "▲ High" };

function generateId() { return Math.random().toString(36).slice(2, 10); }

const STORAGE_KEY = "blaze_tasks_v2";
const THEME_KEY = "blaze_theme";

const defaultTasks = [
  { id: generateId(), text: "Review onboarding process doc", done: false, category: "Work", priority: "medium", due: "" },
  { id: generateId(), text: "Set up Asana automation", done: false, category: "Work", priority: "high", due: new Date(Date.now() - 86400000).toISOString().slice(0,10) },
  { id: generateId(), text: "Call back client re: dashboard", done: true, category: "Urgent", priority: "high", due: "" },
  { id: generateId(), text: "Plan team retro agenda", done: false, category: "Personal", priority: "low", due: new Date(Date.now() + 3*86400000).toISOString().slice(0,10) },
];

function loadTasks() {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : defaultTasks; } catch { return defaultTasks; }
}
function loadTheme() {
  try { return localStorage.getItem(THEME_KEY) || "dark"; } catch { return "dark"; }
}
function isOverdue(due) { if (!due) return false; return new Date(due) < new Date(new Date().toDateString()); }
function formatDue(due) {
  if (!due) return null;
  const d = new Date(due);
  const today = new Date(new Date().toDateString());
  const diff = Math.round((d - today) / 86400000);
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, color: "#e05555" };
  if (diff === 0) return { label: "Today", color: "#d97706" };
  if (diff === 1) return { label: "Tomorrow", color: "#3db870" };
  return { label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }), color: "#888" };
}

export default function TodoApp() {
  const [theme, setTheme] = useState(loadTheme);
  const dark = theme === "dark";

  const [tasks, setTasksRaw] = useState(loadTasks);
  const [input, setInput] = useState("");
  const [newCat, setNewCat] = useState("Work");
  const [newPriority, setNewPriority] = useState("medium");
  const [newDue, setNewDue] = useState("");
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const inputRef = useRef(null);
  const editRef = useRef(null);

  const toggleTheme = () => {
    const next = dark ? "light" : "dark";
    setTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch {}
  };

  const setTasks = useCallback((val) => {
    setTasksRaw(prev => {
      const next = typeof val === "function" ? val(prev) : val;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  useEffect(() => { if (editingId && editRef.current) editRef.current.focus(); }, [editingId]);

  const addTask = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setTasks(prev => [{ id: generateId(), text: trimmed, done: false, category: newCat, priority: newPriority, due: newDue }, ...prev]);
    setInput(""); setNewDue(""); inputRef.current?.focus();
  };

  const toggleDone = (id) => setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const deleteTask = (id) => setTasks(prev => prev.filter(t => t.id !== id));
  const startEdit = (task) => { setEditingId(task.id); setEditText(task.text); };
  const saveEdit = (id) => {
    const trimmed = editText.trim();
    if (trimmed) setTasks(prev => prev.map(t => t.id === id ? { ...t, text: trimmed } : t));
    setEditingId(null);
  };
  const cyclePriority = (id, current) => {
    const i = PRIORITIES.indexOf(current);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, priority: PRIORITIES[(i + 1) % 3] } : t));
  };

  const onDragStart = (e, id) => { setDragId(id); e.dataTransfer.effectAllowed = "move"; };
  const onDragOver = (e, id) => { e.preventDefault(); setDragOverId(id); };
  const onDrop = (e, targetId) => {
    e.preventDefault();
    if (!dragId || dragId === targetId) { setDragId(null); setDragOverId(null); return; }
    setTasks(prev => {
      const arr = [...prev];
      const from = arr.findIndex(t => t.id === dragId);
      const to = arr.findIndex(t => t.id === targetId);
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      return arr;
    });
    setDragId(null); setDragOverId(null);
  };
  const onDragEnd = () => { setDragId(null); setDragOverId(null); };

  const filtered = tasks
    .filter(t => filter === "All" || t.category === filter)
    .filter(t => !search || t.text.toLowerCase().includes(search.toLowerCase()));

  const done = filtered.filter(t => t.done).length;
  const total = filtered.length;

  // Theme values
  const bg = dark ? "#0f0f13" : "#f4f4f8";
  const cardBg = dark ? "#16161d" : "#ffffff";
  const border = dark ? "#222" : "#e2e2e8";
  const borderHover = dark ? "#333" : "#c0c0cc";
  const textPrimary = dark ? "#e8e8f0" : "#1a1a2e";
  const textSecondary = dark ? "#888" : "#666";
  const inputBg = dark ? "#16161d" : "#ffffff";
  const inputBorder = dark ? "#2a2a35" : "#ddd";
  const focusBorder = dark ? "#6ee7f7" : "#0891b2";
  const filterActiveBg = dark ? "#1e1e2a" : "#e0f2fe";
  const filterActiveColor = dark ? "#6ee7f7" : "#0891b2";
  const filterActiveBorder = dark ? "#6ee7f7" : "#0891b2";
  const progressBg = dark ? "#1e1e2a" : "#e2e8f0";
  const catColors = dark ? CATEGORY_COLORS : CATEGORY_COLORS_LIGHT;
  const priColors = dark ? PRIORITY_COLORS : PRIORITY_COLORS_LIGHT;
  const editBg = dark ? "#1e1e2a" : "#f0f9ff";
  const hintColor = dark ? "#2a2a35" : "#ccc";
  const iconColor = dark ? "#444" : "#bbb";
  const dragHandleColor = dark ? "#333" : "#ccc";
  const addBtnBg = dark ? "#6ee7f7" : "#0891b2";
  const addBtnColor = dark ? "#0f0f13" : "#ffffff";

  return (
    <div style={{ minHeight: "100vh", background: bg, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", fontFamily: "'DM Mono', 'Courier New', monospace", transition: "background 0.3s" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #888; border-radius: 2px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div style={{ width: "100%", maxWidth: 580 }}>

        {/* Header */}
        <div style={{ marginBottom: 28, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 4 }}>
              <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 32, fontWeight: 800, color: textPrimary, margin: 0, letterSpacing: "-0.02em", transition: "color 0.3s" }}>MY TASKS</h1>
              <span style={{ color: focusBorder, fontSize: 13, letterSpacing: "0.1em" }}>{done}/{total} done</span>
            </div>
            <div style={{ height: 3, background: progressBg, borderRadius: 4, overflow: "hidden", marginTop: 6, transition: "background 0.3s" }}>
              <div style={{ height: "100%", width: total ? `${(done / total) * 100}%` : "0%", background: `linear-gradient(90deg, ${focusBorder}, #a5f3a0)`, borderRadius: 4, transition: "width 0.4s ease" }} />
            </div>
          </div>

          {/* Theme Toggle */}
          <button onClick={toggleTheme} style={{ background: dark ? "#1e1e2a" : "#e2e8f0", border: `1px solid ${border}`, borderRadius: 20, padding: "6px 14px", cursor: "pointer", color: textSecondary, fontSize: 15, transition: "all 0.2s", marginLeft: 16, marginTop: 4, flexShrink: 0 }} title="Toggle light/dark">
            {dark ? "☀️" : "🌙"}
          </button>
        </div>

        {/* Add Row */}
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          <input ref={inputRef}
            style={{ flex: 1, background: inputBg, border: `1px solid ${inputBorder}`, borderRadius: 10, color: textPrimary, fontSize: 15, fontFamily: "inherit", padding: "12px 16px", outline: "none", transition: "border-color 0.2s, background 0.3s", minWidth: 0 }}
            placeholder="Add a new task..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addTask()}
            onFocus={e => e.target.style.borderColor = focusBorder}
            onBlur={e => e.target.style.borderColor = inputBorder}
          />
          <button onClick={addTask} style={{ background: addBtnBg, border: "none", borderRadius: 10, color: addBtnColor, fontSize: 22, fontWeight: 700, width: 48, height: 48, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", flexShrink: 0 }}>+</button>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
          {["Work","Personal","Urgent"].map(c => (
            <select key={c} style={{ display: "none" }} />
          ))}
          <select style={{ background: inputBg, border: `1px solid ${inputBorder}`, borderRadius: 8, color: textSecondary, fontSize: 13, fontFamily: "inherit", padding: "9px 8px", outline: "none", cursor: "pointer", transition: "background 0.3s" }} value={newCat} onChange={e => setNewCat(e.target.value)}>
            {CATEGORIES.filter(c => c !== "All").map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select style={{ background: inputBg, border: `1px solid ${inputBorder}`, borderRadius: 8, color: textSecondary, fontSize: 13, fontFamily: "inherit", padding: "9px 8px", outline: "none", cursor: "pointer", transition: "background 0.3s" }} value={newPriority} onChange={e => setNewPriority(e.target.value)}>
            {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)} priority</option>)}
          </select>
          <input type="date" style={{ background: inputBg, border: `1px solid ${inputBorder}`, borderRadius: 8, color: textSecondary, fontSize: 13, fontFamily: "inherit", padding: "9px 8px", outline: "none", cursor: "pointer", transition: "background 0.3s" }} value={newDue} onChange={e => setNewDue(e.target.value)} />
        </div>

        {/* Search */}
        <div style={{ position: "relative", marginBottom: 16 }}>
          <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: textSecondary, fontSize: 15, pointerEvents: "none" }}>⌕</span>
          <input style={{ width: "100%", background: inputBg, border: `1px solid ${inputBorder}`, borderRadius: 10, color: textPrimary, fontSize: 15, fontFamily: "inherit", padding: "11px 14px 11px 36px", outline: "none", transition: "border-color 0.2s, background 0.3s" }}
            placeholder="Search tasks..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={e => e.target.style.borderColor = focusBorder}
            onBlur={e => e.target.style.borderColor = inputBorder}
          />
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setFilter(c)}
              style={{ background: filter === c ? filterActiveBg : "transparent", border: `1px solid ${filter === c ? filterActiveBorder : inputBorder}`, color: filter === c ? filterActiveColor : textSecondary, fontFamily: "inherit", fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", padding: "6px 14px", borderRadius: 20, cursor: "pointer", transition: "all 0.15s" }}>
              {c}
            </button>
          ))}
        </div>

        {/* Task List */}
        <div>
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", color: textSecondary, fontSize: 13, padding: "40px 0", letterSpacing: "0.05em" }}>
              {search ? `NO RESULTS FOR "${search.toUpperCase()}"` : "NO TASKS HERE ✦"}
            </div>
          )}
          {filtered.map(task => {
            const dueFmt = formatDue(task.due);
            const overdue = isOverdue(task.due) && !task.done;
            return (
              <div key={task.id}
                draggable
                onDragStart={e => onDragStart(e, task.id)}
                onDragOver={e => onDragOver(e, task.id)}
                onDrop={e => onDrop(e, task.id)}
                onDragEnd={onDragEnd}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "14px 16px",
                  background: cardBg,
                  border: `1px solid ${dragOverId === task.id && dragId !== task.id ? focusBorder : border}`,
                  borderLeft: overdue ? `3px solid ${priColors.high}88` : undefined,
                  borderRadius: 10, marginBottom: 6,
                  opacity: task.done ? 0.4 : dragId === task.id ? 0.3 : 1,
                  boxShadow: dragOverId === task.id && dragId !== task.id ? `0 0 0 2px ${focusBorder}22` : dark ? "none" : "0 1px 4px rgba(0,0,0,0.06)",
                  transition: "border-color 0.2s, box-shadow 0.2s, opacity 0.2s, background 0.3s",
                  animation: "fadeIn 0.22s ease",
                  cursor: "grab", userSelect: "none",
                }}>

                {/* Drag handle */}
                <span style={{ color: dragHandleColor, fontSize: 16, cursor: "grab", flexShrink: 0 }}>⠿</span>

                {/* Checkbox */}
                <div onClick={() => toggleDone(task.id)}
                  style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${task.done ? focusBorder : border}`, background: task.done ? focusBorder : "transparent", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.18s" }}>
                  {task.done && <span style={{ color: dark ? "#0f0f13" : "#fff", fontSize: 11, fontWeight: 700 }}>✓</span>}
                </div>

                {/* Body */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editingId === task.id ? (
                    <input ref={editRef}
                      style={{ width: "100%", background: editBg, border: `1px solid ${focusBorder}`, borderRadius: 6, color: textPrimary, fontSize: 15, fontFamily: "inherit", padding: "4px 8px", outline: "none" }}
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      onBlur={() => saveEdit(task.id)}
                      onKeyDown={e => { if (e.key === "Enter") saveEdit(task.id); if (e.key === "Escape") setEditingId(null); }}
                    />
                  ) : (
                    <span onDoubleClick={() => !task.done && startEdit(task)} title="Double-click to edit"
                      style={{ color: task.done ? textSecondary : textPrimary, fontSize: 15, lineHeight: 1.4, cursor: "pointer", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textDecoration: task.done ? "line-through" : "none", transition: "color 0.3s" }}>
                      {task.text}
                    </span>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
                    <button onClick={() => cyclePriority(task.id, task.priority)} title="Click to change priority"
                      style={{ background: "none", border: `1px solid ${priColors[task.priority]}55`, borderRadius: 4, fontFamily: "inherit", fontSize: 10, letterSpacing: "0.04em", padding: "2px 7px", cursor: "pointer", color: priColors[task.priority], transition: "all 0.15s" }}>
                      {PRIORITY_LABELS[task.priority]}
                    </button>
                    <span style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", padding: "2px 8px", borderRadius: 20, fontWeight: 500, flexShrink: 0, background: `${catColors[task.category]}18`, color: catColors[task.category], border: `1px solid ${catColors[task.category]}33` }}>
                      {task.category}
                    </span>
                    {dueFmt && (
                      <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, color: dueFmt.color, background: dueFmt.color + "18", flexShrink: 0 }}>
                        ◷ {dueFmt.label}
                      </span>
                    )}
                  </div>
                </div>

                {editingId !== task.id && (
                  <button onClick={() => startEdit(task)} style={{ background: "none", border: "none", cursor: "pointer", padding: "3px 5px", borderRadius: 5, color: iconColor, fontSize: 15, transition: "color 0.15s", flexShrink: 0 }}>✎</button>
                )}
                <button onClick={() => deleteTask(task.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: "3px 5px", borderRadius: 5, color: iconColor, fontSize: 15, transition: "color 0.15s", flexShrink: 0 }}>✕</button>
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: "center", color: hintColor, fontSize: 10, marginTop: 28, letterSpacing: "0.07em", lineHeight: 2 }}>
          DRAG ⠿ TO REORDER · DOUBLE-CLICK TO EDIT · CLICK PRIORITY TO CYCLE<br />DATA AUTO-SAVED IN BROWSER
        </div>
      </div>
    </div>
  );
}