# ПЛАН РАБОТЫ: «Электронный учебник "Алгоритмы и структуры данных"» (v2)

**Студент:** Абдулатипова А.З. (ИСПк-402-52-00)  
**Дедлайн:** 20.06.2026 (сдача), защита ~20–25.06  
**Доступно:** 14 дней (план рассчитан на 29 → сжат с параллелизацией)  
**Конвенция:** ⛔ — задача имеет `blockedBy`, → — параллельно

---

## ФАЗА 0 — Критические правки диплома (06.06–08.06, 3 дня, → с кодом)

> **⚠️ Делает студент самостоятельно** (не блокирует код)

- [x] **0.1**–**0.15** (вне scope данного запуска)

---

## ФАЗА 1 — Инфраструктура + БД (07.06–08.06, 2 дня)

```
algorithms-textbook/
├── server/        # Node 20 + Express 4 + TS
├── client/        # Vite 5 + React 18 + TS
├── docker-compose.yml
├── .github/workflows/ci.yml
└── README.md
```

- [x] **1.1** Инициализировать монорепо (2 папки + docker-compose)
- [x] **1.2** `prisma/schema.prisma` — все 12 моделей + **индексы `@@index([user_id])` в `UserProgress`, `TestAttempt`, `UserSolution`, `AIFeedback`; `@@index([algorithm_id])` в `TheoryMaterial`, `Test`, `Task`**
- [x] **1.3** Сиды: 4 алгоритма + 6 блоков теории + 5–10 вопросов + 3 задачи + admin (логин admin / пароль admin123)
- [x] **1.4** `docker-compose.yml` с healthcheck для `db` и `depends_on: { db: { condition: service_healthy } }` на `server`
- [ ] **1.5** Получить API-ключи (OpenAI, GigaChat) — *ожидает пользователь*
- [x] **1.6** `server/.env.example` со всеми переменными: `DATABASE_URL`, `JWT_SECRET` (openssl rand -hex 32), `JWT_EXPIRES_IN=7d`, `OPENAI_API_KEY`, `OPENAI_MODEL=gpt-4o-mini`, `GIGACHAT_CLIENT_ID`, `GIGACHAT_CLIENT_SECRET`, `GIGACHAT_SCOPE=GIGACHAT_API_PERS`, `RATE_LIMIT_WINDOW_MS=900000`, `RATE_LIMIT_MAX=100`, `AI_RATE_LIMIT_MAX=20`, `LOG_LEVEL=info`, `CLIENT_URL`
- [x] **1.7** Корневой `README.md` (RU): системные требования, `docker-compose up`, URL'ы (server:3001, client:80, swagger:/api/docs), seed-credentials, тестовый сценарий
- [x] **1.8** `.github/workflows/ci.yml` — 5 job'ов: lint+tsc → vitest с coverage gate ≥70% → build клиент+сервер → playwright в Docker → ssh-deploy на VPS

---

## ФАЗА 2 — Backend (08.06–12.06, 5 дней)

- [x] **2.1** Express каркас + TypeScript + Zod + Winston
- [x] **2.2** ⛔ **2.1** Auth middleware (JWT + bcrypt, роли student/teacher/admin, expired-token handling)
- [x] **2.3** Rate limit middleware (100/15мин IP, 20/мин на `/api/ai/*`)
- [x] **2.4** Error handler middleware + **graceful shutdown: `SIGTERM` → `server.close()` → `prisma.$disconnect()` → `process.exit(0)`, таймаут 10с**
- [x] **2.5** `helmet()` + `cors({ origin: env.CLIENT_URL, credentials: true })` в `src/index.ts` ДО роутов (нужны для COOP/COEP → SharedArrayBuffer в Web Worker)
- [x] **2.6** `GET /api/health` (200 + версия + статус Prisma через `$queryRaw`)
- [x] **2.7** ⛔ **2.5** 8 CRUD endpoints с Zod-валидацией: `GET /api/algorithms?category=&difficulty=&completed=&page=&limit=`, `GET /api/algorithms/:id` (с join теории), `GET /api/algorithms/:id/tests`, `POST /api/tests/:id/attempt`, `POST /api/tests/attempt/:id/submit`, `POST /api/solutions`, `GET /api/progress`. Repository pattern в `server/src/repositories/`. Обёртка ответов `{ data, meta? }`
- [x] **2.8** ⛔ **2.2** ⛔ **2.7** `server/src/ai/`: `interfaces/IAIProvider.ts` (типы `AIPrompt`, `AIResponse`, `QuizQuestion`, `CodeAnalysis`); `providers/OpenAIProvider.ts` (axios, retry 3x exponential, model='gpt-4o-mini', max_tokens=300, temperature по типу задачи, **разделение system/user prompt**, валидация длины user-content max 4000 токенов, фильтр тегов `<system>`); `providers/GigaChatProvider.ts` (OAuth client_credentials с кэшированием токена 28 мин, та же защита от prompt-injection)
- [x] **2.9** ⛔ **2.8** `factory.ts` с `AIProviderFactory` и circuit breaker (`Map<name, {failures, lastFailure}>`, threshold=3, timeout=60s). Health-check перед каждым запросом
- [x] **2.10** LRU-кэш для AI-ответов: `lru-cache` (1000 записей, TTL 1ч, ключ SHA256(provider+prompt_hash+temperature))
- [x] **2.11** Admin endpoints (`GET/POST/PUT /api/admin/algorithms`, `GET /api/admin/users`)
- [x] **2.12** Swagger UI на `/api/docs` (OpenAPI 3)
- [ ] **2.13** Postman/Insomnia коллекция: сгенерировать `postman_collection.json` из OpenAPI через `openapi-to-postman`, сохранить в `server/docs/`
- [x] **2.14** Vitest тесты: coverage ≥70% для `ai/factory.ts` (100%), `middleware/auth.ts` (100%), `repositories/*.ts` (80%), `engines/*.ts` (100%). HTML-отчёт в `server/coverage/`

