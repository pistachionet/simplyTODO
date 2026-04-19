import { describe, it, expect, beforeEach } from 'vitest';
import { createDb } from '../../server/db.js';

let db;
beforeEach(() => {
  db = createDb(':memory:');
});

describe('sessions', () => {
  it('creates a session', () => {
    const result = db.createSession('ABC123');
    expect(result).toEqual({ code: 'ABC123' });
    expect(db.sessionExists('ABC123')).toBe(true);
  });

  it('sessionExists returns false for unknown code', () => {
    expect(db.sessionExists('NOPE00')).toBe(false);
  });

  it('getSession returns row', () => {
    db.createSession('ABC123');
    const s = db.getSession('ABC123');
    expect(s.code).toBe('ABC123');
    expect(s.created_at).toBeTruthy();
    expect(s.last_accessed).toBeTruthy();
  });

  it('touchSession updates last_accessed', async () => {
    db.createSession('ABC123');
    const before = db.getSession('ABC123').last_accessed;
    // Sleep 1.1s — SQLite datetime() has second precision
    await new Promise((r) => setTimeout(r, 1100));
    db.touchSession('ABC123');
    const after = db.getSession('ABC123').last_accessed;
    expect(after >= before).toBe(true);
  });

  it('deleteExpiredSessions removes old sessions', () => {
    db.createSession('OLD111');
    db.createSession('NEW222');
    // Force OLD111 to be far in the past
    db.db.prepare(
      `UPDATE sessions SET last_accessed = datetime('now', '-10 days') WHERE code = ?`
    ).run('OLD111');

    const deleted = db.deleteExpiredSessions('-2 days');
    expect(deleted).toBe(1);
    expect(db.sessionExists('OLD111')).toBe(false);
    expect(db.sessionExists('NEW222')).toBe(true);
  });

  it('rejects duplicate session codes', () => {
    db.createSession('ABC123');
    expect(() => db.createSession('ABC123')).toThrow();
  });
});

describe('nodes', () => {
  beforeEach(() => {
    db.createSession('SESS01');
  });

  it('creates and retrieves a node', () => {
    const node = db.createNode({
      id: 'n1',
      sessionCode: 'SESS01',
      type: 'category',
      parentId: null,
      title: 'Work',
      x: 10,
      y: 20,
    });
    expect(node.id).toBe('n1');
    expect(node.title).toBe('Work');
    expect(node.type).toBe('category');
    expect(node.x).toBe(10);
    expect(node.y).toBe(20);
    expect(node.completed).toBe(0);
    expect(node.priority).toBeNull();
  });

  it('getNodesBySession returns nodes in creation order', () => {
    db.createNode({ id: 'a', sessionCode: 'SESS01', type: 'category', parentId: null, title: 'A', x: 0, y: 0 });
    db.createNode({ id: 'b', sessionCode: 'SESS01', type: 'task', parentId: 'a', title: 'B', x: 0, y: 0 });
    const nodes = db.getNodesBySession('SESS01');
    expect(nodes.map((n) => n.id)).toEqual(['a', 'b']);
  });

  it('updateNodePosition moves the node', () => {
    db.createNode({ id: 'n1', sessionCode: 'SESS01', type: 'category', parentId: null, title: 'X', x: 0, y: 0 });
    const updated = db.updateNodePosition({ id: 'n1', sessionCode: 'SESS01', x: 100, y: 200 });
    expect(updated.x).toBe(100);
    expect(updated.y).toBe(200);
  });

  it('updateNodeTitle changes title', () => {
    db.createNode({ id: 'n1', sessionCode: 'SESS01', type: 'task', parentId: null, title: 'Old', x: 0, y: 0 });
    const updated = db.updateNodeTitle({ id: 'n1', sessionCode: 'SESS01', title: 'New' });
    expect(updated.title).toBe('New');
  });

  it('toggleNodeCompleted flips state', () => {
    db.createNode({ id: 'n1', sessionCode: 'SESS01', type: 'task', parentId: null, title: 'T', x: 0, y: 0 });
    let n = db.toggleNodeCompleted({ id: 'n1', sessionCode: 'SESS01' });
    expect(n.completed).toBe(1);
    n = db.toggleNodeCompleted({ id: 'n1', sessionCode: 'SESS01' });
    expect(n.completed).toBe(0);
  });

  it('updateNodePriority sets and clears priority', () => {
    db.createNode({ id: 'n1', sessionCode: 'SESS01', type: 'task', parentId: null, title: 'T', x: 0, y: 0 });
    let n = db.updateNodePriority({ id: 'n1', sessionCode: 'SESS01', priority: 'high' });
    expect(n.priority).toBe('high');
    n = db.updateNodePriority({ id: 'n1', sessionCode: 'SESS01', priority: null });
    expect(n.priority).toBeNull();
  });

  it('deleteNode removes node and reports cascaded children', () => {
    db.createNode({ id: 'parent', sessionCode: 'SESS01', type: 'category', parentId: null, title: 'P', x: 0, y: 0 });
    db.createNode({ id: 'c1', sessionCode: 'SESS01', type: 'task', parentId: 'parent', title: 'C1', x: 0, y: 0 });
    db.createNode({ id: 'c2', sessionCode: 'SESS01', type: 'task', parentId: 'parent', title: 'C2', x: 0, y: 0 });

    const result = db.deleteNode({ id: 'parent', sessionCode: 'SESS01' });
    expect(result.id).toBe('parent');
    expect(result.childrenDeleted.sort()).toEqual(['c1', 'c2']);
    // Children should also be gone due to FK cascade
    expect(db.getNode({ id: 'c1', sessionCode: 'SESS01' })).toBeUndefined();
    expect(db.getNode({ id: 'c2', sessionCode: 'SESS01' })).toBeUndefined();
  });

  it('deleting a session cascades to its nodes', () => {
    db.createNode({ id: 'n1', sessionCode: 'SESS01', type: 'category', parentId: null, title: 'X', x: 0, y: 0 });
    db.db.prepare(`DELETE FROM sessions WHERE code = ?`).run('SESS01');
    expect(db.getNodesBySession('SESS01')).toEqual([]);
  });

  it('cannot create node with invalid type', () => {
    expect(() =>
      db.createNode({ id: 'x', sessionCode: 'SESS01', type: 'bogus', parentId: null, title: 'X', x: 0, y: 0 })
    ).toThrow();
  });
});

describe('isolation between instances', () => {
  it('two in-memory DBs do not share state', () => {
    const a = createDb(':memory:');
    const b = createDb(':memory:');
    a.createSession('AAAAAA');
    expect(a.sessionExists('AAAAAA')).toBe(true);
    expect(b.sessionExists('AAAAAA')).toBe(false);
    a.close();
    b.close();
  });
});
