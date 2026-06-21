# Описание системы: Электронный учебник «Алгоритмы и структуры данных»

> Дипломный проект студентки Абдулатиповой А.З. (ИСПк-402-52-00)

---

## 1. Назначение системы

Веб-приложение для интерактивного изучения алгоритмов сортировки и поиска. Система предоставляет:
- Теоретические материалы по каждому алгоритму (разбитые на модули)
- Пошаговую визуализацию работы алгоритмов на HTML5 Canvas
- Тесты для самопроверки (4 типа вопросов: одиночный выбор, множественный выбор, сопоставление, короткий ответ)
- Практические задания по программированию с онлайн-редактором кода (Monaco Editor)
- AI-генерацию вопросов для проверки понимания каждого модуля теории (OpenAI + GigaChat с автоматическим переключением)
- Систему отслеживания прогресса (локально для анонимов + на сервере для авторизованных)
- Интернационализацию (русский / английский)
- Личный кабинет с детальной статистикой обучения

---

## 2. Технологический стек

### 2.1 Backend
| Технология | Версия | Назначение |
|---|---|---|
| Node.js | >=20 LTS | Серверный runtime |
| Express | 4.21.1 | HTTP-фреймворк |
| TypeScript | 5.6.3 | Типизация |
| PostgreSQL | 15 | Реляционная БД |
| Prisma | 5.22.0 | ORM (type-safe, миграции, CLI) |
| Zod | 3.23.8 | Валидация (env, body, params) |
| JWT (jsonwebtoken) | 9.0.2 | Аутентификация (7 дней TTL) |
| bcrypt | 5.1.1 | Хеширование паролей (10 раундов) |
| Winston | 3.15.0 | Логирование (консоль/файлы) |
| Helmet | 8.0.0 | HTTP-заголовки безопасности (CSP, HSTS, COOP/COEP) |
| express-rate-limit | 7.4.1 | Rate limiting (100/15мин общий, 20/15мин AI) |
| compression | 1.7.4 | gzip-сжатие |
| LRU Cache (lru-cache) | 11.0.2 | Кэш ответов AI (1000 записей, TTL 1 час) |
| Axios | 1.7.7 | HTTP-клиент для внешних API |

### 2.2 Frontend
| Технология | Версия | Назначение |
|---|---|---|
| React | 18.3 | UI-библиотека |
| TypeScript | 5.5.4 | Типизация |
| Vite | 5.4.6 | Сборщик + dev-сервер с HMR |
| Tailwind CSS | 3.4.10 | Utility-first CSS |
| Zustand | 4.5.5 | Управление состоянием |
| React Router DOM | 6.26.2 | Маршрутизация (nested routes) |
| Axios | 1.7.7 | HTTP-клиент (interceptors, retry) |
| Monaco Editor | 4.6.0 | Редактор кода (5 языков) |
| Recharts | 2.12.7 | Графики и диаграммы |
| i18next | 23.15.1 | Интернационализация (ru/en) |
| Lucide React | 0.451.0 | Иконки |
| TipTap | 2.6.6 | Rich-text редактор |
| @dnd-kit | 6/8 | Drag-and-drop (сопоставление) |
| Fuse.js | 7.0.0 | Нечёткий поиск |
| canvas-confetti | 1.9.3 | Конфетти при успехе |
| react-hot-toast | 2.4.1 | Уведомления |

### 2.3 Инфраструктура
| Технология | Назначение |
|---|---|
| Docker (>=24) + Docker Compose v2 | Контейнеризация (3 сервиса: db, server, client) |
| npm workspaces | Монорепозиторий |
| concurrently | Параллельный запуск server + client |
| GitHub Actions | CI/CD (lint, typecheck, test, build, deploy) |
| OpenAPI 3.0.3 | Спецификация API (Swagger UI на `/api/docs`) |

### 2.4 Внешние API
| Сервис | Назначение |
|---|---|
| OpenAI API (GPT-4o-mini) | Основной AI-провайдер |
| GigaChat API (Сбер) | Резервный AI-провайдер |
| Piston API (codex.lol) | Выполнение кода (Python, Java, C++, Go) |

---

