import React, { useState, useEffect, useCallback } from 'react';
import api from './api';
import './App.css';

import Login from './components/Login';
import Register from './components/Register';
import DashboardStats from './components/DashboardStats';
import DashboardCharts from './components/DashboardCharts';
import ProgressBar from './components/ProgressBar';
import TaskForm from './components/TaskForm';
import TaskList from './components/TaskList';
import CalendarView from './components/CalendarView';
import ProfilePage from './components/ProfilePage';

function App() {
    const [user, setUser] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);
    const [dark, setDark] = useState(false);
    
    // UI Layout States
    const [showLogin, setShowLogin] = useState(true);
    const [currentView, setCurrentView] = useState('list'); // 'list' | 'calendar'
    const [showProfile, setShowProfile] = useState(false);

    // Filters and Search
    const [filter, setFilter] = useState('All');
    const [search, setSearch] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('All Priorities');
    const [sortMode, setSortMode] = useState('Newest first');

    useEffect(() => {
        if (dark) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }, [dark]);

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const processRecurring = async () => {
        try {
            const res = await api.post('/tasks/process-recurring');
            if (res.data.count && res.data.count > 0) {
                showToast(`Queued ${res.data.count} recurring task(s)`);
            }
        } catch (e) {
            console.error('Recurring error:', e);
        }
    };

    const fetchTasks = useCallback(async () => {
        try {
            const res = await api.get('/tasks');
            setTasks(res.data);
            processRecurring(); // Side effect check after pulling tasks
        } catch (error) {
            if (error.response?.status === 401) handleLogout();
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showToast]);

    useEffect(() => {
        const token = localStorage.getItem('driftlog_token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setUser({ email: payload.email, name: payload.name, avatar: payload.avatar || '' });
                fetchTasks();
            } catch (e) {
                handleLogout();
            }
        } else {
            setLoading(false);
        }
    }, [fetchTasks]);

    const handleLogout = () => {
        localStorage.removeItem('driftlog_token');
        setUser(null);
        setTasks([]);
        setShowProfile(false);
        setSortMode('Newest first');
    };

    if (loading) {
        return <div className="loader"></div>;
    }

    if (!user) {
        return (
            <div className="App">
                <div style={{ position: 'absolute', top: 20, right: 20 }}>
                    <button className="secondary sm" onClick={() => setDark(!dark)}>
                        {dark ? '☀️ Light' : '🌙 Dark'}
                    </button>
                </div>
                <div className="auth-container">
                    <h1>Driftlog</h1>
                    <p style={{ opacity: 0.8, marginBottom: '30px' }}>Where tasks find their current.</p>
                    
                    <div className="auth-tabs">
                        <div 
                            className={`auth-tab ${showLogin ? 'active' : ''}`} 
                            onClick={() => setShowLogin(true)}
                        >
                            Login
                        </div>
                        <div 
                            className={`auth-tab ${!showLogin ? 'active' : ''}`} 
                            onClick={() => setShowLogin(false)}
                        >
                            Register
                        </div>
                    </div>

                    {showLogin ? (
                        <Login setUser={(u) => { setUser(u); fetchTasks(); }} />
                    ) : (
                        <Register onRegister={() => { setShowLogin(true); showToast('Registered! Please login.'); }} />
                    )}
                </div>
                {toast && <div className="toast">{toast}</div>}
            </div>
        );
    }

    // Advanced Filtering Array Filter
    const today = new Date();
    today.setHours(0,0,0,0);

    const filteredTasks = tasks.filter(t => {
        const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || 
                              (t.description && t.description.toLowerCase().includes(search.toLowerCase()));
        if (!matchesSearch) return false;

        if (priorityFilter !== 'All Priorities') {
            if (priorityFilter === 'High Priority' && t.priority !== 'High') return false;
            if (priorityFilter === 'Medium Priority' && t.priority !== 'Medium') return false;
            if (priorityFilter === 'Low Priority' && t.priority !== 'Low') return false;
        }

        if (filter === 'All') return true;
        if (filter === 'Pending') return t.status !== 'Completed';
        if (filter === 'Completed') return t.status === 'Completed';
        if (filter === 'High Priority') return t.priority === 'High';
        if (filter === 'Overdue') {
            if (!t.due_date || t.status === 'Completed') return false;
            return new Date(t.due_date) < today;
        }
        // Categories
        if (['General', 'Work', 'Personal', 'Health', 'Study', 'Finance'].includes(filter)) {
            return (t.category || 'General') === filter;
        }
        
        return true;
    });

    const priorityScore = { High: 3, Medium: 2, Low: 1 };

    const sortedTasks = [...filteredTasks].sort((a, b) => {
        // ALWAYS PINNED FIRST
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;

        // Then execute sortMode within same pin strata
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        const dueA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
        const dueB = b.due_date ? new Date(b.due_date).getTime() : Infinity;

        switch (sortMode) {
            case 'Newest first': return dateB - dateA;
            case 'Oldest first': return dateA - dateB;
            case 'Due date (earliest)': return dueA - dueB;
            case 'Due date (latest)': 
                if (a.due_date && !b.due_date) return -1;
                if (!a.due_date && b.due_date) return 1;
                return dueB - dueA;
            case 'Priority (High→Low)': return priorityScore[b.priority] - priorityScore[a.priority];
            case 'Priority (Low→High)': return priorityScore[a.priority] - priorityScore[b.priority];
            case 'Alphabetical (A→Z)': return a.title.localeCompare(b.title);
            case 'Alphabetical (Z→A)': return b.title.localeCompare(a.title);
            default: return dateB - dateA;
        }
    });

    return (
        <div className="App">
            <div className="header-top">
                <div>
                    <h1 style={{ marginBottom: 5 }}>Welcome, {user.name}</h1>
                    <p style={{ margin: 0, opacity: 0.8 }}>{new Date().toLocaleDateString()}</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div className="view-toggle" style={{ borderRight: '2px solid var(--border)', paddingRight: '10px' }}>
                        <button 
                            className={currentView === 'list' && !showProfile ? 'active' : 'secondary'} 
                            onClick={() => { setCurrentView('list'); setShowProfile(false); }}
                        >
                            List View
                        </button>
                        <button 
                            className={currentView === 'calendar' && !showProfile ? 'active' : 'secondary'} 
                            onClick={() => { setCurrentView('calendar'); setShowProfile(false); }}
                        >
                            Calendar View
                        </button>
                    </div>

                    <div
                      onClick={() => setShowProfile(!showProfile)}
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        background: "var(--primary)",
                        overflow: "hidden",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontWeight: 700,
                        fontSize: "16px",
                        flexShrink: 0,
                        border: "2px solid var(--border)"
                      }}
                    >
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt="avatar"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover"
                          }}
                        />
                      ) : (
                        user.name?.charAt(0).toUpperCase() || "?"
                      )}
                    </div>
                    <button className="secondary sm" onClick={() => setDark(!dark)}>
                        {dark ? '☀️ Light' : '🌙 Dark'}
                    </button>
                    <button className="danger sm" onClick={handleLogout}>Logout</button>
                </div>
            </div>

            {showProfile ? (
                <ProfilePage 
                    user={user}
                    userEmail={user.email} 
                    onAvatarUpdate={(newAvatar) => {
                        setUser(prev => ({...prev, avatar: newAvatar}));
                    }}
                />
            ) : (
                <>
                    <DashboardStats tasks={tasks} />
                    <ProgressBar tasks={tasks} />
                    <DashboardCharts tasks={tasks} />

                    <TaskForm onAdd={fetchTasks} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' }}>
                        <div className="filter-pills">
                            {['All', 'Pending', 'Completed', 'High Priority', 'Overdue'].map(f => (
                                <div 
                                    key={f} 
                                    className={`pill ${filter === f ? 'active' : ''}`}
                                    onClick={() => setFilter(f)}
                                >
                                    {f}
                                </div>
                            ))}
                            {/* Categories Select inside Pill Row to match instructions */}
                            <select 
                                value={['All', 'Pending', 'Completed', 'High Priority', 'Overdue'].includes(filter) ? 'All Categories' : filter} 
                                onChange={e => setFilter(e.target.value === 'All Categories' ? 'All' : e.target.value)}
                                className={`pill ${['General', 'Work', 'Personal', 'Health', 'Study', 'Finance'].includes(filter) ? 'active' : ''}`}
                                style={{ margin: 0, paddingLeft: 10, backgroundColor: "var(--surface)", color: "var(--text)" }}
                            >
                                <option value="All Categories">All Categories</option>
                                <option value="Work">Work</option>
                                <option value="Personal">Personal</option>
                                <option value="Health">Health</option>
                                <option value="Study">Study</option>
                                <option value="Finance">Finance</option>
                                <option value="General">General</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <input 
                                type="text" 
                                placeholder="Search tasks..." 
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                style={{ width: '250px', margin: 0 }}
                            />
                            <select
                                value={priorityFilter}
                                onChange={e => setPriorityFilter(e.target.value)}
                                style={{ margin: 0, backgroundColor: "var(--surface)", color: "var(--text)" }}
                            >
                                <option value="All Priorities">All Priorities</option>
                                <option value="High Priority">High Priority</option>
                                <option value="Medium Priority">Medium Priority</option>
                                <option value="Low Priority">Low Priority</option>
                            </select>
                            <select
                                value={sortMode}
                                onChange={e => setSortMode(e.target.value)}
                                style={{ margin: 0, backgroundColor: "var(--surface)", color: "var(--text)" }}
                            >
                                <option value="Newest first">Newest first</option>
                                <option value="Oldest first">Oldest first</option>
                                <option value="Due date (earliest)">Due date (earliest)</option>
                                <option value="Due date (latest)">Due date (latest)</option>
                                <option value="Priority (High→Low)">Priority (High→Low)</option>
                                <option value="Priority (Low→High)">Priority (Low→High)</option>
                                <option value="Alphabetical (A→Z)">Alphabetical (A→Z)</option>
                                <option value="Alphabetical (Z→A)">Alphabetical (Z→A)</option>
                            </select>
                        </div>
                    </div>

                    {currentView === 'list' ? (
                        <TaskList 
                            tasks={sortedTasks} 
                            onUpdate={fetchTasks} 
                            onDelete={fetchTasks} 
                        />
                    ) : (
                        <CalendarView tasks={sortedTasks} />
                    )}
                </>
            )}

            {toast && <div className="toast">{toast}</div>}
        </div>
    );
}

export default App;
