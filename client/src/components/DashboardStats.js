import React from 'react';

function DashboardStats({ tasks }) {
    const total = tasks.length;
    const pending = tasks.filter(t => t.status !== 'Completed').length;
    const completed = tasks.filter(t => t.status === 'Completed').length;

    return (
        <div className="stats-grid">
            <div className="stat-card">
                <div>Total Tasks</div>
                <h3>{total}</h3>
            </div>
            <div className="stat-card pending">
                <div>Pending</div>
                <h3>{pending}</h3>
            </div>
            <div className="stat-card completed">
                <div>Completed</div>
                <h3>{completed}</h3>
            </div>
        </div>
    );
}

export default DashboardStats;