## 3. Архитектура приложения

### 3.1 Общая схема

```
[Браузер] ←→ [Vite Dev Server / Nginx] ←→ [Express API (port 3001)] ←→ [PostgreSQL 15 (port 5432)]
                   ↓                              ↓
            [React SPA]                    [Prisma ORM]
            [Zustand Stores]               [AI Providers (OpenAI / GigaChat)]
            [LocalStorage]                 [Piston API]
```

### 3.2 Структура монорепозитория

```
/
├── client/                         # React-фронтенд
│   ├── src/
│   │   ├── components/             # UI-компоненты (ui/, layout/, algorithms/)
│   │   ├── pages/                  # Страницы
│   │   │   └── tabs/               # Вкладки алгоритма (Theory, Visualization, Test, Practice)
│   │   ├── stores/                 # Zustand (auth, progress, theme)
│   │   ├── hooks/                  # Кастомные хуки (useInView)
│   │   ├── i18n/                   # Переводы (ru.json, en.json)
│   │   ├── lib/                    # api.ts, cn.ts, format.ts, templates.ts
│   │   ├── types/                  # TypeScript-типы (api.ts)
│   │   ├── visualization/          # Движок визуализации алгоритмов
│   │   │   ├── AlgorithmEngine.ts  # Интерфейс
│   │   │   ├── AnimationController.ts  # Play/Pause/Step
│   │   │   ├── CanvasRenderer.ts   # HTML5 Canvas рендер
│   │   │   ├── StatsCollector.ts   # Счётчики
│   │   │   ├── engines.ts          # Registry
│   │   │   └── engines/            # BubbleSort, InsertionSort, SelectionSort, BinarySearch
│   │   └── workers/                # code-executor.worker.ts (Web Worker песочница)
│   └── ... (vite.config, tailwind.config, postcss, tsconfig)
│
├── server/                         # Express-бэкенд
│   ├── prisma/
│   │   ├── schema.prisma           # 12 моделей + 3 enum
│   │   ├── seed.ts                 # Сиды (4 алгоритма, 24 теории, ~30 вопросов, 4 задачи)
│   │   └── migrations/             # 5 миграций
│   ├── src/
│   │   ├── config/                 # env.ts (Zod), db.ts (Prisma singleton), logger.ts (Winston), openapi.ts
│   │   ├── middleware/             # auth.ts, errorHandler.ts, rateLimit.ts, validate.ts
│   │   ├── controllers/            # Auth, Algorithm, Test, Solution, Progress, AI, Theory, Execute
│   │   ├── services/              # AuthService
│   │   ├── repositories/           # AlgorithmRepository, TestAttemptRepository, UserSolutionRepository, ProgressRepository
│   │   ├── routes/                 # 8 роутов (auth, algorithm, test, solution, progress, ai, theory, execute)
│   │   ├── ai/                     # IAIProvider, BaseAIProvider, OpenAIProvider, GigaChatProvider, factory, cache
│   │   ├── types/                  # index.ts, express.d.ts
│   │   ├── utils/                  # errors.ts (7 классов ошибок), algoSimulator.ts
│   │   └── validators/             # Zod-схемы
│   ├── tests/                      # Vitest (sanitize, factory)
│   └── Dockerfile                  # Multi-stage build (Node 20 Alpine)
│
├── docker-compose.yml              # 3 сервиса: db (PostgreSQL 15), server, client (Nginx)
├── .env.example                    # Шаблон переменных окружения
├── package.json                    # npm workspaces root
├── er_diagram.sql                  # ER-диаграмма для визуализации
└── README.md                       # Документация
```

### 3.3 Принципы организации кода

**Backend — Layer-based:**
- **Routes**: только HTTP-метод + путь + middleware. Без логики.
- **Controllers**: обработка запроса/ответа, вызов сервисов/репозиториев. Минимальная логика.
- **Services**: бизнес-логика (хеширование, генерация JWT, регистрация).
- **Repositories**: абстракция над Prisma-запросами.
- **Middleware**: сквозные задачи (аутентификация, rate limit, валидация, ошибки).