---

## ФАЗА 3 — Frontend (10.06–16.06, 7 дней, → с backend)

- [x] **3.1** Vite + Tailwind + shadcn/ui + React Router + **i18n (react-i18next, locales/ru.json, `<html lang="ru">`)**
- [x] **3.2** Axios instance с interceptors (Bearer, 401 → /login, 429 → exponential backoff retry max 3) + **ErrorBoundary вокруг `VisualizationPage` и `CodePanel`**
- [x] **3.3** CatalogPage с фильтрами (category, difficulty, completed), fuse.js поиск debounce 300ms, CSS Grid
- [x] **3.4** TheoryPage с блокировкой прогресса, inline-quiz, localStorage заметки, confetti
- [x] **3.5** ⛔ **3.1** `client/src/visualization/`: `AlgorithmEngine.ts` (abstract), `engines/{Bubble,Insertion,Selection,BinarySearch}Engine.ts`, `StepGenerator.ts`, `CanvasRenderer.ts` (clearRect + requestAnimationFrame, 60 FPS на 100 элементах), `AnimationController.ts` (play/pause/stepForward/stepBackward/speed 0.5x–4x), `StatsCollector.ts` (comparisons, swaps, elapsed). Стили столбцов: оранжевый=comparing, зелёный=sorted, красный=active. Интегрировать в `pages/VisualizationPage.tsx` с Monaco-редактором в нижней панели (drag-to-resize, debounce 800ms)
- [x] **3.6** ⛔ **2.5** ⛔ **3.1** `client/src/workers/code-executor.worker.ts`: AST-парсинг `@babel/parser` (Strict mode); запретить `eval`, `Function`, `fetch`, `XMLHttpRequest`, `WebSocket`, `import`, `export`, `postMessage`, `globalThis`; белый список Math/Array/Object/Number/String/console; таймаут через `Atomics.wait` + `SharedArrayBuffer`; лимит шагов 5000. **CSP в `index.html`**: `worker-src 'self' blob:; script-src 'self' 'unsafe-eval'`**
- [x] **3.7** ⛔ **2.8** AI integration UI (кнопки explain/analyze/new question, обработка ошибок, ретраи)
- [x] **3.8** TestPage (4 типа вопросов: radio, checkbox, drag&drop matching, text short_answer; адаптивность при <70%)
- [x] **3.9** AdminPage (CRUD + WYSIWYG @tiptap/react + Recharts + экспорт CSV/PDF)
- [x] **3.10** Адаптив 320/768/1920 + lazy loading + a11y

---

## ФАЗА 4 — Тестирование + апробация (16.06–18.06, 3 дня)

- [ ] **4.1** ⛔ **2.14** E2E Playwright: полный цикл (каталог → теория → визуализация → редактор → тест → результат); failover (блокировка OpenAI → переход на GigaChat)
- [ ] **4.2** ⛔ **2.12** ⛔ **2.13** Нагрузочное (k6): 100 users, ramp-up 60с, duration 5мин. Сценарий генерируется из OpenAPI через `openapi-to-k6`. Метрики: p95 < 2с, error rate < 1%, RPS > 50
- [ ] **4.3** Сценарий «Сортировка пузырьком» (6 шагов) со скриншотами для приложения В

---

## ФАЗА 5 — Доработка диплома (18.06–19.06, 2 дня)

- [ ] **5.1** Скриншоты 4 алгоритмов визуализации (все, не только bubble)
- [ ] **5.2** Скриншоты админ-панели
- [ ] **5.3** ER-диаграмма
- [ ] **5.4** Тест-кейсы «чёрного ящика» — приложение Б (7 кейсов)
- [ ] **5.5** Скриншоты всех 6 экранных форм в разделы 3.3, 3.6.3
- [ ] **5.6** Backup-видео live-demo (на случай сбоя интернета)

---

## ⏰ Сжатый таймлайн (14 дней)

