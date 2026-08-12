const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

const serverPath = path.join(__dirname, 'server.js');

async function waitForServer(port) {
  for (let i = 0; i < 50; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/items`);
      if (res.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  throw new Error('El servidor no arrancó');
}

test('la API devuelve datos iniciales', async () => {
  const port = 3123;
  const child = spawn(process.execPath, [serverPath], {
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  try {
    await waitForServer(port);
    const res = await fetch(`http://127.0.0.1:${port}/api/items`);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(data));
    assert.ok(data.length >= 2);
    assert.ok(data.some((item) => item.referencia === 'CAMISA-1'));
  } finally {
    child.kill('SIGTERM');
  }
});