**Frontend — Feature-based:**
- **Pages** = маршруты
- **Components** = переиспользуемые UI-блоки
- **Stores** = глобальное состояние (Zustand)
- **Tabs** = вкладки страницы алгоритма (теория/визуализация/тест/практика)

---

## 4. Серверная часть (Backend)

### 4.1 Точка входа (`server/src/index.ts`)

Порядок подключения middleware:
1. `requestIdMiddleware` — UUID к каждому запросу
2. `helmet()` — security headers (CSP, HSTS, COOP/COEP)
3. `cors()` — whitelist по `CLIENT_URL`
4. `compression()` — gzip
5. `express.json({ limit: "1mb" })`
6. `express.urlencoded({ extended: true })`
7. `generalRateLimiter` — 100 req / 15 min
8. HTTP-логгер (Winston)
9. `verifyToken` — опциональная аутентификация (заполняет `req.user`, не блокирует)
10. Маршруты
11. `notFoundHandler` (404)
12. `errorHandler` (централизованная обработка)

Graceful shutdown: SIGTERM/SIGINT → закрыть HTTP-сервер → отключить Prisma → exit.

### 4.2 Middleware

**auth.ts**:
- `verifyToken`: извлекает JWT из `Authorization: Bearer <token>`, верифицирует, декодирует в `req.user = { user_id, username, email }`. Не блокирует при отсутствии токена.
- `requireAuth`: вызывает `verifyToken` и возвращает 401 если нет `req.user`.

**validate.ts**: универсальный middleware, принимает Zod-схему. Валидирует body/query/params. Возвращает 400 с детализацией.

**rateLimit.ts**:
- `generalRateLimiter`: 100 запросов / 15 минут на IP
- `aiRateLimiter`: 20 запросов / 15 минут на IP (для AI-эндпоинтов)

**errorHandler.ts**: ловит все ошибки, логирует, возвращает JSON: `{ code, message, statusCode, requestId }`.

### 4.3 Кастомные классы ошибок (`server/src/utils/errors.ts`)
| Класс | HTTP status | code |
|---|---|---|
| BadRequestError | 400 | BAD_REQUEST |
| UnauthorizedError | 401 | UNAUTHORIZED |
| ForbiddenError | 403 | FORBIDDEN |
| NotFoundError | 404 | NOT_FOUND |
| ConflictError | 409 | CONFLICT |
| ValidationError | 422 | VALIDATION_ERROR |
| RateLimitError | 429 | RATE_LIMIT_EXCEEDED |
| AIProviderUnavailableError | 503 | AI_PROVIDER_UNAVAILABLE |

### 4.4 Контроллеры и эндпоинты

#### AuthController
| Метод | Эндпоинт | Описание |
|---|---|---|
| register | POST /api/auth/register | Регистрация: username (3-30 символов, лат/кир/цифры/_), email, password (мин. 8). Bcrypt. JWT. |
| login | POST /api/auth/login | Вход по username/email + password. JWT. |
| getMe | GET /api/auth/me | Текущий пользователь по `req.user.user_id`. |

#### AlgorithmController
| Метод | Эндпоинт | Описание |
|---|---|---|
| list | GET /api/algorithms | Список с фильтрацией (категория, сложность, поиск), пагинация, прогресс для авторизованных |
| getById | GET /api/algorithms/:id | Детально: теория, тесты, задачи, прогресс |
| getTests | GET /api/algorithms/:id/tests | Тесты алгоритма |

#### TestController
| Метод | Эндпоинт | Описание |
|---|---|---|
| getById | GET /api/tests/:id | Тест с вопросами и вариантами |
| getByAlgorithm | GET /api/tests/by-algorithm/:algorithmId | Тесты для алгоритма |
| submit | POST /api/tests/:id/submit | Отправка ответов, автопроверка |
| startAttempt | POST /api/tests/:id/attempt | Начать попытку |
| submitAttempt | POST /api/tests/attempt/:id/submit | Завершить попытку |
| getAttempt | GET /api/tests/attempt/:id | Результат попытки |

#### SolutionController
| Метод | Эндпоинт | Описание |
|---|---|---|
| submit | POST /api/solutions | Сохранить решение |
| getByTask | GET /api/solutions/task/:taskId | Решения для задачи |
| getMy | GET /api/solutions/my | Все решения пользователя |

