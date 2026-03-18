const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/', (req, res) => {
    try {
        const tasks = db.prepare('SELECT * FROM tasks WHERE email = ? ORDER BY created_at DESC').all(req.user.email);
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching tasks' });
    }
});

router.post('/', (req, res) => {
    const { title, description, priority, status, due_date, category, pinned, recurring, subtasks, repeat_count } = req.body;
    
    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }

    try {
        const stmt = db.prepare(`
            INSERT INTO tasks (title, description, priority, status, due_date, email, category, pinned, recurring, subtasks, repeat_count)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const info = stmt.run(
            title, 
            description || '', 
            priority || 'Medium', 
            status || 'Pending', 
            due_date || null, 
            req.user.email,
            category || 'General',
            pinned ? 1 : 0,
            recurring || 'none',
            subtasks ? (typeof subtasks === 'string' ? subtasks : JSON.stringify(subtasks)) : '[]',
            repeat_count !== undefined ? repeat_count : 1
        );
        
        const newTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(info.lastInsertRowid);
        res.status(201).json(newTask);
    } catch (error) {
        res.status(500).json({ error: 'Error creating task' });
    }
});

router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { title, description, priority, status, due_date, category, pinned, recurring, subtasks, repeat_count } = req.body;

    try {
        const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND email = ?').get(id, req.user.email);
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        const stmt = db.prepare(`
            UPDATE tasks 
            SET title = COALESCE(?, title),
                description = COALESCE(?, description),
                priority = COALESCE(?, priority),
                status = COALESCE(?, status),
                due_date = COALESCE(?, due_date),
                category = COALESCE(?, category),
                pinned = COALESCE(?, pinned),
                recurring = COALESCE(?, recurring),
                subtasks = COALESCE(?, subtasks),
                repeat_count = COALESCE(?, repeat_count)
            WHERE id = ? AND email = ?
        `);
        
        const parsedSubtasks = subtasks !== undefined ? (typeof subtasks === 'string' ? subtasks : JSON.stringify(subtasks)) : null;

        stmt.run(
            title !== undefined ? title : null, 
            description !== undefined ? description : null, 
            priority !== undefined ? priority : null, 
            status !== undefined ? status : null, 
            due_date !== undefined ? due_date : null, 
            category !== undefined ? category : null, 
            pinned !== undefined ? (pinned ? 1 : 0) : null, 
            recurring !== undefined ? recurring : null, 
            parsedSubtasks, 
            repeat_count !== undefined ? repeat_count : null,
            id, 
            req.user.email
        );
        
        const updatedTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
        res.json(updatedTask);
    } catch (error) {
        res.status(500).json({ error: 'Error updating task' });
    }
});

router.delete('/:id', (req, res) => {
    const { id } = req.params;

    try {
        const info = db.prepare('DELETE FROM tasks WHERE id = ? AND email = ?').run(id, req.user.email);
        if (info.changes === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting task' });
    }
});

router.post('/process-recurring', (req, res) => {
    try {
        const completedRecurring = db.prepare(
            "SELECT * FROM tasks WHERE email = ? AND status = 'Completed' AND recurring != 'none'"
        ).all(req.user.email);

        let createdCount = 0;
        const today = new Date();
        today.setHours(0,0,0,0);

        for (const task of completedRecurring) {
            if (!task.due_date) continue;
            
            const lastDue = new Date(task.due_date);
            let nextDue = new Date(lastDue);
            
            if (task.recurring === 'daily') {
                nextDue.setDate(nextDue.getDate() + 1);
            } else if (task.recurring === 'weekly') {
                nextDue.setDate(nextDue.getDate() + 7);
            } else if (task.recurring === 'monthly') {
                nextDue.setMonth(nextDue.getMonth() + 1);
            }

            // Only generate new if it should be queued now (or if we just want to create the next future instance)
            // The instructions say: "If next due date <= today, create a new task"
            // Actually it's better to just check if there's no existing uncompleted duplicate
            // We'll follow instructions: "If next due date <= today, create a new task"
            if (nextDue <= today) {
                // Check if we already created it to avoid infinite loops if clicked multiple times
                const nextDueStr = nextDue.toISOString().split('T')[0];
                const exists = db.prepare(
                    "SELECT id FROM tasks WHERE email = ? AND title = ? AND due_date = ? AND status != 'Completed'"
                ).get(req.user.email, task.title, nextDueStr);

                if (!exists) {
                    const insertStmt = db.prepare(`
                        INSERT INTO tasks (title, description, priority, status, due_date, email, category, pinned, recurring, subtasks)
                        VALUES (?, ?, ?, 'Pending', ?, ?, ?, ?, ?, ?)
                    `);
                    
                    // Reset subtasks to all 'done: false'
                    let freshSubtasks = '[]';
                    try {
                        const parsed = JSON.parse(task.subtasks || '[]');
                        freshSubtasks = JSON.stringify(parsed.map(s => ({...s, done: false})));
                    } catch(e) {}

                    insertStmt.run(
                        task.title, task.description, task.priority, nextDueStr, req.user.email,
                        task.category, task.pinned, task.recurring, freshSubtasks
                    );
                    createdCount++;
                }
            }
        }
        
        res.json({ count: createdCount });
    } catch (error) {
        console.error("Recurring error:", error);
        res.status(500).json({ error: 'Error processing recurring tasks' });
    }
});

module.exports = router;
