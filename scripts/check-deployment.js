// Read-only check: never creates an account, session or patient record.
const healthOnly = process.argv.includes('--health-only');
const target = process.argv.slice(2).find(value => !value.startsWith('--'));

async function check() {
  const base = new URL(target || `http://127.0.0.1:${process.env.PORT || 3001}`);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password) {
    throw new Error('Faqat parolsiz HTTP/HTTPS sayt manzilini kiriting.');
  }
  const endpoints = healthOnly ? [['/api/health', 200]] : [['/api/health', 200], ['/api/me', 401]];
  for (const [path, expectedStatus] of endpoints) {
    let response;
    let body;
    try {
      response = await fetch(new URL(path, base), {signal: AbortSignal.timeout(8000), redirect: 'error'});
      if (!response.headers.get('content-type')?.includes('application/json')) {
        throw new Error(`${path}: JSON kelmadi. Domenni Node serverining portiga yo‘naltiring; Dockerfile bilan deploy qiling.`);
      }
      body = await response.json();
    } catch (error) {
      // Do not print response bodies, URLs with secrets, or server error details.
      if (error.message.startsWith(path + ':')) throw error;
      throw new Error(`${path}: API javobini o‘qib bo‘lmadi. Server, HTTPS va ulanishni tekshiring.`);
    }
    if (response.status !== expectedStatus || (path === '/api/health' && body?.ok !== true)) {
      throw new Error(`${path}: HTTP ${response.status}; kutilgan javob HTTP ${expectedStatus}. Server va baza ulanishini tekshiring.`);
    }
    if (path === '/api/me' && typeof body?.error !== 'string') {
      throw new Error('/api/me: kirish talab qiluvchi JSON javobi noto‘g‘ri.');
    }
    console.log(`OK ${path}: HTTP ${response.status}, JSON`);
  }
}

check().catch(error => {
  console.error(error instanceof TypeError ? 'Sayt manzili yoki ulanish noto‘g‘ri.' : error.message);
  process.exitCode = 1;
});