#### ProgressController
| Метод | Эндпоинт | Описание |
|---|---|---|
| getAll | GET /api/progress | Прогресс по всем алгоритмам + статистика AI-тестирования |
| update | PUT /api/progress/:algorithmId | Обновить прогресс (теория/тест/практика) |

#### TheoryController
| Метод | Эндпоинт | Описание |
|---|---|---|
| generateQuestion | POST /api/theory/:materialId/generate | AI-генерация вопроса для модуля теории. Fallback при отказе AI. |
| checkAnswer | POST /api/theory/:materialId/check | Проверка ответа, сохранение QuizAttempt, возврат статистики. Модуль пройден при 3+ правильных. |

#### AIController
| Метод | Эндпоинт | Описание |
|---|---|---|
| ask | POST /api/ai/ask | Универсальный запрос к AI |
| explain | POST /api/ai/explain | Объяснение концепции |
| generateQuestion | POST /api/ai/generate-question | Генерация вопроса |
| analyzeCode | POST /api/ai/analyze-code | Анализ кода студента |
| analyzeDual | POST /api/ai/analyze-dual | Сравнение ответов двух провайдеров |
| getStats | GET /api/ai/stats | Статистика использования AI |

#### ExecuteController
| Метод | Эндпоинт | Описание |
|---|---|---|
| run | POST /api/execute/run | Выполнение кода через Piston API (JS, Python, Java, C++, Go) |
| trace | POST /api/execute/trace | Серверная трассировка с пошаговой визуализацией |

### 4.5 Конфигурация (`server/src/config/env.ts`)

Все переменные окружения валидируются через Zod schema:
- `PORT` (3001), `NODE_ENV` (development/production/test)
- `DATABASE_URL`, `SHADOW_DATABASE_URL`
- `JWT_SECRET` (мин. 32 символа), `JWT_EXPIRES_IN` (7d)
- `OPENAI_API_KEY`, `OPENAI_MODEL` (gpt-4o-mini), `OPENAI_MAX_TOKENS` (300), `OPENAI_TIMEOUT_MS` (30000)
- `GIGACHAT_CLIENT_ID`, `GIGACHAT_CLIENT_SECRET`, `GIGACHAT_SCOPE` (GIGACHAT_API_PERS), `GIGACHAT_MODEL` (GigaChat:latest), `GIGACHAT_TIMEOUT_MS` (30000)
- `RATE_LIMIT_WINDOW_MS` (900000), `RATE_LIMIT_MAX` (100), `AI_RATE_LIMIT_WINDOW_MS` (60000), `AI_RATE_LIMIT_MAX` (20)
- `AI_CACHE_MAX` (1000), `AI_CACHE_TTL_MS` (3600000)
- `CIRCUIT_BREAKER_THRESHOLD` (3), `CIRCUIT_BREAKER_TIMEOUT_MS` (60000)

---

## 5. База данных

### 5.1 Модели (12 таблиц, 3 enum)

**Enums:**
- `DifficultyLevel`: easy, medium, hard
- `QuestionType`: single_choice, multiple_choice, matching, short_answer
- `AttemptStatus`: in_progress, completed, abandoned

**Models:**

1. **User** (users)
   - `user_id` (PK), `username` (UNIQUE), `email` (UNIQUE), `password_hash`, `created_at`, `updated_at`

2. **Algorithm** (algorithms)
   - `algorithm_id` (PK), `slug` (UNIQUE), `name`, `category`, `difficulty` (enum), `description`, `time_complexity`, `space_complexity`, `created_at`, `updated_at`
   - Индексы: category, difficulty, slug

3. **TheoryMaterial** (theory_materials)
   - `material_id` (PK), `algorithm_id` (FK→algorithms), `title`, `content` (markdown), `type`, `order_num`, `quiz` (JSON), `created_at`
   - Индекс: (algorithm_id, order_num)
   - 6 модулей на каждый алгоритм (всего 24)

