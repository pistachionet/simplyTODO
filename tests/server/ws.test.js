import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebSocket } from 'ws';
import { createDb } from '../../server/db.js';
import { buildApp } from '../../server/buildApp.js';
import { _resetRooms } from '../../server/ws.js';

let db, app, baseUrl;
const SESSION = 'WSROOM';

beforeEach(async () => {
  _resetRooms();
  db = createDb(':memory:');
  db.createSession(SESSION);
  app = await buildApp({ db, serveStatic: false });
  // Listen on a random port
  await app.listen({ port: 0, host: '127.0.0.1' });
  const { port } = app.server.address();
  baseUrl = `ws://127.0.0.1:${port}`;
});

afterEach(async () => {
  await app.close();
  db.close();
});

/** Open a WS and wait until it's OPEN (or rejects on close/error). */
function openWs(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.once('open', () => resolve(ws));
    ws.once('error', () => {
      // Swallow — close event carries the status we want to inspect
    });
    ws.once('close', (code, reason) => {
      const err = new Error(`closed ${code} ${reason?.toString() || ''}`);
      err.code = code;
      reject(err);
    });
  });
}

/** Wait for the next parsed JSON message on a socket. */
function nextMessage(ws) {
  return new Promise((resolve, reject) => {
    ws.once('message', (data) => {
      try {
        resolve(JSON.parse(data.toString()));
      } catch (e) {
        reject(e);
      }
    });
    ws.once('error', reject);
  });
}

describe('WebSocket /ws/:sessionCode', () => {
  it('rejects unknown session with close code 4004', async () => {
    const ws = new WebSocket(`${baseUrl}/ws/UNKNOWN`);
    ws.on('error', () => {}); // swallow
    const closeCode = await new Promise((resolve) => {
      ws.once('close', (code) => resolve(code));
    });
    expect(closeCode).toBe(4004);
  });

  it('broadcasts node:created to all clients in the room', async () => {
    const a = await openWs(`${baseUrl}/ws/${SESSION}`);
    const b = await openWs(`${baseUrl}/ws/${SESSION}`);

    const aMsg = nextMessage(a);
    const bMsg = nextMessage(b);

    a.send(
      JSON.stringify({
        type: 'node:create',
        nodeType: 'category',
        title: 'Shared',
        x: 1,
        y: 2,
      })
    );

    const [msgA, msgB] = await Promise.all([aMsg, bMsg]);
    expect(msgA.type).toBe('node:created');
    expect(msgB.type).toBe('node:created');
    expect(msgA.node.title).toBe('Shared');
    expect(msgB.node.title).toBe('Shared');
    expect(msgA.node.id).toBe(msgB.node.id);

    // Also persisted
    expect(db.getNodesBySession(SESSION)).toHaveLength(1);

    a.close();
    b.close();
  });

  it('responds to node:move with node:moved', async () => {
    // Seed a node
    db.createNode({
      id: 'seed',
      sessionCode: SESSION,
      type: 'category',
      parentId: null,
      title: 'Seed',
      x: 0,
      y: 0,
    });

    const ws = await openWs(`${baseUrl}/ws/${SESSION}`);
    const msgP = nextMessage(ws);
    ws.send(JSON.stringify({ type: 'node:move', id: 'seed', x: 50, y: 60 }));
    const msg = await msgP;
    expect(msg.type).toBe('node:moved');
    expect(msg.node.x).toBe(50);
    expect(msg.node.y).toBe(60);
    ws.close();
  });

  it('returns error for invalid JSON', async () => {
    const ws = await openWs(`${baseUrl}/ws/${SESSION}`);
    const msgP = nextMessage(ws);
    ws.send('not json');
    const msg = await msgP;
    expect(msg.error).toBe('Invalid JSON');
    ws.close();
  });

  it('returns error for unknown message type', async () => {
    const ws = await openWs(`${baseUrl}/ws/${SESSION}`);
    const msgP = nextMessage(ws);
    ws.send(JSON.stringify({ type: 'nope' }));
    const msg = await msgP;
    expect(msg.error).toMatch(/Unknown message type/);
    ws.close();
  });

  it('broadcasts node:colorChanged on node:color', async () => {
    db.createNode({
      id: 'seed',
      sessionCode: SESSION,
      type: 'task',
      parentId: null,
      title: 'Seed',
      x: 0,
      y: 0,
    });

    const ws = await openWs(`${baseUrl}/ws/${SESSION}`);
    const msgP = nextMessage(ws);
    ws.send(JSON.stringify({ type: 'node:color', id: 'seed', color: '#fecaca' }));
    const msg = await msgP;
    expect(msg.type).toBe('node:colorChanged');
    expect(msg.node.color).toBe('#fecaca');
    ws.close();
  });
});
