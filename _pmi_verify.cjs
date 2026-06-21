// Automated verification of PMI scenarios against the running API (http://localhost:3001)
const BASE = "http://localhost:3001";
const results = [];
const rec = (id, name, pass, detail) => { results.push({ id, name, pass, detail }); };

async function j(path, opts = {}) {
  const r = await fetch(BASE + path, opts);
  let body = null;
  try { body = await r.json(); } catch {}
  return { status: r.status, body, headers: r.headers };
}

(async () => {
  const ts = Date.now();
  const newEmail = `tester_${ts}@example.com`;
  const newUser = `tester_${ts}`;

  // --- Scenario 2: server up / root ---
  try { const h = await j("/api/health"); rec(2, "Запуск системы / health", h.status === 200 && h.body?.status === "ok", `health=${h.body?.status}, db=${h.body?.checks?.database}`); }
  catch (e) { rec(2, "Запуск системы", false, e.message); }

  // --- Scenario 5: email validation on register ---
  const badEmail = await j("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: newUser, email: "notanemail", password: "Password123" }) });
  rec(5, "Валидация email при регистрации", badEmail.status === 400 || badEmail.status === 422, `status=${badEmail.status}`);

  // --- Scenario 4: register new user ---
  const reg = await j("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: newUser, email: newEmail, password: "Password123" }) });
  const regOk = (reg.status === 200 || reg.status === 201) && (reg.body?.data?.token || reg.body?.data?.user);
  rec(4, "Регистрация нового пользователя", !!regOk, `status=${reg.status}, hasToken=${!!reg.body?.data?.token}`);

  // --- Scenario 6: duplicate email ---
  const dup = await j("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: newUser + "2", email: newEmail, password: "Password123" }) });
  rec(6, "Регистрация с существующим email", dup.status === 409 || dup.status === 400, `status=${dup.status}`);

  // --- Scenario 7: login correct (admin) ---
  const login = await j("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "admin@example.com", password: "admin123" }) });
  const token = login.body?.data?.token;
  rec(7, "Вход с верными данными (JWT)", login.status === 200 && !!token, `status=${login.status}, jwt=${token ? "выдан" : "нет"}`);

  // --- Scenario 8: login wrong ---
  const badLogin = await j("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "admin@example.com", password: "wrongpass" }) });
  rec(8, "Вход с неверными данными", badLogin.status === 401 || badLogin.status === 400, `status=${badLogin.status}`);

  // --- Scenario 57: JWT expiry 7d ---
  if (token) {
    try {
      const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
      const days = Math.round((payload.exp - payload.iat) / 86400);
      rec(57, "Срок действия токена (7 дней)", days === 7, `exp-iat=${days} дн.`);
    } catch (e) { rec(57, "Срок действия токена", false, e.message); }
  }

  // --- Scenario 56: protected endpoint without/with token (/api/auth/me) ---
  const noTok = await j("/api/auth/me");
  const withTok = await j("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
  rec(56, "JWT-защита эндпоинтов (/auth/me)", (noTok.status === 401) && (withTok.status === 200), `без токена=${noTok.status}, с токеном=${withTok.status}`);

  // --- Scenario 32: server-side trace (local simulate, no Piston) ---
  const tr = await j("/api/execute/trace", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ slug: "bubble-sort", input: [5, 2, 8, 1] }) });
  rec(32, "Серверная трассировка (simulate)", tr.status === 200 && tr.body?.data?.ok && Array.isArray(tr.body?.data?.trace) && tr.body.data.trace.length > 0, `status=${tr.status}, шагов=${tr.body?.data?.trace?.length}`);

  // --- Scenario 11/48: catalog list ---
  const algos = await j("/api/algorithms?limit=100");
  const list = algos.body?.data || [];
  const slugs = list.map(a => a.slug);
  const required = ["bubble-sort", "insertion-sort", "selection-sort", "binary-search"];
  const hasRequired = required.every(s => slugs.includes(s));
  rec(11, "Каталог: отображение алгоритмов", algos.status === 200 && hasRequired, `всего=${list.length}, обязательные 4 присутствуют=${hasRequired}, slugs=${slugs.join(",")}`);

  // --- Scenario 13: algorithm by slug ---
  const algo = await j("/api/algorithms/bubble-sort");
  rec(13, "Переход на страницу алгоритма (slug)", algo.status === 200 && !!algo.body?.data?.algorithm_id, `status=${algo.status}, name=${algo.body?.data?.name}`);

  // --- Scenario 14: theory first block ---
  const theory = algo.body?.data?.theory_materials || [];
  rec(14, "Отображение первого блока теории", theory.length > 0 && /введ/i.test(theory[0]?.title || ""), `блоков=${theory.length}, первый="${theory[0]?.title}"`);

  // --- Scenario 15: AI question generation by module ---
  if (theory[1]) {
    const t0 = Date.now();
    const gen = await j(`/api/theory/${theory[1].material_id}/generate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const q = gen.body?.data;
    const ok = gen.status === 200 && q?.question && Array.isArray(q?.options) && q.options.length >= 2 && !/недоступен/.test(q.question);
    rec(15, "Генерация ИИ-вопроса по блоку", ok, `модуль="${theory[1].title}", вопрос="${(q?.question||"").slice(0,60)}", ${Date.now()-t0}ms`);
  }

  // --- Scenario 19/22/23: test attempt + scoring ---
  const tests = algo.body?.data?.tests || [];
  if (tests[0]) {
    const testId = tests[0].test_id;
    const testDetail = await j(`/api/tests/${testId}`);
    const qs = testDetail.body?.data?.questions || [];
    rec(20, "Отображение вопросов теста", qs.length > 0, `вопросов=${qs.length}`);
    // submit answers (use correct option for single_choice where known)
    const answers = qs.map(qq => {
      const correct = (qq.options || []).find(o => o.is_correct);
      let answer_text = "";
      if (qq.question_type === "single_choice" && correct) answer_text = String(correct.option_id);
      else if (qq.question_type === "multiple_choice") answer_text = (qq.options||[]).filter(o=>o.is_correct).map(o=>o.option_id).join(",");
      else if (qq.question_type === "short_answer") answer_text = qq.correct_answer || "да";
      return { question_id: qq.question_id, answer_text };
    });
    const submit = await j(`/api/tests/${testId}/submit`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ answers }) });
    const res = submit.body?.data;
    rec(22, "Автоподсчёт баллов теста", submit.status === 200 && typeof res?.percent === "number", `status=${submit.status}, percent=${res?.percent}, passed=${res?.passed}`);
    rec(23, "Результаты теста и пояснения", !!(res?.review && res.review.length > 0), `пояснений=${res?.review?.length || 0}`);
  }

  // --- Scenario 31: Piston code execution (non-JS) ---
  try {
    const exec = await j("/api/execute/run", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ language: "python", code: "def bubble_sort(arr):\n    return sorted(arr)\nimport sys", input: [3,1,2] }) });
    rec(31, "Выполнение кода через Piston (Python)", exec.status === 200 || exec.status === 201, `status=${exec.status}, ok=${exec.body?.data?.passed ?? exec.body?.data?.output ?? "n/a"}`);
  } catch (e) { rec(31, "Выполнение кода через Piston", false, e.message); }

  // --- Scenario 39/40: dual AI analysis ---
  try {
    const t0 = Date.now();
    const dual = await j("/api/ai/analyze-dual", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ code: "function bubbleSort(a){return a.sort((x,y)=>x-y);}", algorithmName: "Сортировка пузырьком", language: "javascript" }) });
    const d = dual.body?.data;
    rec(39, "Двойной ИИ-анализ кода", dual.status === 200 && (d?.openai || d?.gigachat), `openai=${d?.openai ? "есть" : "нет"}, gigachat=${d?.gigachat ? "есть" : "нет"}, ${Date.now()-t0}ms`);
    rec(40, "Ответы OpenAI и GigaChat", !!d?.openai || !!d?.gigachat, `openai=${!!d?.openai}, gigachat=${!!d?.gigachat}`);
  } catch (e) { rec(39, "Двойной ИИ-анализ", false, e.message); }

  // --- Scenario 53: LRU cache (same AI request twice) ---
  try {
    const body = JSON.stringify({ prompt: "Объясни сортировку пузырьком одним предложением", type: "explain", context: { algorithm: "bubble-sort" }, provider: "auto" });
    const a1 = await j("/api/ai/ask", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body });
    const a2 = await j("/api/ai/ask", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body });
    rec(53, "Кэширование ИИ-запросов (LRU)", a2.body?.data?.cached === true, `второй ответ cached=${a2.body?.data?.cached}`);
  } catch (e) { rec(53, "Кэширование ИИ-запросов", false, e.message); }

  // --- Scenario 54: rate limiting on /api/ai ---
  try {
    let got429 = false;
    for (let i = 0; i < 30; i++) {
      const r = await fetch(BASE + "/api/ai/ask", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ prompt: "x" + i, type: "explain" }) });
      if (r.status === 429) { got429 = true; break; }
    }
    rec(54, "Rate limiting ИИ-эндпоинтов (429)", got429, got429 ? "получен 429 Too Many Requests" : "лимит не достигнут за 30 запросов");
  } catch (e) { rec(54, "Rate limiting", false, e.message); }

  // Output
  console.log("\n=== РЕЗУЛЬТАТЫ АВТОПРОВЕРКИ ПМИ ===\n");
  let pass = 0;
  for (const r of results.sort((a,b)=>a.id-b.id)) {
    console.log(`[${r.pass ? "PASS" : "FAIL"}] #${r.id} ${r.name} — ${r.detail}`);
    if (r.pass) pass++;
  }
  console.log(`\nИтого: ${pass}/${results.length} пройдено автоматически.`);
})().catch(e => { console.error("FATAL", e); process.exit(1); });