4. **Test** (tests)
   - `test_id` (PK), `algorithm_id` (FK→algorithms), `title`, `description`, `passing_score` (default 70), `created_at`, `updated_at`

5. **Question** (questions)
   - `question_id` (PK), `test_id` (FK→tests), `question_text`, `question_type` (enum), `explanation`, `correct_answer`, `order_num`, `created_at`

6. **Option** (options)
   - `option_id` (PK), `question_id` (FK→questions), `option_text`, `is_correct`, `order_num`

7. **Task** (tasks)
   - `task_id` (PK), `algorithm_id` (FK→algorithms), `material_id` (FK→theory_materials, nullable), `name`, `description`, `starter_code`, `correct_answer`, `tests` (JSON), `language` (default 'javascript'), `order_num`, `created_at`

8. **UserProgress** (user_progress)
   - `progress_id` (PK), `user_id` (FK→users), `algorithm_id` (FK→algorithms), `theory_completed`, `test_completed`, `practice_completed`, `score_percent`, `completed_at`, `updated_at`
   - UNIQUE (user_id, algorithm_id)

9. **TestAttempt** (test_attempts)
   - `attempt_id` (PK), `test_id` (FK→tests), `user_id` (FK→users), `status` (enum), `score`, `max_score`, `passed`, `started_at`, `completed_at`

10. **UserAnswer** (user_answers)
    - `answer_id` (PK), `attempt_id` (FK→test_attempts), `question_id` (FK→questions), `answer_text`, `is_correct`, `created_at`
    - UNIQUE (attempt_id, question_id)

11. **UserSolution** (user_solutions)
    - `solution_id` (PK), `user_id` (FK→users), `task_id` (FK→tasks), `code`, `language`, `result`, `score`, `execution_time`, `is_correct`, `submission_date`

12. **AIFeedback** (ai_feedbacks)
    - `feedback_id` (PK), `solution_id` (FK→user_solutions, nullable), `user_id` (FK→users), `prompt_type`, `prompt_content`, `ai_response`, `provider_used`, `tokens_used`, `created_at`

13. **QuizAttempt** (quiz_attempts)
    - `attempt_id` (PK), `user_id` (FK→users), `algorithm_id`, `material_id`, `question_text`, `selected_answer`, `correct_answer`, `is_correct`, `created_at`
    - Индексы: (user_id, algorithm_id), (user_id, material_id)

### 5.2 Связи
- Algorithm → TheoryMaterial (1:N), Test (1:N), Task (1:N), UserProgress (1:N)
- Test → Question (1:N), TestAttempt (1:N)
- Question → Option (1:N), UserAnswer (1:N)
- User → UserProgress (1:N), TestAttempt (1:N), UserSolution (1:N), AIFeedback (1:N), QuizAttempt (1:N)
- Task → UserSolution (1:N)
- TestAttempt → UserAnswer (1:N)
- UserSolution → AIFeedback (1:N)

### 5.3 ER-диаграмма
Полный DDL с комментариями на русском — в файле `er_diagram.sql`. Может быть импортирован в DBeaver, DataGrip, dbdiagram.io.

---

## 6. Клиентская часть (Frontend)

### 6.1 Маршруты (React Router v6)

| Путь | Компонент | Описание |
|---|---|---|
| `/` | HomePage | Лендинг (hero, features, showcase, stats, how-it-works, CTA) |
| `/catalog` | CatalogPage | Каталог с поиском (Fuse.js), фильтрами (категория, сложность), сортировкой |
| `/algorithms/:id` | AlgorithmPage | Детальная страница + вкладки (nested routes) |
| `/algorithms/:id/visualization` | VisualizationTab | Canvas-визуализация |
| `/algorithms/:id/test` | TestTab | Тестирование (4 типа вопросов) |
| `/algorithms/:id/practice` | PracticeTab | Редактор кода (Monaco Editor) |
| `/progress` | ProgressPage | Дашборд (PieChart, BarChart через Recharts) |
| `/login` | LoginPage | Форма входа |
| `/register` | RegisterPage | Форма регистрации |
| `/profile` | ProfilePage | Личный кабинет со статистикой |

### 6.2 Глобальное состояние (Zustand)

