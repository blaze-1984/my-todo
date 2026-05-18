import { useState, useRef, useEffect, useCallback } from "react";

const CATEGORIES = ["All", "Work", "Personal", "Urgent"];
const CATEGORY_COLORS = { Work: "#6ee7f7", Personal: "#a5f3a0", Urgent: "#f97373" };
const PRIORITIES = ["low", "medium", "high"];
const PRIORITY_COLORS = { low: "#555", medium: "#f0c060", high: "#f97373" };
const PRIORITY_LABELS = { low: "▽ Low", medium: "◈ Med", high: "▲ High" };

function generateId() { return Math.random().toString(36).slice(2, 10); }

const STORAGE_KEY = "blaze_tasks_v1";

const defaultTasks = [
  { id: generateId(), text: "Review onboarding process doc", done: false, category: "Work", priority: "medium", due: "" },
  { id: generateId(), text: "Set up Asana automation", done: false, category: "Work", priority: "high", due: new Date(Date.now() - 86400000).toISOString().slice(0,10) },
  { id: generateId(), text: "Call back client re: dashboard", done: true, category: "Urgent", priority: "high", due: "" },
  { id: generateId(), text: "Plan team retro agenda", done: false, category: "Personal", priority: "low", due: new Date(Date.now() + 3*86400000).toISOString().slice(0,10) },
];

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : defaultTasks;
  } catch { return defaultTasks; }
}

function isOverdue(due) {
  if (!due) return false;
  return new Date(due) < new Date(new Date().toDateString());
}

function formatDue(due) {
  if (!due) return null;
  const d = new Date(due);
  const today = new Date(new Date().toDateString());
  const diff = Math.round((d - today) / 86400000);
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, color: "#f97373" };
  if (diff === 0) return { label: "Today", color: "#f0c060" };
  if (diff === 1) return { label: "Tomorrow", color: "#a5f3a0" };
  return { label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }), color: "#666" };
}