```
06.06 пт  ██ Фаза 0 (правки) + Фаза 1 старт (репо, Prisma, .env.example, README)
07.06 сб  ██ Фаза 0 + Фаза 1 (БД, сиды, Docker, CI/CD workflow)
08.06 вс  ██ Backend каркас (2.1-2.5) + Auth + каталог фронт
09.06 пн  ██ Backend CRUD (2.7) + TheoryPage (3.4)
10.06 вт  ██ AI Service Layer (2.8-2.10) + Visualization старт (3.5)
11.06 ср  ██ Admin/Swagger/Postman (2.11-2.13) + Visualization продолжение
12.06 чт  ██ Backend тесты (2.14) + Editor + Web Worker (3.6) + CSP
13.06 пт  ██ TestPage (3.8) + Admin UI (3.9)
14.06 сб  ██ AI UI (3.7) + Адаптив + ErrorBoundary + i18n
15.06 вс  ██ E2E Playwright (4.1)
16.06 пн  ██ Нагрузочное k6 (4.2) + апробация bubble sort (4.3)
17.06 вт  ██ Сдача руководителю 08.06–10.06 ✓
18.06 ср  ██ Устранение замечаний (11.06–14.06) + финальные правки диплома
19.06 чт  ██ Отзыв (15.06–19.06)
20.06 пт  ██ СДАЧА 20.06.2026 ✓
```

---

## 🚨 Риски и митигация

| Риск | Вероятность | Митигация |
|------|-------------|-----------|
| OpenAI недоступен из РФ | Высокая | GigaChat primary, OpenAI fallback (поменять местами в `factory.ts`) |
| 29 дней плана → 14 дней реальных | Высокая | Параллелизация backend/frontend + готовые шаблоны shadcn |
| Web Worker AST-парсинг сложный | Средняя | Упростить: regex на запрещённые токены (eval/Function/fetch/XHR/WebSocket/import/export) + Babel для грубой проверки |
| Кэш-хитрейт ниже 35% | Средняя | Снизить TTL до 30 мин, увеличить max до 2000 |
| Время визуализации 60 FPS | Средняя | Throttling + `requestAnimationFrame` уже есть; fallback на оффлайн-рендер при < 30 FPS |
| SharedArrayBuffer требует COOP/COEP | Высокая | Helmet с `crossOriginOpenerPolicy` и `crossOriginEmbedderPolicy` (задача 2.5) |
| Рецензент «ломает» prompt-injection | Средняя | Задача 2.8 включает защиту (фильтр `<system>`, лимит токенов) |
| Защита Monaco Worker без CSP | Высокая | CSP в `index.html` (задача 3.6) |

---

## 🎯 MVP-определение (если времени не хватит)

**P0 (обязательно к 20.06):** Фаза 0, Фаза 1.1–1.5, Фаза 2.1–2.10 + 2.14, Фаза 3.1–3.6 + 3.8, Фаза 4.1–4.3, Фаза 5.1–5.4

**P1 (желательно):** Фаза 1.6–1.8, Фаза 2.11–2.13, Фаза 3.7, 3.9, 3.10, Фаза 5.5–5.6

**P2 (drop, если нет времени):** Postman коллекция, backup-видео, расширенная аналитика в AdminPage

---

## 📋 Финальный чек-лист «ОТ и ДО» (29 пунктов из PDF стр. 23)

**Обязательные к сдаче (25 пунктов):** репозиторий, docker-compose, миграции, seed, 15 endpoints, JWT, AI failover, rate limit, каталог, теория с блокировкой, визуализация 4 алгоритмов, Monaco + Web Worker, тест 5–10 вопросов, адаптив 320/768/1920, 7 тест-кейсов, нагрузка 100 users, апробация «bubble sort» со скриншотами, диаграммы IDEF0/DFD/UML/ER в тексте, актуальные скриншоты, разделы 3.1.1↔3.1.2, GPT-4o→GPT-4o-mini, раздел 2.4, переименование 2.7→2.2.6, обновлённые источники.

**Желательные (4):** Swagger UI, unit-покрытие ≥70%, E2E автотесты, backup-запись live-demo.

---

## 💡 Out of scope (на будущее, не блокирует сдачу)

- WebSocket для real-time прогресса (можно показать как «возможное развитие»)
- Kubernetes-манифесты (docker-compose достаточно)
- E-mail уведомления
- Mobile app
- Платёжная интеграция
- Расширенная аналитика в AdminPage (тепловые карты, ML-аналитика)

---

## 🚀 С чего начать прямо сейчас (06.06, 5 первых шагов)

1. **Правки диплома** (Фаза 0) — открыть docx и внести 15 правок
2. **Монорепо:** `mkdir server client && cd server && npm init -y`
3. **Prisma:** `npx prisma init` в `server/`, перенести схему из PDF стр. 5–8 + индексы
4. **Сгенерировать секреты:** `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
5. **Запросить у научного руководителя** список замечаний к текущей версии (если есть)

Готов начинать реализацию любой фазы по команде.
