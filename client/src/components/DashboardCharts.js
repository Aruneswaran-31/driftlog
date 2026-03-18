import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

function DashboardCharts({ tasks }) {
    if (tasks.length === 0) return null;

    // Pie Chart Data
    const pending = tasks.filter(t => t.status !== 'Completed').length;
    const completed = tasks.filter(t => t.status === 'Completed').length;
    
    const pieData = {
        labels: ['Pending', 'Completed'],
        datasets: [{
            data: [pending, completed],
            backgroundColor: ['#f1c40f', '#2ecc71'],
            borderWidth: 0
        }]
    };

    // Bar Chart Data
    const low = tasks.filter(t => t.priority === 'Low').length;
    const medium = tasks.filter(t => t.priority === 'Medium').length;
    const high = tasks.filter(t => t.priority === 'High').length;

    const barData = {
        labels: ['Low', 'Medium', 'High'],
        datasets: [{
            label: 'Tasks by Priority',
            data: [low, medium, high],
            backgroundColor: ['#2ecc71', '#f39c12', '#e74c3c'],
            borderWidth: 0
        }]
    };

    const options = {
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: { color: 'inherit' }
            }
        },
        scales: {
             y: {
                 type: 'linear',
                 display: true,
                 position: 'left',
                 ticks: { color: 'inherit', stepSize: 1 }
             },
             x: {
                 ticks: { color: 'inherit' }
             }
         }
    };

    return (
        <div className="charts-container mb-20">
            <div className="card" style={{ height: '260px', marginBottom: 0 }}>
                <Pie data={pieData} options={{ maintainAspectRatio: false }} />
            </div>
            <div className="card" style={{ height: '260px', marginBottom: 0 }}>
                <Bar data={barData} options={options} />
            </div>
        </div>
    );
}

export default DashboardCharts;
