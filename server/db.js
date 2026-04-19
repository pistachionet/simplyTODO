import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_DB_PATH =
  process.env.DB_PATH || resolve(__dirname, '../data/simplytodo.db');

/**
 * Create a database instance bound to the given path.
 * Pass ':memory:' for an in-memory DB (useful for tests).
 *
 * Returns an object containing the raw `db` handle plus all
 * CRUD helper functions. Each instance has its own prepared
 * statements, so multiple instances don't share state.
 */
export function createDb(dbPath = DEFAULT_DB_PATH) {
  // Ensure data directory exists (skip for in-memory / anonymous)
  if (dbPath !== ':memory:' && dbPath !== '') {
    mkdirSync(dirname(dbPath), { recursive: true });
  }

  const db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // ── Schema ─────────────────────────────────────────────────────────
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

  // ── Migration: add priority column if missing ───────────────────────
  try {
    db.exec(`ALTER TABLE nodes ADD COLUMN priority TEXT DEFAULT NULL`);
  } catch {
    // Column already exists, ignore
  }

  // ── Prepared Statements ────────────────────────────────────────────
  const stmts = {
    createSession: db.prepare(`INSERT INTO sessions (code) VALUES (?)`),
    getSession: db.prepare(`SELECT * FROM sessions WHERE code = ?`),
    touchSession: db.prepare(
      `UPDATE sessions SET last_accessed = datetime('now') WHERE code = ?`
    ),
    deleteExpiredSessions: db.prepare(
      `DELETE FROM sessions WHERE last_accessed < datetime('now', ?)`
    ),
    sessionExists: db.prepare(`SELECT 1 FROM sessions WHERE code = ?`),

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

  // ── API ────────────────────────────────────────────────────────────
  function createSession(code) {
    stmts.createSession.run(code);
    return { code };
  }

  function getSession(code) {
    return stmts.getSession.get(code);
  }

  function sessionExists(code) {
    return !!stmts.sessionExists.get(code);
  }

  function touchSession(code) {
    stmts.touchSession.run(code);
  }

  function deleteExpiredSessions(interval = '-2 days') {
    const info = stmts.deleteExpiredSessions.run(interval);
    return info.changes;
  }

  function createNode({ id, sessionCode, type, parentId, title, x, y }) {
    stmts.createNode.run(id, sessionCode, type, parentId, title, x, y);
    return stmts.getNode.get(id, sessionCode);
  }

  function getNodesBySession(sessionCode) {
    return stmts.getNodesBySession.all(sessionCode);
  }

  function updateNodePosition({ id, sessionCode, x, y }) {
    stmts.updateNodePosition.run(x, y, id, sessionCode);
    return stmts.getNode.get(id, sessionCode);
  }

  function updateNodeTitle({ id, sessionCode, title }) {
    stmts.updateNodeTitle.run(title, id, sessionCode);
    return stmts.getNode.get(id, sessionCode);
  }

  function toggleNodeCompleted({ id, sessionCode }) {
    stmts.toggleNodeCompleted.run(id, sessionCode);
    return stmts.getNode.get(id, sessionCode);
  }

  function deleteNode({ id, sessionCode }) {
    const children = stmts.getChildNodes.all(id, sessionCode);
    stmts.deleteNode.run(id, sessionCode);
    return { id, childrenDeleted: children.map((c) => c.id) };
  }

  function getNode({ id, sessionCode }) {
    return stmts.getNode.get(id, sessionCode);
  }

  function updateNodePriority({ id, sessionCode, priority }) {
    stmts.updateNodePriority.run(priority, id, sessionCode);
    return stmts.getNode.get(id, sessionCode);
  }

  function close() {
    db.close();
  }

  return {
    db,
    createSession,
    getSession,
    sessionExists,
    touchSession,
    deleteExpiredSessions,
    createNode,
    getNodesBySession,
    updateNodePosition,
    updateNodeTitle,
    toggleNodeCompleted,
    deleteNode,
    getNode,
    updateNodePriority,
    close,
  };
}