export default function TodoApp() {
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

  const setTasks = useCallback((val) => {
    setTasksRaw(prev => {
      const next = typeof val === "function" ? val(prev) : val;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  useEffect(() => {
    if (editingId && editRef.current) editRef.current.focus();
  }, [editingId]);

  const addTask = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setTasks(prev => [{ id: generateId(), text: trimmed, done: false, category: newCat, priority: newPriority, due: newDue }, ...prev]);
    setInput(""); setNewDue("");
    inputRef.current?.focus();
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

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f13", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", fontFamily: "'DM Mono', 'Courier New', monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }

        .task-row { display: flex; align-items: center; gap: 10px; padding: 12px 14px; background: #16161d; border: 1px solid #222; border-radius: 10px; margin-bottom: 6px; transition: border-color 0.2s, box-shadow 0.2s, opacity 0.2s; animation: fadeIn 0.22s ease; cursor: grab; user-select: none; }
        .task-row:hover { border-color: #333; box-shadow: 0 2px 16px rgba(0,0,0,0.35); }
        .task-row.done-row { opacity: 0.4; }
        .task-row.dragging { opacity: 0.3; border-style: dashed; border-color: #444; }
        .task-row.drag-over { border-color: #6ee7f7; box-shadow: 0 0 0 2px #6ee7f722; }
        .task-row.overdue-row { border-left: 3px solid #f9737388; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }

        .drag-handle { color: #333; font-size: 14px; cursor: grab; flex-shrink: 0; transition: color 0.15s; }
        .task-row:hover .drag-handle { color: #555; }

        .checkbox { width: 18px; height: 18px; border-radius: 50%; border: 2px solid #444; background: transparent; cursor: pointer; flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: background 0.18s, border-color 0.18s; }
        .checkbox.checked { background: #6ee7f7; border-color: #6ee7f7; }
        .checkmark { color: #0f0f13; font-size: 10px; font-weight: 700; }

        .task-body { flex: 1; min-width: 0; }
        .task-text { color: #e8e8f0; font-size: 13px; line-height: 1.4; cursor: pointer; padding: 2px 4px; border-radius: 4px; transition: background 0.15s; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .task-text:hover { background: #1e1e2a; }
        .task-text.strikethrough { text-decoration: line-through; color: #555; }
        .task-meta { display: flex; align-items: center; gap: 6px; margin-top: 5px; flex-wrap: wrap; }

        .edit-input { width: 100%; background: #1e1e2a; border: 1px solid #6ee7f7; border-radius: 6px; color: #e8e8f0; font-size: 13px; font-family: inherit; padding: 4px 8px; outline: none; }

        .cat-badge { font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase; padding: 2px 7px; border-radius: 20px; font-weight: 500; flex-shrink: 0; }
        .due-badge { font-size: 10px; padding: 2px 6px; border-radius: 4px; flex-shrink: 0; }
        .priority-btn { background: none; border: 1px solid; border-radius: 4px; font-family: inherit; font-size: 9px; letter-spacing: 0.04em; padding: 2px 6px; cursor: pointer; transition: all 0.15s; flex-shrink: 0; }
        .priority-btn:hover { opacity: 0.75; }

        .icon-btn { background: none; border: none; cursor: pointer; padding: 3px 5px; border-radius: 5px; color: #444; font-size: 13px; transition: color 0.15s, background 0.15s; flex-shrink: 0; }
        .icon-btn:hover { color: #e8e8f0; background: #222; }
        .icon-btn.delete:hover { color: #f97373; background: #2a1616; }

        .filter-btn { background: transparent; border: 1px solid #2a2a35; color: #777; font-family: inherit; font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; padding: 5px 12px; border-radius: 20px; cursor: pointer; transition: all 0.15s; }
        .filter-btn:hover { border-color: #555; color: #ddd; }
        .filter-btn.active { background: #1e1e2a; border-color: #6ee7f7; color: #6ee7f7; }

        .add-input { flex: 1; background: #16161d; border: 1px solid #2a2a35; border-radius: 10px; color: #e8e8f0; font-size: 13px; font-family: inherit; padding: 11px 14px; outline: none; transition: border-color 0.2s; min-width: 0; }
        .add-input:focus { border-color: #6ee7f7; }
        .add-input::placeholder { color: #444; }

        .search-wrap { position: relative; margin-bottom: 16px; }
        .search-icon { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); color: #444; font-size: 14px; pointer-events: none; }
        .search-input { width: 100%; background: #16161d; border: 1px solid #2a2a35; border-radius: 10px; color: #e8e8f0; font-size: 13px; font-family: inherit; padding: 10px 14px 10px 36px; outline: none; transition: border-color 0.2s; }
        .search-input:focus { border-color: #6ee7f7; }
        .search-input::placeholder { color: #444; }

        .mini-select { background: #16161d; border: 1px solid #2a2a35; border-radius: 8px; color: #aaa; font-size: 11px; font-family: inherit; padding: 8px; outline: none; cursor: pointer; }
        .mini-select:focus { border-color: #6ee7f7; }

        .due-input { background: #16161d; border: 1px solid #2a2a35; border-radius: 8px; color: #666; font-size: 11px; font-family: inherit; padding: 8px; outline: none; cursor: pointer; }
        .due-input:focus { border-color: #6ee7f7; color: #e8e8f0; }
        .due-input::-webkit-calendar-picker-indicator { filter: invert(0.3); }

        .add-btn { background: #6ee7f7; border: none; border-radius: 10px; color: #0f0f13; font-size: 22px; font-weight: 700; width: 44px; height: 44px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.15s, transform 0.1s; flex-shrink: 0; }
        .add-btn:hover { background: #9ef5ff; transform: scale(1.06); }
        .add-btn:active { transform: scale(0.97); }

        .progress-bar { height: 3px; background: #1e1e2a; border-radius: 4px; overflow: hidden; margin-top: 6px; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #6ee7f7, #a5f3a0); border-radius: 4px; transition: width 0.4s ease; }
      `}</style>

      <div style={{ width: "100%", maxWidth: 560 }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 4 }}>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 30, fontWeight: 800, color: "#e8e8f0", margin: 0, letterSpacing: "-0.02em" }}>MY TASKS</h1>
            <span style={{ color: "#6ee7f7", fontSize: 12, letterSpacing: "0.1em" }}>{done}/{total} done</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: total ? `${(done / total) * 100}%` : "0%" }} />
          </div>
        </div>

        {/* Add Row */}
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          <input ref={inputRef} className="add-input" placeholder="Add a new task..." value={input}
            onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addTask()} />
          <button className="add-btn" onClick={addTask}>+</button>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
          <select className="mini-select" value={newCat} onChange={e => setNewCat(e.target.value)}>
            {CATEGORIES.filter(c => c !== "All").map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="mini-select" value={newPriority} onChange={e => setNewPriority(e.target.value)}>
            {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)} priority</option>)}
          </select>
          <input type="date" className="due-input" value={newDue} onChange={e => setNewDue(e.target.value)} title="Due date (optional)" />
        </div>

        {/* Search */}
        <div className="search-wrap">
          <span className="search-icon">⌕</span>
          <input className="search-input" placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Category Filters */}
        <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
          {CATEGORIES.map(c => (
            <button key={c} className={`filter-btn ${filter === c ? "active" : ""}`} onClick={() => setFilter(c)}>{c}</button>
          ))}
        </div>

        {/* Task List */}
        <div>
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", color: "#444", fontSize: 12, padding: "40px 0", letterSpacing: "0.05em" }}>
              {search ? `NO RESULTS FOR "${search.toUpperCase()}"` : "NO TASKS HERE ✦"}
            </div>
          )}
          {filtered.map(task => {
            const dueFmt = formatDue(task.due);
            const overdue = isOverdue(task.due) && !task.done;
            return (
              <div key={task.id}
                className={[
                  "task-row",
                  task.done ? "done-row" : "",
                  dragId === task.id ? "dragging" : "",
                  dragOverId === task.id && dragId !== task.id ? "drag-over" : "",
                  overdue ? "overdue-row" : ""
                ].join(" ")}
                draggable
                onDragStart={e => onDragStart(e, task.id)}
                onDragOver={e => onDragOver(e, task.id)}
                onDrop={e => onDrop(e, task.id)}
                onDragEnd={onDragEnd}
              >
                <span className="drag-handle">⠿</span>

                <div className={`checkbox ${task.done ? "checked" : ""}`} onClick={() => toggleDone(task.id)}>
                  {task.done && <span className="checkmark">✓</span>}
                </div>

                <div className="task-body">
                  {editingId === task.id ? (
                    <input ref={editRef} className="edit-input" value={editText}
                      onChange={e => setEditText(e.target.value)}
                      onBlur={() => saveEdit(task.id)}
                      onKeyDown={e => { if (e.key === "Enter") saveEdit(task.id); if (e.key === "Escape") setEditingId(null); }} />
                  ) : (
                    <span className={`task-text ${task.done ? "strikethrough" : ""}`}
                      onDoubleClick={() => !task.done && startEdit(task)} title="Double-click to edit">
                      {task.text}
                    </span>
                  )}
                  <div className="task-meta">
                    <button className="priority-btn"
                      style={{ color: PRIORITY_COLORS[task.priority], borderColor: PRIORITY_COLORS[task.priority] + "55" }}
                      onClick={() => cyclePriority(task.id, task.priority)}
                      title="Click to change priority">
                      {PRIORITY_LABELS[task.priority]}
                    </button>
                    <span className="cat-badge" style={{ background: `${CATEGORY_COLORS[task.category]}15`, color: CATEGORY_COLORS[task.category] || "#aaa", border: `1px solid ${CATEGORY_COLORS[task.category] || "#444"}33` }}>
                      {task.category}
                    </span>
                    {dueFmt && (
                      <span className="due-badge" style={{ color: dueFmt.color, background: dueFmt.color + "18" }}>
                        ◷ {dueFmt.label}
                      </span>
                    )}
                  </div>
                </div>

                {editingId !== task.id && (
                  <button className="icon-btn" onClick={() => startEdit(task)} title="Edit">✎</button>
                )}
                <button className="icon-btn delete" onClick={() => deleteTask(task.id)} title="Delete">✕</button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", color: "#2a2a35", fontSize: 10, marginTop: 28, letterSpacing: "0.07em", lineHeight: 2 }}>
          DRAG ⠿ TO REORDER · DOUBLE-CLICK TO EDIT · CLICK PRIORITY TO CYCLE
          <br />DATA AUTO-SAVED IN BROWSER
        </div>
      </div>
    </div>
  );
}