import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDb } from '../../server/db.js';
import { buildApp } from '../../server/buildApp.js';

let db, app;

beforeEach(async () => {
  db = createDb(':memory:');
  app = await buildApp({ db, serveStatic: false });
});

afterEach(async () => {
  await app.close();
  db.close();
});

describe('POST /api/session/create', () => {
  it('creates a session with a 6-char code', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/session/create' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.code).toMatch(/^[A-Z2-9]{6}$/);
    expect(db.sessionExists(body.code)).toBe(true);
  });

  it('returns distinct codes on repeated calls', async () => {
    const codes = new Set();
    for (let i = 0; i < 5; i++) {
      const res = await app.inject({ method: 'POST', url: '/api/session/create' });
      codes.add(res.json().code);
    }
    expect(codes.size).toBe(5);
  });
});

describe('POST /api/session/join', () => {
  it('400 on missing code', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/session/join',
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });

  it('400 on wrong-length code', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/session/join',
      payload: { code: 'SHORT' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('404 on non-existent code', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/session/join',
      payload: { code: 'ZZZZZZ' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('joins an existing session and returns nodes', async () => {
    db.createSession('JOIN01');
    db.createNode({
      id: 'n1',
      sessionCode: 'JOIN01',
      type: 'category',
      parentId: null,
      title: 'Hello',
      x: 0,
      y: 0,
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/session/join',
      payload: { code: 'JOIN01' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.code).toBe('JOIN01');
    expect(body.nodes).toHaveLength(1);
    expect(body.nodes[0].title).toBe('Hello');
  });

  it('uppercases the code before lookup', async () => {
    db.createSession('UPPER1');
    const res = await app.inject({
      method: 'POST',
      url: '/api/session/join',
      payload: { code: 'upper1' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().code).toBe('UPPER1');
  });
});
