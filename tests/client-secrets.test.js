import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {checkClientSecrets} from '../scripts/check-client-secrets.js';

test('Frontend secret guard keeps backend secrets private and rejects client exposure', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nutq-secret-check-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  fs.mkdirSync(path.join(root, 'src'));
  fs.mkdirSync(path.join(root, 'dist'));
  const password = 'fixture-only-' + 'credential-123';
  fs.writeFileSync(path.join(root, '.env'), `DATABASE_URL=postgresql://fixture:${password}@localhost/test`);
  fs.writeFileSync(path.join(root, 'src', 'app.js'), 'fetch("/api/me")');
  assert.deepEqual(checkClientSecrets(root, {environment: {}}), []);
  assert.deepEqual(checkClientSecrets(root, {environment: {VITE_API_KEY: password}}), ['environment: VITE_API_KEY']);
  fs.writeFileSync(path.join(root, 'src', 'app.js'), `const leaked = "${password}";`);
  assert.deepEqual(checkClientSecrets(root, {environment: {}}), [path.join('src', 'app.js')]);
  fs.writeFileSync(path.join(root, 'src', 'app.js'), 'fetch("/api/me")');
  fs.writeFileSync(path.join(root, 'dist', 'app.js'), `const leaked = "${password}";`);
  assert.deepEqual(checkClientSecrets(root, {bundle: true, environment: {}}), [path.join('dist', 'app.js')]);
  fs.writeFileSync(path.join(root, 'dist', 'app.js'), 'fetch("/api/me")');
  assert.deepEqual(checkClientSecrets(root, {bundle: true, environment: {}}), []);
  fs.writeFileSync(path.join(root, '.env.production'), `VITE_PRIVATE_KEY=${password}`);
  const result = checkClientSecrets(root, {environment: {}});
  assert.deepEqual(result, ['.env.production: VITE_PRIVATE_KEY']);
  assert.ok(!JSON.stringify(result).includes(password));
});
