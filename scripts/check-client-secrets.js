import fs from 'node:fs';
import path from 'node:path';
import {parseEnv} from 'node:util';
import {fileURLToPath} from 'node:url';

const sensitiveName = /(?:SECRET|PASSWORD|PRIVATE_KEY|API_KEY|TOKEN|DATABASE_URL)/i;
const keyPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})/,
  /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{30,}/,
  /\bAKIA[A-Z0-9]{16}\b/,
  /(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s/'"]+:[^\s@'"]+@/i,
  /\bVITE_[A-Z0-9_]*(?:SECRET|PASSWORD|PRIVATE_KEY|API_KEY|TOKEN|DATABASE_URL)[A-Z0-9_]*/,
];

export function checkClientSecrets(root, {bundle = false, environment = process.env} = {}) {
  const failures = new Set();
  const secrets = new Set();
  function inspectEnvironment(values, source) {
    for (const [name, value] of Object.entries(values)) {
      if (!value || !sensitiveName.test(name)) continue;
      if (name.startsWith('VITE_')) failures.add(`${source}: ${name}`);
      if (value.length >= 8) secrets.add(value);
      if (name.includes('DATABASE_URL')) {
        try {
          const password = decodeURIComponent(new URL(value).password);
          if (password.length >= 8) secrets.add(password);
        } catch { /* A malformed URL is handled by backend configuration. */ }
      }
    }
  }
  inspectEnvironment(environment, 'environment');
  for (const filename of fs.readdirSync(root)) {
    if ((filename === '.env' || filename.startsWith('.env.')) && !filename.endsWith('.example')) {
      const absolute = path.join(root, filename);
      if (fs.statSync(absolute).isFile()) inspectEnvironment(parseEnv(fs.readFileSync(absolute, 'utf8')), filename);
    }
  }
  function inspect(file) {
    if (!fs.existsSync(file)) return;
    if (fs.lstatSync(file).isSymbolicLink()) return;
    if (fs.statSync(file).isDirectory()) {
      for (const name of fs.readdirSync(file)) inspect(path.join(file, name));
      return;
    }
    const content = fs.readFileSync(file, 'utf8');
    if (keyPatterns.some(pattern => pattern.test(content)) || [...secrets].some(secret => content.includes(secret))) {
      failures.add(path.relative(root, file));
    }
  }
  for (const directory of bundle ? ['dist'] : ['src', 'public', 'index.html']) inspect(path.join(root, directory));
  return [...failures];
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const failures = checkClientSecrets(process.cwd(), {bundle: process.argv.includes('--bundle')});
  if (failures.length) {
    // Report locations only. Never echo key values or source lines.
    console.error('Build to‘xtatildi: frontendda maxfiy qiymat bo‘lishi mumkin. Kalitlarni faqat backend muhitida saqlang.');
    for (const location of failures) console.error(`- ${location}`);
    process.exitCode = 1;
  } else {
    console.log('Frontend maxfiy qiymatlar tekshiruvidan o‘tdi.');
  }
}
