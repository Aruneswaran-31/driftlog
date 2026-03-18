import React, { useState } from 'react';
import api from '../api';

function TaskForm({ onAdd }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('Medium');
    const [status, setStatus] = useState('Pending');
    const [dueDate, setDueDate] = useState('');
    
    // New Feature States
    const [category, setCategory] = useState('General');
    const [recurring, setRecurring] = useState('none');
    const [repeatCount, setRepeatCount] = useState(1);
    
    // Subtasks State
    const [subtasks, setSubtasks] = useState([]);
    const [subtaskInput, setSubtaskInput] = useState('');

    const handleAddSubtask = (e) => {
        e.preventDefault();
        if (!subtaskInput.trim()) return;
        setSubtasks([...subtasks, { id: Date.now(), text: subtaskInput, done: false }]);
        setSubtaskInput('');
    };

    const removeSubtask = (id) => {
        setSubtasks(subtasks.filter(s => s.id !== id));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/tasks', { 
                title, 
                description, 
                priority, 
                status, 
                due_date: dueDate,
                category,
                recurring,
                repeat_count: recurring !== 'none' ? repeatCount : 0,
                subtasks: JSON.stringify(subtasks)
            });
            setTitle('');
            setDescription('');
            setPriority('Medium');
            setStatus('Pending');
            setDueDate('');
            setCategory('General');
            setRecurring('none');
            setRepeatCount(1);
            setSubtasks([]);
            onAdd();
        } catch (error) {
            console.error('Failed to create task:', error);
        }
    };

    const categoryColors = {
        'General': 'gray', 'Work': 'blue', 'Personal': 'green', 
        'Health': 'red', 'Study': 'purple', 'Finance': 'yellow'
    };

    return (
        <div className="card">
            <h3>Add New Task</h3>
            <form onSubmit={handleSubmit} className="task-form-grid">
                <input 
                    type="text" 
                    placeholder="Task Title" 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    required 
                    className="full-width"
                />

                <textarea 
                    placeholder="Description..." 
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                    className="full-width"
                    rows={2}
                />

                <div className="full-width" style={{ marginTop: '-10px', marginBottom: '15px' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Subtasks</label>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                        <input 
                            type="text" 
                            placeholder="Add a subtask..." 
                            value={subtaskInput} 
                            onChange={e => setSubtaskInput(e.target.value)}
                            style={{ margin: 0, flex: 1 }}
                        />
                        <button className="secondary" onClick={handleAddSubtask}>Add</button>
                    </div>
                    {subtasks.length > 0 && (
                        <ul style={{ paddingLeft: 20, marginTop: 10, fontSize: '0.9rem' }}>
                            {subtasks.map(s => (
                                <li key={s.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                    <span>{s.text}</span>
                                    <button 
                                        type="button" 
                                        style={{ background: 'none', color: 'var(--red)', border: 'none', padding: 0, fontSize: '1rem', cursor: 'pointer' }}
                                        onClick={() => removeSubtask(s.id)}
                                    >
                                        ×
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                
                <input 
                    type="date" 
                    value={dueDate} 
                    onChange={e => setDueDate(e.target.value)} 
                />
                
                <select value={priority} onChange={e => setPriority(e.target.value)} style={{ backgroundColor: "var(--surface)", color: "var(--text)" }}>
                    <option value="Low">Low Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="High">High Priority</option>
                </select>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border)', borderRadius: '8px', padding: '0 10px', background: 'var(--surface)' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: categoryColors[category] }}></div>
                    <select 
                        value={category} 
                        onChange={e => setCategory(e.target.value)} 
                        style={{ border: 'none', margin: 0, paddingLeft: 0, flex: 1, backgroundColor: "var(--surface)", color: "var(--text)" }}
                    >
                        <option value="General">General</option>
                        <option value="Work">Work</option>
                        <option value="Personal">Personal</option>
                        <option value="Health">Health</option>
                        <option value="Study">Study</option>
                        <option value="Finance">Finance</option>
                    </select>
                </div>
                
                <select value={recurring} onChange={e => setRecurring(e.target.value)} style={{ backgroundColor: "var(--surface)", color: "var(--text)" }}>
                    <option value="none">Does not repeat</option>
                    <option value="daily">Repeats Daily</option>
                    <option value="weekly">Repeats Weekly</option>
                    <option value="monthly">Repeats Monthly</option>
                </select>

                {recurring !== "none" && (
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "10px",
                    marginTop: "10px",
                    padding: "10px 14px",
                    background: "var(--surface2)",
                    borderRadius: "8px",
                    border: "1px solid var(--border)"
                  }}>
                    <span style={{ 
                      fontSize: "13px", 
                      color: "var(--text2)",
                      whiteSpace: "nowrap"
                    }}>
                      Repeat for
                    </span>
                    
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={repeatCount}
                      onChange={(e) => setRepeatCount(
                        Math.max(1, parseInt(e.target.value) || 1)
                      )}
                      style={{ 
                        width: "70px", 
                        textAlign: "center",
                        backgroundColor: "var(--surface)",
                        color: "var(--text)"
                      }}
                    />
                    
                    <span style={{ 
                      fontSize: "13px", 
                      color: "var(--text2)",
                      whiteSpace: "nowrap"
                    }}>
                      {recurring === "daily" && 
                        (repeatCount === 1 ? "day" : "days")}
                      {recurring === "weekly" && 
                        (repeatCount === 1 ? "week" : "weeks")}
                      {recurring === "monthly" && 
                        (repeatCount === 1 ? "month" : "months")}
                    </span>

                    <span style={{
                      fontSize: "12px",
                      color: "var(--text3)",
                      marginLeft: "auto"
                    }}>
                      {recurring === "daily" && 
                        `Ends after ${repeatCount} day${repeatCount===1?"":"s"}`}
                      {recurring === "weekly" && 
                        `Ends after ${repeatCount} week${repeatCount===1?"":"s"}`}
                      {recurring === "monthly" && 
                        `Ends after ${repeatCount} month${repeatCount===1?"":"s"}`}
                    </span>
                  </div>
                )}

                <select value={status} onChange={e => setStatus(e.target.value)} style={{ backgroundColor: "var(--surface)", color: "var(--text)" }}>
                    <option value="Pending">Pending</option>
                    <option value="Completed">Completed</option>
                </select>

                <button type="submit" className="full-width">Submit Task</button>
            </form>
        </div>
    );
}

export default TaskForm;