**Auth Store** (`stores/auth.ts`):
- `user`, `token`, `loading`
- `login()`, `register()`, `logout()`, `loadUser()`
- Токен в localStorage (ключ `algo.auth.token`)
- Автоподстановка в HTTP-заголовки через axios interceptor

**Progress Store** (`stores/progress.ts`):
- Локальный прогресс для анонимных пользователей
- `bySlug: Record<string, AlgorithmProgress>`
- `markSection()`, `reset()`, `resetAlgorithm()`, `isFullyCompleted()`
- Персистентность: localStorage (ключ `algo.progress.v1`)

**Theme Store** (`stores/theme.ts`):
- `theme: "light" | "dark"`
- Автоопределение системных предпочтений
- Сохранение в localStorage

### 6.3 API-клиент (`lib/api.ts`)

- Axios instance с `baseURL` из `VITE_API_URL`
- Request interceptor: автодобавление `Authorization: Bearer <token>`
- Response interceptor: retry (3 раза при 429 с экспоненциальной задержкой, 2 раза при 5xx)
- При 401: очистка токена из localStorage
- Уведомления об ошибках через react-hot-toast

### 6.4 Интернационализация (i18n)

- Детектор: определение языка браузера
- Файлы: `ru.json` (~150 ключей), `en.json` (~150 ключей)
- Использование: `const { t } = useTranslation()`

### 6.5 Визуализация алгоритмов

Движок в `client/src/visualization/`:

**AlgorithmEngine** (интерфейс)
- `generateSteps(array)` — пошаговая трассировка
- `getName()` — название

Каждый шаг: `{ array, type, indices, note, explanation }`
- type: `compare` | `swap` | `set` | `found` | `not_found` | `pivot` | `range` | `sorted`

**Реализованные engine:**
- BubbleSortEngine — пузырьковая сортировка (O(n²))
- InsertionSortEngine — сортировка вставками (O(n²))
- SelectionSortEngine — сортировка выбором (O(n²))
- BinarySearchEngine — бинарный поиск (O(log n))

**AnimationController:**
- Play / Pause / Step Forward / Step Back / Seek
- Скорость: 0.5x — 3x
- RAF-based (requestAnimationFrame) с lerp-интерполяцией

**CanvasRenderer:**
- HTML5 Canvas с градиентными барами
- Подсветка: синий (сравнение), зелёный (обмен), красный (граница)
- Статистика (сравнения, обмены, время)
- Псевдокод с подсветкой текущей строки

### 6.6 Web Worker (`workers/code-executor.worker.ts`)

Безопасное выполнение JavaScript в браузере:
- Изоляция через Proxy для отслеживания операций
- Ограничения: 8000 шагов, 5 секунд таймаут
- Запрещены: `eval`, `Function`, `import`, `require`, `XMLHttpRequest`
- SharedArrayBuffer + Atomics.wait для таймаута
- Трассировка всех операций для визуализации

---

## 7. AI-модуль

### 7.1 Архитектура (Factory + Strategy Pattern)

```
AIProviderFactory
├── Circuit Breaker: 3 ошибки → изоляция 60 сек
├── Health check перед каждым запросом
├── generateWithCache() — с LRU-кэшем
├── generateQuestionWithFallback() — OpenAI → GigaChat → fallback
├── analyzeCodeWithFallback() — OpenAI → GigaChat → fallback
├── generateDual() — параллельный запрос к обоим
└── getProvidersInfo() — состояние circuit breaker
```

### 7.2 Провайдеры

**OpenAIProvider:**
- OpenRouter API (совместимый с OpenAI)
- Retry: 3 попытки при 429/5xx с экспоненциальной задержкой
- Системные промпты на русском (1-3 предложения, без воды)

**GigaChatProvider:**
- Sber GigaChat API
- OAuth-авторизация с кэшированием токена
- Self-signed сертификаты: `https.Agent({ rejectUnauthorized: false })`

### 7.3 Кэширование (`ai/cache.ts`)

- LRU-кэш: 1000 записей, TTL 1 час
- Ключ: SHA-256(provider + prompt + temperature)
- Кэшируются: explain, analyze (НЕ generate_question — вопросы должны быть уникальными)
- Hit rate отслеживается (логируется)

