import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDb } from '../../server/db.js';
import { buildApp } from '../../server/buildApp.js';

let db, app;
const SESSION = 'SESS01';

beforeEach(async () => {
  db = createDb(':memory:');
  db.createSession(SESSION);
  app = await buildApp({ db, serveStatic: false });
});

afterEach(async () => {
  await app.close();
  db.close();
});

describe('GET /api/nodes/:sessionCode', () => {
  it('returns empty array initially', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/nodes/${SESSION}` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ nodes: [] });
  });

  it('404 for unknown session', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/nodes/NOSESS' });
    expect(res.statusCode).toBe(404);
  });
});

describe('POST /api/nodes/:sessionCode', () => {
  it('creates a node with defaults', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/nodes/${SESSION}`,
      payload: {},
    });
    expect(res.statusCode).toBe(200);
    const { node } = res.json();
    expect(node.id).toBeTruthy();
    expect(node.type).toBe('category');
    expect(node.title).toBe('Untitled');
    expect(node.x).toBe(0);
    expect(node.y).toBe(0);
  });

  it('creates a task under a parent', async () => {
    const parentRes = await app.inject({
      method: 'POST',
      url: `/api/nodes/${SESSION}`,
      payload: { type: 'category', title: 'Cat' },
    });
    const parentId = parentRes.json().node.id;

    const res = await app.inject({
      method: 'POST',
      url: `/api/nodes/${SESSION}`,
      payload: { type: 'task', parentId, title: 'Do it', x: 5, y: 7 },
    });
    const { node } = res.json();
    expect(node.type).toBe('task');
    expect(node.parent_id).toBe(parentId);
    expect(node.title).toBe('Do it');
    expect(node.x).toBe(5);
    expect(node.y).toBe(7);
  });
});

describe('PATCH node endpoints', () => {
  let nodeId;
  beforeEach(async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/nodes/${SESSION}`,
      payload: { type: 'task', title: 'Test' },
    });
    nodeId = res.json().node.id;
  });

  it('updates position', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/nodes/${SESSION}/${nodeId}/position`,
      payload: { x: 99, y: 88 },
    });
    expect(res.json().node.x).toBe(99);
    expect(res.json().node.y).toBe(88);
  });

  it('updates title', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/nodes/${SESSION}/${nodeId}/title`,
      payload: { title: 'Renamed' },
    });
    expect(res.json().node.title).toBe('Renamed');
  });

  it('toggles completed', async () => {
    const r1 = await app.inject({
      method: 'PATCH',
      url: `/api/nodes/${SESSION}/${nodeId}/toggle`,
    });
    expect(r1.json().node.completed).toBe(1);
    const r2 = await app.inject({
      method: 'PATCH',
      url: `/api/nodes/${SESSION}/${nodeId}/toggle`,
    });
    expect(r2.json().node.completed).toBe(0);
  });

  it('sets valid priority', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/nodes/${SESSION}/${nodeId}/priority`,
      payload: { priority: 'high' },
    });
    expect(res.json().node.priority).toBe('high');
  });

  it('rejects invalid priority', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/nodes/${SESSION}/${nodeId}/priority`,
      payload: { priority: 'bogus' },
    });
    expect(res.json().error).toMatch(/Invalid priority/);
  });

  it('sets valid hex color', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/nodes/${SESSION}/${nodeId}/color`,
      payload: { color: '#fecaca' },
    });
    expect(res.json().node.color).toBe('#fecaca');
  });

  it('clears color with null', async () => {
    await app.inject({
      method: 'PATCH',
      url: `/api/nodes/${SESSION}/${nodeId}/color`,
      payload: { color: '#fecaca' },
    });
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/nodes/${SESSION}/${nodeId}/color`,
      payload: { color: null },
    });
    expect(res.json().node.color).toBeNull();
  });

  it('rejects invalid color', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/nodes/${SESSION}/${nodeId}/color`,
      payload: { color: 'red' },
    });
    expect(res.json().error).toMatch(/Invalid color/);
  });
});

describe('DELETE /api/nodes/:sessionCode/:nodeId', () => {
  it('deletes node and reports children', async () => {
    const p = await app.inject({
      method: 'POST',
      url: `/api/nodes/${SESSION}`,
      payload: { type: 'category', title: 'P' },
    });
    const parentId = p.json().node.id;

    const c = await app.inject({
      method: 'POST',
      url: `/api/nodes/${SESSION}`,
      payload: { type: 'task', parentId, title: 'C' },
    });
    const childId = c.json().node.id;

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/nodes/${SESSION}/${parentId}`,
    });
    const body = res.json();
    expect(body.id).toBe(parentId);
    expect(body.childrenDeleted).toEqual([childId]);
  });
});
