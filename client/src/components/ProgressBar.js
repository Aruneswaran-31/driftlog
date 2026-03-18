import React from 'react';

function ProgressBar({ tasks }) {
    if (tasks.length === 0) return null;

    const completed = tasks.filter(t => t.status === 'Completed').length;
    const percent = Math.round((completed / tasks.length) * 100);

    return (
        <div>
            <div style={{ fontWeight: 'bold' }}>Progress: {percent}%</div>
            <div className="progress-container">
                <div className="progress-fill" style={{ width: `${percent}%` }}></div>
            </div>
        </div>
    );
}

export default ProgressBar;
