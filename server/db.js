import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || resolve(__dirname, '../data/mindtodo.db');

// Ensure data directory exists
mkdirSync(dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ───────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    code           TEXT PRIMARY KEY,
    created_at     DATETIME DEFAULT (datetime('now')),
    last_accessed  DATETIME DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS nodes (
    id             TEXT PRIMARY KEY,
    session_code   TEXT NOT NULL,
    type           TEXT NOT NULL CHECK(type IN ('category', 'task')),
    parent_id      TEXT,
    title          TEXT NOT NULL DEFAULT 'Untitled',
    x              REAL NOT NULL DEFAULT 0,
    y              REAL NOT NULL DEFAULT 0,
    completed      INTEGER NOT NULL DEFAULT 0,
    created_at     DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (session_code) REFERENCES sessions(code) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES nodes(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_nodes_session ON nodes(session_code);
  CREATE INDEX IF NOT EXISTS idx_nodes_parent ON nodes(parent_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_last_accessed ON sessions(last_accessed);
`);

// ── Migration: add priority column if missing ────────────────────────
try {
  db.exec(`ALTER TABLE nodes ADD COLUMN priority TEXT DEFAULT NULL`);
} catch {
  // Column already exists, ignore
}

// ── Prepared Statements ──────────────────────────────────────────────

// Sessions
const stmts = {
  createSession: db.prepare(
    `INSERT INTO sessions (code) VALUES (?)`
  ),
  getSession: db.prepare(
    `SELECT * FROM sessions WHERE code = ?`
  ),
  touchSession: db.prepare(
    `UPDATE sessions SET last_accessed = datetime('now') WHERE code = ?`
  ),
  deleteExpiredSessions: db.prepare(
    `DELETE FROM sessions WHERE last_accessed < datetime('now', ?)`
  ),
  sessionExists: db.prepare(
    `SELECT 1 FROM sessions WHERE code = ?`
  ),

  // Nodes
  createNode: db.prepare(
    `INSERT INTO nodes (id, session_code, type, parent_id, title, x, y)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ),
  getNodesBySession: db.prepare(
    `SELECT * FROM nodes WHERE session_code = ? ORDER BY created_at ASC`
  ),
  updateNodePosition: db.prepare(
    `UPDATE nodes SET x = ?, y = ? WHERE id = ? AND session_code = ?`
  ),
  updateNodeTitle: db.prepare(
    `UPDATE nodes SET title = ? WHERE id = ? AND session_code = ?`
  ),
  toggleNodeCompleted: db.prepare(
    `UPDATE nodes SET completed = NOT completed WHERE id = ? AND session_code = ?`
  ),
  deleteNode: db.prepare(
    `DELETE FROM nodes WHERE id = ? AND session_code = ?`
  ),
  getNode: db.prepare(
    `SELECT * FROM nodes WHERE id = ? AND session_code = ?`
  ),
  getChildNodes: db.prepare(
    `SELECT * FROM nodes WHERE parent_id = ? AND session_code = ?`
  ),
  updateNodePriority: db.prepare(
    `UPDATE nodes SET priority = ? WHERE id = ? AND session_code = ?`
  ),
};

// ── Exported Functions ───────────────────────────────────────────────

export function createSession(code) {
  stmts.createSession.run(code);
  return { code };
}

export function getSession(code) {
  return stmts.getSession.get(code);
}

export function sessionExists(code) {
  return !!stmts.sessionExists.get(code);
}

export function touchSession(code) {
  stmts.touchSession.run(code);
}

export function deleteExpiredSessions(interval = '-2 days') {
  const info = stmts.deleteExpiredSessions.run(interval);
  return info.changes;
}

export function createNode({ id, sessionCode, type, parentId, title, x, y }) {
  stmts.createNode.run(id, sessionCode, type, parentId, title, x, y);
  return stmts.getNode.get(id, sessionCode);
}

export function getNodesBySession(sessionCode) {
  return stmts.getNodesBySession.all(sessionCode);
}

export function updateNodePosition({ id, sessionCode, x, y }) {
  stmts.updateNodePosition.run(x, y, id, sessionCode);
  return stmts.getNode.get(id, sessionCode);
}

export function updateNodeTitle({ id, sessionCode, title }) {
  stmts.updateNodeTitle.run(title, id, sessionCode);
  return stmts.getNode.get(id, sessionCode);
}

export function toggleNodeCompleted({ id, sessionCode }) {
  stmts.toggleNodeCompleted.run(id, sessionCode);
  return stmts.getNode.get(id, sessionCode);
}

export function deleteNode({ id, sessionCode }) {
  // Get children first so we can inform about cascade
  const children = stmts.getChildNodes.all(id, sessionCode);
  stmts.deleteNode.run(id, sessionCode);
  return { id, childrenDeleted: children.map(c => c.id) };
}

export function getNode({ id, sessionCode }) {
  return stmts.getNode.get(id, sessionCode);
}

export function updateNodePriority({ id, sessionCode, priority }) {
  // priority should be 'high', 'medium', 'low', or null
  stmts.updateNodePriority.run(priority, id, sessionCode);
  return stmts.getNode.get(id, sessionCode);
}

export default db;