### 7.4 Системные промпты

- **explain_error**: «Объясни ошибку в коде студента кратко, по делу. Только JSON.»
- **generate_question**: «Сгенерируй 1 вопрос по теме с 4 вариантами. В каждом варианте дай развёрнутое объяснение (минимум 40 слов). Формат: { question_text, options: [{ text, is_correct, explanation }] }. Только JSON.»
- **analyze_code**: «Проанализируй код студента. Только JSON: issues, complexity, improvements, summary (1 предложение).»

### 7.5 Prompt injection sanitization (BaseAIProvider)

Фильтрация вредоносных паттернов в userContent:
- Игнорирование инструкций (игнорируй, забудь, ignore, forget)
- Блокировка системных промптов (system prompt, ты теперь)
- Запрет на смену роли

### 7.6 Сценарии использования

1. **Теория: генерация вопроса** — при открытии модуля AI генерирует вопрос для проверки понимания
2. **Теория: проверка ответа** — сохранение QuizAttempt, при 3+ правильных модуль считается пройденным
3. **Практика: анализ кода** — AI анализирует код студента с рекомендациями
4. **Практика: подсказка** — AI даёт подсказку без готового ответа
5. **AI-чат** — универсальный запрос к AI по теме алгоритма

---

## 8. Аутентификация и безопасность

### 8.1 Регистрация
1. Валидация Zod (username: 3-30, regex `^[a-zA-Z0-9_\u0400-\u04FF]+$`; email; password: min 8)
2. Проверка уникальности username и email в БД
3. bcrypt hash (cost 12)
4. Создание пользователя
5. JWT: payload `{ user_id, username, email }`, expires 7d
6. Ответ: `{ user: { user_id, username, email }, token }`

### 8.2 JWT
- Секрет: `JWT_SECRET` (мин. 32 символа)
- Срок: 7 дней
- Хранение на клиенте: localStorage `algo.auth.token`
- Передача: `Authorization: Bearer <token>`
- Верификация: `verifyToken` middleware → `req.user`

### 8.3 Security
- Helmet: CSP, HSTS (1 год), X-Frame-Options, X-Content-Type-Options, COOP/COEP
- CORS: whitelist по `CLIENT_URL`
- Rate limiting: 100/15мин общий, 20/15мин AI
- Bcrypt: cost 12
- Валидация: все входные данные через Zod
- Prompt injection: фильтрация перед отправкой к AI
- Web Worker песочница: ограничение шагов, таймаут, запрет опасных API

---

## 9. Docker-инфраструктура

```yaml
services:
  db:       # postgres:15-alpine, порт 5432, volume pgdata, healthcheck
  server:   # Node 20 Alpine, порт 3001, зависит от db (healthy)
  client:   # Nginx статика (сборка Vite), порт 80, зависит от server
```

Файл `docker-compose.yml` определяет 3 сервиса в bridge-сети `algo-net`:
- **db**: PostgreSQL 15 Alpine с healthcheck (pg_isready)
- **server**: Express API (multi-stage Dockerfile), порт 3001
- **client**: Vite production build → Nginx, порт 80

---

## 10. CI/CD (GitHub Actions)

5 этапов:
1. **lint-typecheck**: ESLint + tsc --noEmit
2. **unit-tests**: Vitest + coverage (порог 70%)
3. **build**: tsc (server) + Vite build (client)
4. **e2e**: Playwright + Chromium + Docker Compose
5. **deploy**: Docker build & push → Docker Hub → SSH deploy

---

## 11. Тестирование

| Тип | Инструмент | Описание |
|---|---|---|
| Unit | Vitest + supertest | AI-модуль (sanitize, factory), утилиты |
| Integration | Testcontainers | API-тесты с PostgreSQL в Docker |
| E2E | Playwright | (запланировано) Chromium + полный сценарий |
| Load | Grafana k6 | (запланировано) 100 RPS, p95 < 2s, error < 1% |

---

## 12. Сиды (тестовые данные)

