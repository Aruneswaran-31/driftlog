require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const app = express();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type", 
    "Authorization"
  ],
  credentials: false
}));
app.options("*", cors());
app.use(express.json({ limit: "10mb" }));

const JWT_SECRET = process.env.JWT_SECRET || "driftlog_secret_2024";

const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        bio TEXT DEFAULT '',
        avatar TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        priority TEXT DEFAULT 'Medium',
        status TEXT DEFAULT 'Pending',
        due_date TEXT DEFAULT '',
        category TEXT DEFAULT 'General',
        pinned INTEGER DEFAULT 0,
        recurring TEXT DEFAULT 'none',
        repeat_count INTEGER DEFAULT 1,
        subtasks TEXT DEFAULT '[]',
        email TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("Database initialized");
  } catch (err) {
    console.error("DB Init error:", err);
  }
};
initDB();

app.get("/api", (req, res) => {
  res.json({ status: "Driftlog API running" });
});

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ 
      status: "ok", 
      db: "connected",
      env: !!process.env.DATABASE_URL 
    });
  } catch(err) {
    res.status(500).json({ 
      status: "error", 
      message: err.message,
      env: !!process.env.DATABASE_URL
    });
  }
});

const auth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json("No token");
  const token = header.split(" ")[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json("Invalid token");
  }
};

// Auth routes
app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const existing = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) return res.status(400).json({ error: "Email already exists" });
    
    const hashed = await bcrypt.hash(password, 10);
    await pool.query("INSERT INTO users (name, email, password) VALUES ($1, $2, $3)", [name, email, hashed]);
    res.json({ message: "Registered successfully" });
  } catch (err) {
    console.error("Register DB error:", err.message);
    res.status(500).json({ 
      message: "Server error: " + err.message 
    });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0) return res.status(400).json({ error: "User not found" });
    
    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: "Invalid credentials" });
    
    const token = jwt.sign({ email: user.email, name: user.name }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { name: user.name, email: user.email, bio: user.bio, avatar: user.avatar } });
  } catch (err) {
    console.error("Login DB error:", err.message);
    res.status(500).json({ 
      message: "Server error: " + err.message 
    });
  }
});

app.get("/api/auth/profile", auth, async (req, res) => {
  try {
    const result = await pool.query("SELECT id, name, email, bio, avatar FROM users WHERE email = $1", [req.user.email]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/api/auth/profile", auth, async (req, res) => {
  const { name, bio, avatar } = req.body;
  try {
    await pool.query("UPDATE users SET name=$1, bio=$2, avatar=$3 WHERE email=$4", [name, bio, avatar, req.user.email]);
    const result = await pool.query("SELECT id, name, email, bio, avatar FROM users WHERE email = $1", [req.user.email]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/api/auth/change-password", auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const result = await pool.query("SELECT password FROM users WHERE email=$1", [req.user.email]);
    if (result.rows.length === 0) return res.status(400).json({ error: "User not found" });
    
    const match = await bcrypt.compare(currentPassword, result.rows[0].password);
    if (!match) return res.status(400).json({ error: "Current password wrong" });
    
    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password=$1 WHERE email=$2", [hashed, req.user.email]);
    res.json({ message: "Password changed" });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Tasks routes
app.get("/api/tasks", auth, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM tasks WHERE email=$1 ORDER BY pinned DESC, created_at DESC", [req.user.email]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/tasks", auth, async (req, res) => {
  const { title, description, priority, status, due_date, category, pinned, recurring, repeat_count, subtasks } = req.body;
  
  try {
    const result = await pool.query(`
      INSERT INTO tasks (title, description, priority, status, due_date, category, pinned, recurring, repeat_count, subtasks, email)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *
    `, [
      title, description || '', priority || 'Medium', status || 'Pending', due_date || '', category || 'General',
      pinned ? 1 : 0, recurring || 'none', repeat_count !== undefined ? repeat_count : 1, 
      subtasks ? (typeof subtasks === 'string' ? subtasks : JSON.stringify(subtasks)) : '[]', 
      req.user.email
    ]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/api/tasks/:id", auth, async (req, res) => {
  const { id } = req.params;
  const { title, description, priority, status, due_date, category, pinned, recurring, repeat_count, subtasks } = req.body;
  
  try {
    const result = await pool.query(`
      UPDATE tasks SET title=COALESCE($1, title), description=COALESCE($2, description), priority=COALESCE($3, priority),
      status=COALESCE($4, status), due_date=COALESCE($5, due_date), category=COALESCE($6, category),
      pinned=COALESCE($7, pinned), recurring=COALESCE($8, recurring), repeat_count=COALESCE($9, repeat_count),
      subtasks=COALESCE($10, subtasks)
      WHERE id=$11 AND email=$12 RETURNING *
    `, [
      title, description, priority, status, due_date, category, pinned ? 1 : 0, recurring, repeat_count,
      subtasks ? (typeof subtasks === 'string' ? subtasks : JSON.stringify(subtasks)) : null,
      id, req.user.email
    ]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/api/tasks/:id", auth, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM tasks WHERE id=$1 AND email=$2", [id, req.user.email]);
    res.json({ message: "Deleted" });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/tasks/process-recurring", auth, async (req, res) => {
  try {
    const { rows: completedRecurring } = await pool.query(
      "SELECT * FROM tasks WHERE email = $1 AND status = 'Completed' AND recurring != 'none'",
      [req.user.email]
    );

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

        if (nextDue <= today) {
            const nextDueStr = nextDue.toISOString().split('T')[0];
            const { rows: exists } = await pool.query(
                "SELECT id FROM tasks WHERE email = $1 AND title = $2 AND due_date = $3 AND status != 'Completed'",
                [req.user.email, task.title, nextDueStr]
            );

            if (exists.length === 0) {
                let freshSubtasks = '[]';
                try {
                    const parsed = JSON.parse(task.subtasks || '[]');
                    freshSubtasks = JSON.stringify(parsed.map(s => ({...s, done: false})));
                } catch(e) {}

                await pool.query(`
                    INSERT INTO tasks (title, description, priority, status, due_date, email, category, pinned, recurring, repeat_count, subtasks)
                    VALUES ($1, $2, $3, 'Pending', $4, $5, $6, $7, $8, $9, $10)
                `, [
                    task.title, task.description, task.priority, nextDueStr, req.user.email,
                    task.category, task.pinned, task.recurring, task.repeat_count, freshSubtasks
                ]);
                createdCount++;
            }
        }
    }
    
    res.json({ count: createdCount });
  } catch (error) {
    res.status(500).json({ error: 'Error processing recurring tasks' });
  }
});

module.exports = app;
