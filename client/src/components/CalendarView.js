import React, { useState } from 'react';

const CalendarView = ({ tasks }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);

    const getDaysInMonth = (year, month) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (year, month) => {
        let day = new Date(year, month, 1).getDay();
        return day === 0 ? 6 : day - 1;
    };

    const formatDateStr = (year, month, day) => {
        const m = String(month + 1).padStart(2, '0');
        const d = String(day).padStart(2, '0');
        return `${year}-${m}-${d}`;
    };

    const getRecurringDates = (tasksList) => {
        const recurringDates = {};
        
        tasksList.forEach(task => {
            if (!task.recurring || task.recurring === "none") return;
            if (!task.due_date) return;
            
            let baseDate = new Date(task.due_date);
            
            const limit = task.repeat_count || 12;
            for (let i = 1; i <= limit; i++) {
                let nextDate = new Date(baseDate);
                
                if (task.recurring === "daily") {
                    nextDate.setDate(baseDate.getDate() + i);
                } else if (task.recurring === "weekly") {
                    nextDate.setDate(baseDate.getDate() + (i * 7));
                } else if (task.recurring === "monthly") {
                    nextDate.setMonth(baseDate.getMonth() + i);
                }
                
                const dateStr = nextDate.toISOString().split("T")[0];
                
                if (!recurringDates[dateStr]) {
                    recurringDates[dateStr] = [];
                }
                recurringDates[dateStr].push({
                    ...task,
                    isRecurringFuture: true
                });
            }
        });
        
        return recurringDates;
    };

    const recurringEvents = getRecurringDates(tasks);

    const getTasksForDate = (dateStr) => {
        const explicitTasks = tasks.filter(t => t.due_date === dateStr);
        const recurringFutureTasks = recurringEvents[dateStr] || [];
        
        // Remove duplicate recurring tasks on the exact exact existing day string
        const explicitIds = new Set(explicitTasks.map(t => t.id));
        const filteredFutures = recurringFutureTasks.filter(t => !explicitIds.has(t.id));
        
        return [...explicitTasks, ...filteredFutures];
    };

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const days = [];
    // Prev month padding
    for (let i = 0; i < firstDay; i++) {
        days.push(<div key={`empty-${i}`} className="cal-day other-month"></div>);
    }
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = formatDateStr(year, month, i);
        const dayTasks = getTasksForDate(dateStr);
        const isSelected = selectedDate === dateStr;
        const isToday = formatDateStr(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()) === dateStr;

        days.push(
            <div 
                key={i} 
                className={`cal-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                onClick={() => setSelectedDate(dateStr)}
            >
                <div className="cal-day-num">{i}</div>
                <div className="cal-dots">
                    {dayTasks.slice(0, 4).map((t, idx) => {
                        let colorClass = 'dot-low';
                        if (t.isRecurringFuture) colorClass = 'dot-recurring';
                        else if (t.priority === 'High') colorClass = 'dot-high';
                        else if (t.priority === 'Medium') colorClass = 'dot-medium';
                        return <div key={idx} className={`cal-dot ${colorClass}`} />;
                    })}
                    {dayTasks.length > 4 && <div style={{ fontSize: '10px', lineHeight: '8px' }}>+</div>}
                </div>
            </div>
        );
    }

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
    const goToday = () => {
        setCurrentDate(new Date());
        setSelectedDate(formatDateStr(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()));
    };

    const selectedTasks = selectedDate ? getTasksForDate(selectedDate) : [];

    return (
        <div>
            <style>{`
                .cal-grid {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    gap: 4px;
                }
                .cal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }
                .cal-weekdays {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    text-align: center;
                    font-weight: bold;
                    margin-bottom: 5px;
                    color: var(--text2);
                    font-size: 0.85rem;
                }
                .cal-day {
                    min-height: 70px;
                    padding: 6px;
                    border: 0.5px solid var(--border);
                    border-radius: 8px;
                    cursor: pointer;
                    background: var(--surface);
                    transition: background 0.15s;
                }
                .cal-day:hover {
                    background: var(--surface2);
                }
                .cal-day.selected {
                    border: 2px solid var(--primary);
                    background: var(--surface2);
                }
                .cal-day.today {
                    background: var(--primary);
                    color: white;
                }
                .cal-day.other-month {
                    opacity: 0.35;
                    cursor: default;
                }
                .cal-day.other-month:hover {
                    background: var(--surface);
                }
                .cal-day-num {
                    font-size: 13px;
                    font-weight: 500;
                    margin-bottom: 4px;
                }
                .cal-dots {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 2px;
                }
                .cal-dot {
                    width: 7px;
                    height: 7px;
                    border-radius: 50%;
                }
                .dot-high { background: #e74c3c; }
                .dot-medium { background: #f39c12; }
                .dot-low { background: #2ecc71; }
                .dot-recurring { background: #9b59b6; }
            `}</style>

            <div className="card">
                <div className="cal-header">
                    <h2 style={{ margin: 0 }}>
                        {currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                    </h2>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="secondary sm" onClick={prevMonth}>&lt; Prev</button>
                        <button className="secondary sm" onClick={goToday}>Today</button>
                        <button className="secondary sm" onClick={nextMonth}>Next &gt;</button>
                    </div>
                </div>

                <div className="cal-weekdays">
                    <div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div>
                </div>
                <div className="cal-grid">
                    {days}
                </div>
            </div>

            <div style={{ marginTop: '30px' }}>
                <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                    {selectedDate 
                        ? `Tasks due on ${new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}` 
                        : 'Click a date to see tasks'}
                </h3>
                
                {selectedDate && selectedTasks.length === 0 && (
                    <p style={{ color: 'var(--text2)', fontStyle: 'italic' }}>No tasks on this date</p>
                )}

                {selectedDate && selectedTasks.length > 0 && (
                    <div className="dashboard-grid">
                        {selectedTasks.map((task, idx) => (
                            <div key={`${task.id}-${idx}`} className={`card ${task.status === 'Completed' ? 'completed' : ''}`}>
                                <h4 style={{ margin: '0 0 10px 0', color: task.isRecurringFuture ? '#9b59b6' : 'inherit' }}>
                                    {task.title}
                                </h4>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                    <span className={`badge ${task.priority.toLowerCase()}`}>{task.priority} Priority</span>
                                    <span className={`badge ${(task.category || 'general').toLowerCase()}`}>{task.category || 'General'}</span>
                                    {!task.isRecurringFuture && (
                                        <span className={`badge ${task.status === 'Completed' ? 'completed' : 'pending'}`}>{task.status}</span>
                                    )}
                                    {task.isRecurringFuture && (
                                        <span className="badge" style={{ background: '#f3e8ff', color: '#9b59b6' }}>🔁 Upcoming recurring task</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CalendarView;
