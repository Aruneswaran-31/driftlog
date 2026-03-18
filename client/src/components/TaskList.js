import React, { useState } from 'react';
import api from '../api';

function TaskList({ tasks, onUpdate, onDelete }) {
    const [editing, setEditing] = useState(null);
    const [editData, setEditData] = useState({});

    if (!tasks || tasks.length === 0) {
        return <div style={{ textAlign: 'center', opacity: 0.6, marginTop: '40px' }}>No tasks found.</div>;
    }

    const toggleStatus = async (task) => {
        const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
        await api.put(`/tasks/${task.id}`, { ...task, status: newStatus });
        onUpdate();
    };

    const togglePin = async (task) => {
        const newPin = task.pinned ? 0 : 1;
        await api.put(`/tasks/${task.id}`, { ...task, pinned: newPin });
        onUpdate();
    };

    const toggleSubtask = async (task, subtaskId) => {
        let parsed = [];
        try { parsed = JSON.parse(task.subtasks || '[]'); } catch(e) {}
        
        const updatedSubtasks = parsed.map(s => 
            s.id === subtaskId ? { ...s, done: !s.done } : s
        );

        await api.put(`/tasks/${task.id}`, { ...task, subtasks: JSON.stringify(updatedSubtasks) });
        onUpdate();
    };

    const startEdit = (task) => {
        setEditing(task.id);
        setEditData(task);
    };

    const saveEdit = async (id) => {
        await api.put(`/tasks/${id}`, editData);
        setEditing(null);
        onUpdate();
    };

    const delTask = async (id) => {
        if (window.confirm('Delete this task?')) {
            await api.delete(`/tasks/${id}`);
            onDelete();
        }
    };

    const today = new Date();
    today.setHours(0,0,0,0);

    return (
        <div className="dashboard-grid">
            {tasks.map(t => {
                let isOverdue = false;
                if (t.due_date && t.status !== 'Completed') {
                    if (new Date(t.due_date) < today) isOverdue = true;
                }

                let subtasks = [];
                try { subtasks = JSON.parse(t.subtasks || '[]'); } catch(e) {}

                const doneCount = subtasks.filter(s => s.done).length;
                const totalCount = subtasks.length;
                const progressPct = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

                if (editing === t.id) {
                    return (
                        <div key={t.id} className="card">
                            <input 
                                value={editData.title} 
                                onChange={e => setEditData({...editData, title: e.target.value})} 
                            />
                            <textarea 
                                value={editData.description} 
                                onChange={e => setEditData({...editData, description: e.target.value})} 
                            />
                            <select value={editData.priority} onChange={e => setEditData({...editData, priority: e.target.value})} style={{ backgroundColor: "var(--surface)", color: "var(--text)" }}>
                                <option>Low</option>
                                <option>Medium</option>
                                <option>High</option>
                            </select>
                            <select value={editData.category || 'General'} onChange={e => setEditData({...editData, category: e.target.value})} style={{ backgroundColor: "var(--surface)", color: "var(--text)" }}>
                                <option value="General">General</option>
                                <option value="Work">Work</option>
                                <option value="Personal">Personal</option>
                                <option value="Health">Health</option>
                                <option value="Study">Study</option>
                                <option value="Finance">Finance</option>
                            </select>
                            <select value={editData.recurring || 'none'} onChange={e => setEditData({...editData, recurring: e.target.value})} style={{ backgroundColor: "var(--surface)", color: "var(--text)" }}>
                                <option value="none">Does not repeat</option>
                                <option value="daily">Repeats Daily</option>
                                <option value="weekly">Repeats Weekly</option>
                                <option value="monthly">Repeats Monthly</option>
                            </select>
                            <input type="date" value={editData.due_date || ''} onChange={e => setEditData({...editData, due_date: e.target.value})} />
                            <div className="task-actions">
                                <button className="success" onClick={() => saveEdit(t.id)}>Save</button>
                                <button className="secondary" onClick={() => setEditing(null)}>Cancel</button>
                            </div>
                        </div>
                    );
                }

                return (
                    <div key={t.id} className={`card ${isOverdue ? 'overdue' : ''} ${t.status === 'Completed' ? 'completed' : ''} ${t.pinned ? 'pinned' : ''}`}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <h3 style={{ margin: '0 0 10px 0', flex: 1 }}>{t.title}</h3>
                            <button 
                                onClick={() => togglePin(t)}
                                style={{ background: 'none', border: 'none', fontSize: '1.2rem', padding: 0, cursor: 'pointer', opacity: t.pinned ? 1 : 0.4 }}
                                title={t.pinned ? "Unpin task" : "Pin task"}
                            >
                                📌
                            </button>
                        </div>
                        
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
                            <span className={`badge ${t.priority.toLowerCase()}`}>{t.priority} Priority</span>
                            <span className={`badge ${(t.category || 'general').toLowerCase()}`}>{t.category || 'General'}</span>
                            <span className={`badge ${t.status === 'Completed' ? 'completed' : 'pending'}`}>{t.status}</span>
                            {isOverdue && <span className="badge overdue">Overdue</span>}
                            {t.recurring && t.recurring !== "none" && (
                              <span className="badge" style={{
                                background: "#f3e8ff",
                                color: "#7c3aed",
                                fontSize: "11px"
                              }}>
                                🔁 {t.recurring === "daily" ? "Daily" : 
                                    t.recurring === "weekly" ? "Weekly" : 
                                    "Monthly"}
                                {t.repeat_count > 0 && 
                                  ` × ${t.repeat_count}`}
                              </span>
                            )}
                        </div>
                        
                        {t.description && <p style={{ fontSize: '0.95rem', opacity: 0.9 }}>{t.description}</p>}
                        
                        {totalCount > 0 && (
                            <div style={{ margin: '15px 0', padding: '10px', background: 'var(--surface2)', borderRadius: '8px' }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '5px' }}>
                                    Subtasks ({doneCount}/{totalCount})
                                </div>
                                <div className="subtask-bar">
                                    <div className="subtask-bar-fill" style={{ width: `${progressPct}%` }}></div>
                                </div>
                                <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 0 0' }}>
                                    {subtasks.map(s => (
                                        <li key={s.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '6px', fontSize: '0.9rem', opacity: t.status === 'Completed' ? 0.6 : 1 }}>
                                            <input 
                                                type="checkbox" 
                                                checked={s.done} 
                                                onChange={() => toggleSubtask(t, s.id)} 
                                                disabled={t.status === 'Completed'}
                                                style={{ width: 'auto', margin: '3px 0 0 0' }}
                                            />
                                            <span style={{ textDecoration: s.done ? 'line-through' : 'none', flex: 1 }}>{s.text}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {t.due_date && <small style={{ display: 'block', opacity: 0.7, marginTop: 10 }}>Due: {t.due_date}</small>}
                        
                        <div className="task-actions">
                            <button className="secondary" onClick={() => toggleStatus(t)}>
                                {t.status === 'Completed' ? 'Mark Pending' : 'Mark Done'}
                            </button>
                            <button className="warning" onClick={() => startEdit(t)}>Edit</button>
                            <button className="danger" onClick={() => delTask(t.id)}>Delete</button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default TaskList;