После `prisma db seed`:
- **4 алгоритма**: bubble-sort, insertion-sort, selection-sort, binary-search
- **24 теоретических блока**: 6 на алгоритм (введение, принцип работы, сложность, визуализация, реализация, примеры)
- **~30 вопросов**: 5-10 на алгоритм (разные типы)
- **4 практические задачи**: с шаблонами и эталонными решениями
- **Администратор**: admin / admin@example.com / admin123

---

## 13. Фронтенд-компоненты

### UI-компоненты (`components/ui/`)
- Button (variants: primary/outline/ghost/danger, sizes: sm/md/lg, loading spinner)
- Card (Card, CardHeader, CardBody, CardFooter, CardTitle, CardDescription)
- Input / Textarea (label, error, hint)
- Select (кастомный)
- Tabs (навигация)
- Modal (overlay, Escape, click-outside)
- Badge (color tones: easy/medium/hard/default/info/success/warning/danger)
- Skeleton (placeholder)
- EmptyState (icon + title + description + action)
- ErrorBoundary (React + reset button)
- PageLoader (full-page spinner)

### Страницы
- **HomePage**: HeroSection, FeaturesGrid, AlgorithmShowcase, StatsCounters, HowItWorks, CTASection
- **CatalogPage**: Fuse.js search, фильтры (категория, сложность), сортировка, toggle "только пройденные", AlgorithmCard
- **AlgorithmPage**: Header (название, сложность, O-нотация), ProgressBar, Tabs (Theory/Visualization/Test/Practice)
- **TheoryTab**: Sidebar с модулями, блокировка, AI Quiz (3 правильных → пройдено, конфетти), заметки (localStorage)
- **VisualizationTab**: Input массива, Canvas, Controls (Play/Pause/Step/Speed), Info panel, AI Assistant
- **TestTab**: Start attempt, навигация по вопросам, drag-and-drop (matching), таймер, автопроверка, результаты
- **PracticeTab**: Monaco Editor (5 языков), шаблоны, Web Worker / Piston API, AI-анализ
- **ProgressPage**: Статистика, PieChart (статусы), BarChart (баллы)
- **ProfilePage**: Аватар, статистика (4 карточки), "продолжить", прогресс по алгоритмам, решения, пройденные

---

## 14. API формат ответа

**Успех:**
```json
{ "data": { ... }, "meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 } }
```

**Ошибка:**
```json
{ "code": "VALIDATION_ERROR", "message": "...", "statusCode": 400, "requestId": "uuid" }
```

Swagger UI: `/api/docs`, OpenAPI spec: `/api/openapi.json`

---

## 15. Ключевые файлы для диплома

| Файл | Содержание |
|---|---|
| `server/src/index.ts` | Точка входа, middleware pipeline, роуты, graceful shutdown |
| `server/src/config/env.ts` | Zod-валидация всех env-переменных |
| `server/prisma/schema.prisma` | Полная схема БД (12 моделей) |
| `server/src/middleware/auth.ts` | JWT verifyToken + requireAuth |
| `server/src/middleware/errorHandler.ts` | Централизованная обработка ошибок |
| `server/src/ai/factory.ts` | AIProviderFactory + Circuit Breaker |
| `server/src/ai/cache.ts` | LRU-кэш (SHA-256 ключи) |
| `server/src/ai/providers/OpenAIProvider.ts` | OpenAI/OpenRouter провайдер |
| `server/src/ai/providers/GigaChatProvider.ts` | GigaChat провайдер |
| `server/src/utils/errors.ts` | 8 классов ошибок |
| `client/src/App.tsx` | Маршрутизация |
| `client/src/stores/auth.ts` | Zustand auth store |
| `client/src/stores/progress.ts` | Zustand progress store (localStorage) |
| `client/src/lib/api.ts` | Axios instance (interceptors, retry) |
| `client/src/visualization/AlgorithmEngine.ts` | Интерфейс движка визуализации |
| `client/src/visualization/CanvasRenderer.ts` | Canvas-рендер |
| `client/src/workers/code-executor.worker.ts` | Web Worker песочница |
| `docker-compose.yml` | Оркестрация 3 контейнеров |
| `er_diagram.sql` | ER-диаграмма для визуализации |
