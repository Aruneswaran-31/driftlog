const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'driftlog.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'Medium',
    status TEXT DEFAULT 'Pending',
    due_date TEXT,
    email TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Safe migrations for new feature columns
try { db.exec("ALTER TABLE users ADD COLUMN avatar TEXT DEFAULT ''"); } catch(e) {}
try { db.exec("ALTER TABLE users ADD COLUMN bio TEXT DEFAULT ''"); } catch(e) {}
try { db.exec("ALTER TABLE tasks ADD COLUMN category TEXT DEFAULT 'General'"); } catch(e) {}
try { db.exec("ALTER TABLE tasks ADD COLUMN pinned INTEGER DEFAULT 0"); } catch(e) {}
try { db.exec("ALTER TABLE tasks ADD COLUMN recurring TEXT DEFAULT 'none'"); } catch(e) {}
try { db.exec("ALTER TABLE tasks ADD COLUMN subtasks TEXT DEFAULT '[]'"); } catch(e) {}
try { db.exec("ALTER TABLE tasks ADD COLUMN repeat_count INTEGER DEFAULT 1"); } catch(e) {}

module.exports = db;
