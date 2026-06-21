# Дипломная работа: Электронный учебник «Алгоритмы и структуры данных»

## Оглавление

1. [Введение](#1-введение)
2. [Технический стек и обоснование](#2-технический-стек-и-обоснование)
3. [Архитектура приложения](#3-архитектура-приложения)
4. [Серверная часть (Backend)](#4-серверная-часть-backend)
5. [Клиентская часть (Frontend)](#5-клиентская-часть-frontend)
6. [База данных](#6-база-данных)
7. [Интеграция с AI](#7-интеграция-с-ai)
8. [Система аутентификации и авторизации](#8-система-аутентификации-и-авторизации)
9. [Визуализация алгоритмов](#9-визуализация-алгоритмов)
10. [API endpoints](#10-api-endpoints)
11. [Тестирование и качество кода](#11-тестирование-и-качество-кода)
12. [Заключение](#12-заключение)

---

## 1. Введение

### 1.1 Описание проекта

Электронный учебник «Алгоритмы и структуры данных» — это полнофункциональное веб-приложение для интерактивного изучения алгоритмов сортировки и поиска. Система предоставляет студентам теоретические материалы, визуализацию работы алгоритмов, тесты для самопроверки, практические задания по программированию и AI-генерируемые вопросы для проверки понимания пройденного материала.

### 1.2 Целевая аудитория

Приложение ориентировано на студентов технических специальностей, изучающих курс «Алгоритмы и структуры данных». Единственная роль пользователей — `student`.

### 1.3 Основные функции

- Просмотр теоретических материалов по алгоритмам (пузырьковая сортировка, сортировка вставками, сортировка выбором, бинарный поиск)
- Пошаговая визуализация работы алгоритмов на произвольных массивах
- Прохождение тестов с автоматической проверкой
- Написание и выполнение кода в онлайн-редакторе с поддержкой 5 языков программирования
- AI-генерация вопросов для проверки понимания каждого модуля теории
- Отслеживание прогресса обучения (локально и на сервере)
- Система регистрации и авторизации

---

## 2. Технический стек и обоснование

### 2.1 Общая архитектура

Приложение построено по архитектуре **клиент-сервер** (SPA + REST API) с монолитным бэкендом и отдельным фронтенд-приложением, объединёнными в монорепозиторий через npm workspaces.

**Монорепозиторий** позволяет:
- Использовать единую версию TypeScript и общие конфигурации
- Запускать сервер и клиент одной командой (`npm run dev`)
- Делить Node.js зависимости (например, Prisma Client генерируется в общую `node_modules`)
- Упростить CI/CD и деплой

### 2.2 Backend

| Технология | Версия | Назначение | Обоснование |
|---|---|---|---|
| **Node.js** | ≥20.0.0 | Среда выполнения | Асинхронная модель идеальна для I/O-bound операций (запросы к БД, AI API). Большое комьюнити. |
| **Express** | 4.21 | Веб-фреймворк | Минималистичный, гибкий, огромная экосистема middleware. Стандарт де-факто для Node.js REST API. |
| **TypeScript** | 5.x | Язык программирования | Статическая типизация предотвращает целые классы ошибок, улучшает документируемость и developer experience. |
| **Prisma** | 5.22 | ORM | Type-safe доступ к БД с автогенерацией типов, миграции, удобный query builder. |
| **PostgreSQL** | 15 | Реляционная БД | Надёжность, поддержка JSON, индексы, транзакции. Соответствует академическим требованиям к дипломным проектам. |
| **JWT (jsonwebtoken)** | 9.x | Аутентификация | Stateless-токены — не требуется хранить сессии на сервере. Bearer-схема. |
| **Zod** | 3.23 | Валидация | Декларативные схемы с TypeScript-инференцией, замена Joi/Yup. |
| **Winston** | 3.15 | Логирование | Уровни логирования, транспорты (консоль/файлы), структурированные JSON-логи. |
| **Helmet** | 8.x | Безопасность | HTTP-заголовки безопасности (CSP, HSTS, X-Frame-Options и др.). |
| **express-rate-limit** | 7.x | Rate limiting | Защита от DoS-атак и перегрузки AI API. |
| **bcrypt** | 5.x | Хеширование паролей | Медленное хеширование (cost factor 12) — защита от перебора. |
| **LRU Cache** | 11.x | Кэширование AI-ответов | Экономия токенов и ускорение повторяющихся запросов. |

### 2.3 Frontend

| Технология | Версия | Назначение | Обоснование |
|---|---|---|---|
| **React** | 18.3 | UI-библиотека | Компонентный подход, виртуальный DOM, огромная экосистема. |
| **TypeScript** | 5.x | Язык | Единый стек с бэкендом, переиспользование типов. |
| **Vite** | 5.x | Сборщик | Мгновенный HMR (Hot Module Replacement), быстрая сборка по сравнению с CRA/Webpack. |
| **Tailwind CSS** | 3.x | CSS-фреймворк | Utility-first подход, отсутствие кастомного CSS, тёмная тема из коробки. |
| **Zustand** | 4.5 | Управление состоянием | Minimalistic API, без boilerplate (в отличие от Redux), поддержка localStorage persistence. |
| **React Router** | 6.26 | Маршрутизация | Nested routes, layout routes, loaders. Стандарт для React SPA. |
| **Axios** | 1.7 | HTTP-клиент | Interceptors (автоматическая подстановка JWT-токена), retry-логика, отмена запросов. |
| **Monaco Editor** | React binding | Редактор кода | Тот же движок, что в VS Code — подсветка синтаксиса, автодополнение, 5 языков. |
| **Lucide React** | 0.451 | Иконки | Легковесные SVG-иконки, tree-shakeable. |
| **Recharts** | 2.12 | Графики | Простая декларативная библиотека для диаграмм на основе D3. |
| **React Hot Toast** | 2.4 | Уведомления | Лёгкие toast-уведомления с поддержкой очереди. |
| **i18next** | 23.x | Интернационализация | Поддержка RU/EN, определение языка браузера, переводы в JSON-файлах. |
| **canvas-confetti** | 1.9 | Анимации | Визуальный фидбек при завершении модуля/теста. |
| **Fuse.js** | 7.0 | Поиск | Нечёткий поиск по алгоритмам с настраиваемой чувствительностью. |

### 2.4 Инфраструктура

| Инструмент | Назначение |
|---|---|
| **Docker** | Контейнеризация PostgreSQL и приложения |
| **npm workspaces** | Монорепозиторий |
| **Concurrently** | Одновременный запуск сервера и клиента в dev-режиме |
| **ESLint + Prettier** | Статический анализ и форматирование кода |
| **Prisma Studio** | GUI для работы с БД в браузере |
| **Swagger UI** | Документация API в браузере |

---

## 3. Архитектура приложения

### 3.1 Структура монорепозитория

```
/
├── client/                    # React-фронтенд
│   ├── src/
│   │   ├── components/        # UI-компоненты (ui/, layout/, algorithms/)
│   │   ├── pages/             # Страницы (Home, Catalog, Algorithm, Login, Profile...)
│   │   │   └── tabs/          # Вкладки страницы алгоритма
│   │   ├── stores/            # Zustand-стори (auth, progress, theme)
│   │   ├── hooks/             # Кастомные React-хуки
│   │   ├── i18n/              # Файлы переводов (ru.json, en.json)
│   │   ├── lib/               # Утилиты (axios instance, cn, format, templates)
│   │   ├── types/             # TypeScript-типы
│   │   ├── visualization/     # Движок визуализации алгоритмов
│   │   └── workers/           # Web Worker для выполнения JavaScript
│   └── ...
├── server/                    # Express-бэкенд
│   ├── prisma/
│   │   └── schema.prisma      # Схема БД
│   ├── src/
│   │   ├── ai/                # AI-модуль (interfaces, providers, factory, cache)
│   │   ├── config/            # Конфигурация (env, db, logger, openapi)
│   │   ├── controllers/       # Контроллеры (Auth, Algorithm, Test, Solution, Progress, AI, Execute, Theory)
│   │   ├── middleware/        # Middleware (auth, errorHandler, rateLimit, validate)
│   │   ├── repositories/     # Репозитории (Algorithm, TestAttempt, UserSolution, Progress)
│   │   ├── routes/           # Маршруты (auth, algorithm, test, solution, progress, ai, theory, execute)
│   │   ├── services/         # Сервисы (AuthService)
│   │   ├── types/            # TypeScript-типы и расширения Express
│   │   ├── utils/            # Утилиты (errors, algoSimulator)
│   │   └── validators/       # Zod-схемы
│   └── ...
├── docker-compose.yml         # Docker Compose
├── er_diagram.sql             # ER-диаграмма в SQL
└── package.json               # Корневой package.json (workspaces)
```

### 3.2 Схема взаимодействия компонентов

```
[Браузер] ←→ [Vite Dev Server / Static] ←→ [Express API] ←→ [PostgreSQL]
                   ↓                             ↓
            [React Router]              [Prisma ORM]
                   ↓                             ↓
         [Page Components]              [AI Providers]
                   ↓                             ↓
         [Zustand Stores]          [OpenAI / GigaChat API]
                   ↓
         [LocalStorage]
```

### 3.3 Принципы организации кода

**Backend: Layer-based architecture**
- **Routes** — определяют HTTP-метод, путь и middleware (включая валидацию). Никакой бизнес-логики.
- **Controllers** — обрабатывают запрос/ответ, вызывают сервисы/репозитории. Минимальная логика (парсинг ID, проверка существования).
- **Repositories** — абстракция над Prisma-запросами. Инкапсулируют сложные запросы.
- **Services** — бизнес-логика (например, хеширование пароля, генерация JWT).
- **Middleware** — сквозные задачи (аутентификация, rate limiting, валидация, обработка ошибок).

**Frontend: Feature-based structure**
- **Pages** — соответствуют маршрутам, содержат композицию компонентов.
- **Components** — переиспользуемые UI-блоки (Button, Card, Input, Modal и т.д.).
- **Stores** — глобальное состояние (аутентификация, прогресс, тема).
- **Tabs** — вкладки на странице алгоритма (теория, визуализация, тест, практика).

---

## 4. Серверная часть (Backend)

### 4.1 Точка входа (index.ts)

Файл `server/src/index.ts` инициализирует Express-приложение. Порядок подключения middleware критичен:

1. **requestIdMiddleware** — добавляет уникальный `X-Request-Id` к каждому запросу
2. **helmet()** — устанавливает заголовки безопасности
3. **cors()** — разрешает кросс-доменные запросы с `CLIENT_URL`
4. **compression()** — gzip-сжатие ответов
5. **express.json({ limit: "1mb" })** — парсинг JSON-тела
6. **express.urlencoded({ extended: true })** — парсинг form-data
7. **generalRateLimiter** — 100 запросов за 15 минут с IP
8. **Морган-подобный логгер** — HTTP-логи
9. **verifyToken middleware** — опциональная аутентификация (не блокирует, а только заполняет `req.user`)
10. **Маршруты** — все API-роуты
11. **notFoundHandler** — 404 для неизвестных путей
12. **errorHandler** — централизованная обработка ошибок

Реализован **graceful shutdown**: перехват `SIGTERM`/`SIGINT`, закрытие Prisma-соединения, завершение HTTP-сервера.

### 4.2 Middleware

#### 4.2.1 Аутентификация (auth.ts)

Два middleware:
- **`verifyToken`** — извлекает JWT из заголовка `Authorization: Bearer <token>`, верифицирует, декодирует в `req.user = { user_id, username, email }`. Не блокирует запрос при отсутствии токена.
- **`requireAuth`** — вызывает `verifyToken` и возвращает 401, если `req.user` отсутствует.

#### 4.2.2 Валидация (validate.ts)

Универсальный middleware, принимающий Zod-схему. Может валидировать `body`, `query`, `params`. При ошибке возвращает 400 с детализированным сообщением.

#### 4.2.3 Rate Limiting (rateLimit.ts)

Два лимитера:
- **generalRateLimiter** — 100 запросов / 15 минут на IP
- **aiRateLimiter** — 20 запросов / 15 минут на IP (для AI-эндпоинтов)

#### 4.2.4 Обработка ошибок (errorHandler.ts)

- **requestIdMiddleware** — генерирует UUID для каждого запроса
- **notFoundHandler** — выбрасывает `NotFoundError` для неизвестных маршрутов
- **errorHandler** — ловит все ошибки, логирует, возвращает JSON с полями `{ code, message, statusCode, requestId }`

Поддерживаются кастомные классы ошибок: `ValidationError` (400), `UnauthorizedError` (401), `ForbiddenError` (403), `NotFoundError` (404), `ConflictError` (409), `RateLimitError` (429), `AIProviderUnavailableError` (503).

### 4.3 Контроллеры

#### 4.3.1 AuthController

| Метод | Эндпоинт | Описание |
|---|---|---|
| `register` | POST /api/auth/register | Регистрация нового пользователя. Валидация через `registerSchema` (username: 3-30 символов, латиница/кириллица/цифры/подчёркивание; email: валидный email; password: мин. 8 символов). Хеширование bcrypt (cost 12). Генерация JWT. Возвращает `{ user, token }`. |
| `login` | POST /api/auth/login | Вход по username/email + password. Проверка bcrypt. Генерация JWT. |
| `getMe` | GET /api/auth/me | Возвращает текущего пользователя по `req.user.user_id`. |

**Важно:** аккаунт не создаётся при ошибке валидации — проверка Zod выполняется до обращения к БД.

#### 4.3.2 AlgorithmController

| Метод | Описание |
|---|---|
| `list` | GET /api/algorithms. Возвращает список алгоритмов с фильтрацией по категории, сложности, поиском по названию, пагинацией. Включает `progress` для авторизованных пользователей. |
| `getById` | GET /api/algorithms/:id. Детальная информация: теория, тесты, задачи, прогресс пользователя. |
| `getTests` | GET /api/algorithms/:id/tests. Тесты для алгоритма. |

#### 4.3.3 TestController

| Метод | Описание |
|---|---|
| `getById` | GET /api/tests/:id. Получение теста с вопросами и вариантами ответов. |
| `getByAlgorithm` | GET /api/tests/by-algorithm/:algorithmId. Тесты для алгоритма. |
| `submit` | POST /api/tests/:id/submit. Отправка ответов и автоматическая проверка. |
| `startAttempt` | POST /api/tests/:id/attempt. Начало попытки прохождения теста. |
| `submitAttempt` | POST /api/tests/attempt/:id/submit. Отправка ответов в рамках попытки. |
| `getAttempt` | GET /api/tests/attempt/:id. Получение результатов попытки. |

#### 4.3.4 SolutionController

| Метод | Описание |
|---|---|
| `submit` | POST /api/solutions. Сохранение решения задачи. |
| `getByTask` | GET /api/solutions/task/:taskId. Решения для задачи. |
| `getMy` | GET /api/solutions/my. Все решения текущего пользователя. |

#### 4.3.5 ProgressController

| Метод | Описание |
|---|---|
| `getAll` | GET /api/progress. Возвращает прогресс по всем алгоритмам, включая статистику AI-тестирования и количество пройденных модулей. |
| `update` | PUT /api/progress/:algorithmId. Обновление прогресса для алгоритма. |

**Детали реализации `getAll`**:
1. Загружает все алгоритмы
2. Загружает `UserProgress` для пользователя
3. Агрегирует `QuizAttempt` — количество попыток, правильных ответов по каждому алгоритму
4. Определяет количество пройденных модулей (материалы с 3+ правильными ответами)
5. Считает общее количество модулей по алгоритму

#### 4.3.6 TheoryController

| Метод | Описание |
|---|---|
| `generateQuestion` | POST /api/theory/:materialId/generate. Генерирует AI-вопрос для модуля теории. При отказе AI использует fallback-вопросы. |
| `checkAnswer` | POST /api/theory/:materialId/check. Проверяет ответ, сохраняет `QuizAttempt`, возвращает статистику и следующий вопрос (при необходимости). |

**Алгоритм `generateQuestion`**:
1. Загружает материал теории и связанный алгоритм из БД
2. Вызывает `aiFactory.generateQuestionWithFallback` с контекстом (имя алгоритма, тема, сложность)
3. Если AI вернул валидный вопрос — парсит JSON: `question_text`, `options[{text, is_correct, explanation}]`
4. Если AI отказал или вернул некорректный JSON — использует `fallbackQuestion()`
5. Возвращает клиенту: `{ question, options, correctIndex, explanation, explanations[] }`

**Алгоритм `checkAnswer`**:
1. Сохраняет ответ в таблицу `QuizAttempt` (user_id, algorithm_id, material_id, question_text, selected_answer, correct_answer, is_correct)
2. Считает статистику по material_id: `total`, `correct`, `wrong`
3. Если `correct >= 3` — модуль пройден
4. Если модуль не пройден — генерирует следующий вопрос
5. Возвращает: `{ passed, attempt: { total, correct, wrong }, nextQuestion }`

#### 4.3.7 ExecuteController

| Метод | Описание |
|---|---|
| `run` | POST /api/execute/run. Выполняет код через Piston API (докеризированная песочница). Поддерживает JS, Python, Java, C++, Go. |
| `trace` | POST /api/execute/trace. Серверная трассировка алгоритмов (пошаговое исполнение с визуализацией). |

#### 4.3.8 AIController

Универсальный контроллер для взаимодействия с AI.

| Метод | Описание |
|---|---|
| `ask` | POST /api/ai/ask. Универсальный запрос к AI. |
| `explain` | POST /api/ai/explain. Объяснение концепции. |
| `generateQuestion` | POST /api/ai/generate-question. Генерация вопроса. |
| `analyzeCode` | POST /api/ai/analyze-code. Анализ кода студента. |
| `analyzeDual` | POST /api/ai/analyze-dual. Анализ двумя провайдерами для сравнения. |
| `getStats` | GET /api/ai/stats. Статистика использования AI (количество запросов, провайдеры, кэш). |

### 4.4 Репозитории

#### 4.4.1 AlgorithmRepository
- `findAll(filters)` — список с фильтрацией по категории, сложности, поиском
- `findById(id)` — детально с включением связанных сущностей
- `count(filters)` — количество для пагинации

#### 4.4.2 ProgressRepository
- `getUserProgress(userId)` — весь прогресс пользователя
- `upsert(userId, algorithmId, data)` — создать или обновить прогресс

#### 4.4.3 TestAttemptRepository
- `createTestAttempt(userId, testId)` — начать попытку
- `submitTestAttempt(attemptId, answers)` — завершить с автоматической проверкой
- `findById(attemptId)` — получить попытку
- `findByUser(userId)` — все попытки пользователя

#### 4.4.4 UserSolutionRepository
- `create(solution)` — сохранить решение
- `findByUser(userId)` — решения пользователя
- `findByTask(taskId)` — решения по задаче

### 4.5 Сервисы

#### 4.5.1 AuthService
- `register(data)` — валидация, проверка уникальности username/email, хеширование bcrypt, создание пользователя, генерация JWT
- `login(data)` — поиск пользователя, проверка пароля, генерация JWT
- `getUserById(id)` — получение пользователя
- `verifyToken(token)` — верификация JWT

### 4.6 Конфигурация

#### 4.6.1 Environment (env.ts)

Все переменные окружения проходят валидацию через Zod:
- `PORT` — порт сервера (по умолч. 3001)
- `DATABASE_URL` — строка подключения к PostgreSQL
- `JWT_SECRET` — секрет для подписи JWT (мин. 32 символа)
- `OPENAI_API_KEY` — ключ OpenAI/OpenRouter
- `GIGACHAT_API_KEY` — ключ GigaChat
- `CLIENT_URL` — URL фронтенда для CORS
- `NODE_ENV` — development/production

#### 4.6.2 База данных (db.ts)

Инициализация Prisma Client как singleton. Функция `checkDatabaseConnection()` для health check.

#### 4.6.3 Логирование (logger.ts)

Winston с двумя транспортами:
- Console (цветной, с метаданными) — в development
- File (JSON-логи) — в production

### 4.7 AI-модуль

Детально описан в разделе [7. Интеграция с AI](#7-интеграция-с-ai).

---

## 5. Клиентская часть (Frontend)

### 5.1 Точка входа и маршрутизация

Файл `App.tsx` определяет маршруты:

| Путь | Компонент | Описание |
|---|---|---|
| `/` | `HomePage` | Лендинг с hero, фичами, примерами |
| `/catalog` | `CatalogPage` | Каталог алгоритмов с поиском и фильтрацией |
| `/algorithms/:id` | `AlgorithmPage` | Детальная страница алгоритма |
| `/algorithms/:id/visualization` | `VisualizationTab` | Визуализация |
| `/algorithms/:id/test` | `TestTab` | Тесты |
| `/algorithms/:id/practice` | `PracticeTab` | Практика |
| `/progress` | `ProgressPage` | Дашборд прогресса |
| `/login` | `LoginPage` | Вход |
| `/register` | `RegisterPage` | Регистрация |
| `/profile` | `ProfilePage` | Личный кабинет |
| `*` | `NotFoundPage` | 404 |

Все маршруты обёрнуты в `AppShell`, который рендерит `Header` и футер.

### 5.2 Глобальное состояние (Zustand store)

#### 5.2.1 Auth Store (stores/auth.ts)

Управление аутентификацией:
- `user: User | null` — текущий пользователь
- `token: string | null` — JWT-токен
- `loading: boolean` — состояние загрузки
- `login(credentials)` — вход, сохранение токена в localStorage (ключ `algo.auth.token`)
- `register(data)` — регистрация
- `logout()` — выход, очистка токена
- `loadUser()` — загрузка пользователя при монтировании приложения (если есть токен)

Токен автоматически подставляется в HTTP-заголовки через axios interceptor.

#### 5.2.2 Progress Store (stores/progress.ts)

Локальный прогресс для анонимных пользователей:
- `bySlug: Record<string, AlgorithmProgress>` — прогресс по slug алгоритма
- `markSection(slug, section, scorePercent)` — отметить раздел пройденным
- `isFullyCompleted(slug)` — проверка полного прохождения

Персистентность через localStorage (ключ `algo.progress.v1`).

#### 5.2.3 Theme Store (stores/theme.ts)

Переключение темы:
- `theme: "light" | "dark"`
- Автоматическое определение системных предпочтений через `prefers-color-scheme`
- Сохранение в localStorage

### 5.3 Страницы

#### 5.3.1 HomePage — Лендинг

Компоненты:
- **HeroSection** — заголовок, подзаголовок, кнопка призыва к действию
- **FeaturesGrid** — сетка функций (интерактивная теория, визуализация, тесты, практика, AI-помощник, прогресс)
- **AlgorithmShowcase** — карточки алгоритмов с быстрым переходом
- **StatsCounters** — анимированные счётчики (количество алгоритмов, модулей, задач)
- **HowItWorks** — шаги работы с платформой
- **CTASection** — призыв зарегистрироваться

#### 5.3.2 CatalogPage — Каталог алгоритмов

Функции:
- **Поиск** — Fuse.js с нечётким поиском по названию и описанию
- **Фильтры** — по категории, сложности
- **Сортировка** — по названию, сложности, прогрессу
- **Toggle** — показать только пройденные
- **AlgorithmCard** — карточка с названием, сложностью, временной/пространственной сложностью, статусом прохождения

#### 5.3.3 AlgorithmPage — Страница алгоритма

Компоновка:
- **Шапка** — название, сложность, временная/пространственная сложность
- **Прогресс-бар** — теория / тест / практика
- **Вкладки (Tabs)**: Теория, Визуализация, Тест, Практика

Вкладки реализованы через `useOutletContext` — передача объекта `algo` дочерним компонентам.

#### 5.3.4 TheoryTab — Вкладка теории

Ключевые функции:
- **Навигация по модулям** — боковая панель с нумерованными модулями
- **Блокировка** — следующий модуль открывается только после прохождения предыдущего
- **AI Quiz** — для каждого модуля генерируется вопрос; нужно ответить правильно на 3 вопроса для прохождения
- **Заметки** — текстовое поле для конспектов, сохраняется в localStorage
- **Прогресс** — каждый пройденный модуль повышает процент

**Детали AI Quiz (`QuizBlock`)**:
- Загрузка вопроса через POST `/theory/:materialId/generate`
- Отображение 4 вариантов ответа в стилизованных radio-кнопках
- Отправка ответа через POST `/theory/:materialId/check` с полями:
  - `is_correct` — правильный ли ответ
  - `question_text` — текст вопроса
  - `selected_answer` — выбранный пользователем вариант
  - `correct_answer` — правильный вариант
  - `previousQuestion` — текст предыдущего вопроса (чтобы AI не повторялся)
- После ответа: подсветка (зелёный/красный), пояснение для каждого варианта
- Кнопка «Следующий вопрос» вручную (пояснение не исчезает автоматически)
- После 3 правильных ответов — модуль пройден, конфетти

#### 5.3.5 VisualizationTab — Визуализация

Детально описано в разделе [9](#9-визуализация-алгоритмов).

#### 5.3.6 TestTab — Тесты

Функции:
- **Старт теста** — создание попытки на сервере
- **Навигация по вопросам** — вопросы разных типов (одиночный выбор, множественный выбор, короткий ответ, сопоставление)
- **Drag-and-drop** — для вопросов на сопоставление (@dnd-kit)
- **Таймер** — отслеживание времени
- **Автопроверка** — при отправке сервер вычисляет баллы
- **Результаты** — сводка правильных/неправильных, пояснения к каждому вопросу

#### 5.3.7 PracticeTab — Практика

Функции:
- **Monaco Editor** — редактор кода с подсветкой 5 языков (JS, Python, Java, C++, Go)
- **Шаблоны кода** — предзаполненный код-заготовка для каждой задачи
- **Выполнение кода**:
  - JavaScript: in-browser Web Worker (песочница с ограничениями)
  - Остальные языки: Piston API (докеризированное выполнение)
- **Трассировка** — пошаговое исполнение с визуализацией (серверная)
- **AI-анализ** — анализ кода через AI с рекомендациями
- **Draft.js / TipTap** — редактор для заметок

#### 5.3.8 ProfilePage — Личный кабинет

Секции:
- **Шапка профиля** — аватар (первая буква имени), username, email, дата регистрации
- **Статистика** — 4 карточки: всего алгоритмов, пройдено, в процессе, средний балл
- **Продолжить обучение** — до 3 алгоритмов в процессе
- **Прогресс по алгоритмам** — список с детальной информацией:
  - Название, иконка, статусы разделов (теория/тест/практика)
  - Прогресс модулей теории (завершённые модули / всего модулей)
  - Статистика AI-тестирования (правильных/неправильных ответов)
  - Общий балл
- **Ещё не начаты** — сетка алгоритмов без прогресса
- **Мои решения** — список отправленных решений с результатами
- **Пройденные алгоритмы** — полностью завершённые алгоритмы

#### 5.3.9 ProgressPage — Дашборд прогресса

- Статистические карточки
- Круговая диаграмма (Recharts PieChart) — распределение по статусам
- Столбчатая диаграмма (Recharts BarChart) — баллы по алгоритмам

#### 5.3.10 LoginPage / RegisterPage — Вход и регистрация

Формы с:
- Валидацией на клиенте (regex для username, email format, длина пароля)
- Отображением ошибок с сервера
- Перенаправлением после успеха

### 5.4 UI-компоненты

Все UI-компоненты находятся в `components/ui/`:

| Компонент | Описание |
|---|---|
| **Button** | Варианты: primary, outline, ghost, danger. Размеры: sm, md, lg. Поддержка loading spinner. |
| **Card** | Card, CardHeader, CardBody, CardFooter, CardTitle, CardDescription |
| **Input / Textarea** | С поддержкой label, error message, hint |
| **Select** | Кастомный select с иконкой |
| **Tabs** | Навигация с активным состоянием |
| **Modal** | Модальное окно с overlay, закрытием по Escape/клику вне |
| **Badge** | Цветовые тона: easy (зелёный), medium (жёлтый), hard (красный), default, info, success, warning, danger |
| **Skeleton** | Плейсхолдер загрузки |
| **EmptyState** | Иконка + заголовок + описание + действие |
| **ErrorBoundary** | React Error Boundary с кнопкой сброса |
| **PageLoader** | Full-page спиннер с опциональным текстом |

### 5.5 API-клиент (lib/api.ts)

Конфигурация Axios:
- `baseURL` — из переменной окружения `VITE_API_URL`
- `timeout` — 30 секунд
- Interceptor запроса: автоподстановка заголовка `Authorization: Bearer <token>` из localStorage
- Interceptor ответа: retry-логика (до 3 попыток при 429/5xx с экспоненциальной задержкой)

### 5.6 Интернационализация (i18n)

- Detector: определение языка браузера
- Файлы: `ru.json` и `en.json` (~150 ключей каждый)
- Использование: `const { t } = useTranslation()` в компонентах

### 5.7 Web Worker

`workers/code-executor.worker.ts` — безопасное выполнение JavaScript-кода в браузере:
- Изоляция через Proxy для отслеживания операций
- Ограничения: 8000 шагов, 5 секунд таймаут
- Запрещённые конструкции: `eval`, `Function`, `import`, `require`, `XMLHttpRequest`
- Трассировка: захват каждой операции с массивом для визуализации

---

## 6. База данных

### 6.1 Выбор СУБД

PostgreSQL 15 выбран по следующим причинам:
- Реляционная модель идеально подходит для структурированных данных с чёткими связями
- Поддержка JSON для гибких полей (тесты, варианты ответов)
- Транзакционная целостность для операций с прогрессом пользователя
- Мощные аналитические запросы через GROUP BY для агрегации статистики

### 6.2 Схема данных

#### 6.2.1 Таблица users

| Поле | Тип | Ограничения | Описание |
|---|---|---|---|
| user_id | SERIAL | PK | Идентификатор |
| username | VARCHAR(100) | UNIQUE, NOT NULL | Имя пользователя (латиница, кириллица, цифры, _) |
| email | VARCHAR(150) | UNIQUE, NOT NULL | Email |
| password_hash | VARCHAR(255) | NOT NULL | Bcrypt-хеш пароля |
| created_at | TIMESTAMP | DEFAULT NOW() | Дата регистрации |
| updated_at | TIMESTAMP | ON UPDATE | Дата обновления |

#### 6.2.2 Таблица algorithms

| Поле | Тип | Описание |
|---|---|---|
| algorithm_id | SERIAL PK | Идентификатор |
| slug | VARCHAR(100) UNIQUE | URL-идентификатор (bubble-sort, insertion-sort, etc.) |
| name | VARCHAR(150) | Название |
| category | VARCHAR(100) | Категория (sorting, searching) |
| difficulty | ENUM('easy','medium','hard') | Сложность |
| description | TEXT | Описание |
| time_complexity | VARCHAR(50) | Временная сложность |
| space_complexity | VARCHAR(50) | Пространственная сложность |

#### 6.2.3 Таблица theory_materials

| Поле | Тип | Описание |
|---|---|---|
| material_id | SERIAL PK | Идентификатор |
| algorithm_id | FK → algorithms | Алгоритм |
| title | VARCHAR(200) | Заголовок модуля |
| content | TEXT | Текст теории (Markdown) |
| type | VARCHAR(50) | Тип (text, code) |
| order_num | INT | Порядок сортировки |
| quiz | JSON? | Опциональный встроенный тест |

#### 6.2.4 Таблица tests

| Поле | Тип | Описание |
|---|---|---|
| test_id | SERIAL PK | Идентификатор |
| algorithm_id | FK → algorithms | Алгоритм |
| title | VARCHAR(200) | Название |
| description | TEXT? | Описание |
| passing_score | INT DEFAULT 70 | Проходной балл (%) |

#### 6.2.5 Таблица questions

| Поле | Тип | Описание |
|---|---|---|
| question_id | SERIAL PK | Идентификатор |
| test_id | FK → tests | Тест |
| question_text | TEXT | Текст вопроса |
| question_type | ENUM('single_choice','multiple_choice','matching','short_answer') | Тип вопроса |
| explanation | TEXT? | Пояснение к ответу |
| correct_answer | TEXT? | Правильный ответ (для short_answer) |

#### 6.2.6 Таблица options

| Поле | Тип | Описание |
|---|---|---|
| option_id | SERIAL PK | Идентификатор |
| question_id | FK → questions | Вопрос |
| option_text | TEXT | Текст варианта |
| is_correct | BOOLEAN | Правильный ли вариант |
| order_num | INT | Порядок |

#### 6.2.7 Таблица tasks

| Поле | Тип | Описание |
|---|---|---|
| task_id | SERIAL PK | Идентификатор |
| algorithm_id | FK → algorithms | Алгоритм |
| material_id | FK → theory_materials? | Связанный модуль (nullable) |
| name | VARCHAR(200) | Название задачи |
| description | TEXT | Условие задачи |
| starter_code | TEXT? | Код-заготовка |
| correct_answer | TEXT? | Эталонное решение |
| tests | JSON[] | Тестовые случаи |
| language | VARCHAR(20) DEFAULT 'javascript' | Язык по умолчанию |

#### 6.2.8 Таблица user_progress

| Поле | Тип | Описание |
|---|---|---|
| progress_id | SERIAL PK | Идентификатор |
| user_id | FK → users | Пользователь |
| algorithm_id | FK → algorithms | Алгоритм |
| theory_completed | BOOLEAN DEFAULT false | Теория пройдена |
| test_completed | BOOLEAN DEFAULT false | Тест пройден |
| practice_completed | BOOLEAN DEFAULT false | Практика пройдена |
| score_percent | INT? | Лучший балл |
| completed_at | TIMESTAMP? | Дата полного завершения |

Уникальный ключ: `(user_id, algorithm_id)`.

#### 6.2.9 Таблица test_attempts

| Поле | Тип | Описание |
|---|---|---|
| attempt_id | SERIAL PK | Идентификатор |
| test_id | FK → tests | Тест |
| user_id | FK → users | Пользователь |
| status | ENUM('in_progress','completed','abandoned') | Статус |
| score | INT | Баллы |
| max_score | INT | Макс. баллы |
| passed | BOOLEAN | Пройден ли |

#### 6.2.10 Таблица user_answers

| Поле | Тип | Описание |
|---|---|---|
| answer_id | SERIAL PK | Идентификатор |
| attempt_id | FK → test_attempts | Попытка |
| question_id | FK → questions | Вопрос |
| answer_text | TEXT | Текст ответа |
| is_correct | BOOLEAN | Правильность |

Уникальный ключ: `(attempt_id, question_id)`.

#### 6.2.11 Таблица user_solutions

| Поле | Тип | Описание |
|---|---|---|
| solution_id | SERIAL PK | Идентификатор |
| user_id | FK → users | Пользователь |
| task_id | FK → tasks | Задача |
| code | TEXT | Код решения |
| language | VARCHAR(20) | Язык |
| score | INT | Оценка |
| is_correct | BOOLEAN | Правильность |

#### 6.2.12 Таблица quiz_attempts

| Поле | Тип | Описание |
|---|---|---|
| attempt_id | SERIAL PK | Идентификатор |
| user_id | FK → users | Пользователь |
| algorithm_id | INT | Алгоритм |
| material_id | INT | Модуль теории |
| question_text | TEXT | Текст вопроса |
| selected_answer | TEXT | Ответ пользователя |
| correct_answer | TEXT | Правильный ответ |
| is_correct | BOOLEAN | Результат |

Индексы: `(user_id, algorithm_id)`, `(user_id, material_id)`.

### 6.3 ER-диаграмма

SQL-скрипт для генерации ER-диаграммы находится в файле `er_diagram.sql`. Он содержит полные DDL с комментариями на русском языке и может быть импортирован в любой инструмент для визуализации схем БД (DBeaver, DataGrip, dbdiagram.io, dbdocs).

---

## 7. Интеграция с AI

### 7.1 Архитектура AI-модуля

AI-модуль реализован с паттерном **Factory + Abstract Provider** для поддержки нескольких AI-провайдеров.

```
┌─────────────────────────────────────────────────┐
│                 AIProviderFactory                │
│  (Circuit Breaker, Provider Fallback, Caching)  │
└─────────────────────────────────────────────────┘
         ▲                    ▲
         │                    │
┌─────────────────┐  ┌─────────────────┐
│  OpenAIProvider  │  │ GigaChatProvider │
│  (OpenRouter)    │  │ (Sberbank)       │
└─────────────────┘  └─────────────────┘
```

### 7.2 Интерфейсы (IAIProvider.ts)

Базовые интерфейсы:

```typescript
interface IAIProvider {
  generateExplanation(prompt: AIPrompt): Promise<AIResponse>;
  generateQuestion(context: QuestionContext): Promise<QuizQuestion>;
  analyzeCode(code: string, language: string): Promise<CodeAnalysis>;
  healthCheck(): Promise<boolean>;
}
```

Типы запросов AI:
- `explain_error` — объяснение ошибки в коде
- `generate_question` — генерация вопроса по теме
- `analyze_code` — анализ кода студента
- `hint` — подсказка к решению

### 7.3 BaseAIProvider

Абстрактный класс, реализующий:
- **Prompt injection sanitization** — фильтрация паттернов в userContent (игнорирование инструкций, системные промпты)
- **Генерация вопросов** — формирование промпта для AI с запросом JSON с вопросом, 4 вариантами и пояснениями (минимум 40 слов на вариант)
- **Анализ кода** — структурированный JSON-ответ с issues, complexity, improvements

### 7.4 Провайдеры

#### 7.4.1 OpenAIProvider
- Использует OpenRouter API (совместимый с OpenAI)
- Retry-логика: 3 попытки при 429 или 5xx с экспоненциальной задержкой
- Системные промпты на русском языке (краткие, без воды)

#### 7.4.2 GigaChatProvider
- Интеграция с Sberbank GigaChat
- OAuth-авторизация с управлением временем жизни токена
- Аналогичная retry-логика

### 7.5 Factory (factory.ts)

```
AIProviderFactory
├── circuitBreaker — отключает провайдера после N ошибок
├── defaultProvider — выбирается по health check
├── generateQuestionWithFallback() — попытка OpenAI → GigaChat → fallback
├── analyzeCodeWithFallback() — попытка OpenAI → GigaChat → fallback
└── analyzeWithBoth() — параллельный запрос к обоим провайдерам
```

**Circuit Breaker pattern:**
- После 5 последовательных ошибок провайдер отключается на 60 секунд
- Автоматическое восстановление после таймаута

### 7.6 Кэширование (cache.ts)

LRU-кэш на основе SHA-256 хеша от (provider + prompt + temperature):
- Максимум 512 записей
- TTL: 1 час
- Ключ: SHA-256(provider + prompt + temperature)
- Кэшируются только explain и analyze, не generate_question (вопросы должны быть уникальными)

### 7.7 Системные промпты

Все промпты краткие (1-3 предложения), без воды:
- **explain_error**: «Объясни ошибку в коде студента кратко, по делу. Только JSON.»
- **generate_question**: «Сгенерируй 1 вопрос по теме с 4 вариантами. В каждом варианте дай развёрнутое объяснение (минимум 40 слов). Формат: { question_text, options: [{ text, is_correct, explanation }] }. Только JSON.»
- **analyze_code**: «Проанализируй код студента. Только JSON: issues, complexity, improvements, summary (1 предложение).»

### 7.8 Сценарии использования AI

1. **Теория: генерация вопроса** — при открытии модуля генерируется вопрос для проверки понимания
2. **Теория: проверка ответа** — при неправильном ответе AI может дать дополнительное пояснение
3. **Тест: генерация вопросов** — AI может сгенерировать дополнительные вопросы для теста
4. **Практика: анализ кода** — AI анализирует код студента, указывает на ошибки и даёт рекомендации
5. **Практика: подсказка** — AI даёт подсказку к решению задачи без готового ответа

---

## 8. Система аутентификации и авторизации

### 8.1 Регистрация

**Валидация (Zod schema `registerSchema`):**
- `username`: строка 3-30 символов, regex `^[a-zA-Z0-9_\u0400-\u04FF]+$` (латиница, кириллица, цифры, подчёркивание)
- `email`: валидный email-адрес
- `password`: строка мин. 8 символов

**Процесс регистрации:**
1. Валидация Zod (если не проходит — 400 Bad Request, пользователь НЕ создаётся)
2. Проверка уникальности username и email в БД
3. Хеширование пароля: bcrypt с cost factor 12
4. Создание пользователя в таблице `users`
5. Генерация JWT с payload: `{ user_id, username, email }`
6. Возврат: `{ user: { user_id, username, email }, token }`

### 8.2 Вход

**Процесс входа:**
1. Поиск пользователя по username или email
2. Сравнение пароля через bcrypt.compare
3. Генерация JWT
4. Возврат: `{ user, token }`

### 8.3 JWT (JSON Web Token)

- **Секрет**: `JWT_SECRET` из .env (мин. 32 символа)
- **Срок действия**: 7 дней
- **Payload**: `{ user_id: number; username: string; email: string }`
- **Хранение на клиенте**: localStorage, ключ `algo.auth.token`
- **Передача**: заголовок `Authorization: Bearer <token>`
- **Верификация**: middleware `verifyToken` декодирует токен и записывает `req.user`

### 8.4 Защита маршрутов

- **server-side**: middleware `requireAuth` для защищённых эндпоинтов (progress, profile, solutions)
- **client-side**: проверка `useAuth().user` в компонентах, редирект на `/login` при отсутствии

### 8.5 Безопасность

- **Пароли**: хешируются bcrypt (cost 12) — медленное хеширование
- **JWT**: подпись HMAC-SHA256, срок действия 7 дней
- **HTTP-заголовки**: Helmet (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
- **Rate limiting**: ограничение на количество запросов с одного IP
- **Валидация**: все входные данные проходят Zod-схемы
- **Prompt injection**: фильтрация вредоносных паттернов перед отправкой к AI

---

## 9. Визуализация алгоритмов

### 9.1 Архитектура визуализации

Визуализация реализована как отдельный движок в `client/src/visualization/`.

```
Visualization Engine
├── AlgorithmEngine (интерфейс)
│   ├── BubbleSortEngine
│   ├── InsertionSortEngine
│   ├── SelectionSortEngine
│   └── BinarySearchEngine
├── AnimationController (play/pause/step/seek)
├── CanvasRenderer (бар-чарты с анимацией)
└── StatsCollector (сравнения, обмены, время)
```

### 9.2 Компоненты движка

#### AlgorithmEngine (базовый интерфейс)
- `generateSteps(array)` — генерирует пошаговую трассировку алгоритма
- `getName()` — название алгоритма

Каждый шаг содержит:
- `array: number[]` — состояние массива
- `type: "compare" | "swap" | "set" | "found" | "not_found" | "pivot" | "range" | "sorted"`
- `indices: number[]` — задействованные индексы
- `note: string` — текстовое описание шага
- `explanation: string` — подробное пояснение

#### AnimationController
- Управление воспроизведением: play, pause, step forward/backward, seek
- Скорость анимации: регулируемая (0.5x — 3x)
- RAF-based (requestAnimationFrame) цикл с интерполяцией
- Автостоп при достижении конца

#### CanvasRenderer
- Рендеринг на HTML5 Canvas
- Бары с градиентной заливкой
- Плавная анимация: lerp (линейная интерполяция) позиций и цветов
- Подсветка активных элементов: синий (сравнение), зелёный (обмен), красный (граница)
- Отображение статистики (сравнения, обмены, время)
- Отображение псевдокода с подсветкой текущей строки

#### StatsCollector
- `comparisons` — количество сравнений
- `swaps` — количество обменов
- `elapsed` — прошедшее время

### 9.3 Реализованные алгоритмы

| Алгоритм | Тип | Сложность |
|---|---|---|
| Пузырьковая сортировка (Bubble Sort) | Сортировка | O(n²) |
| Сортировка вставками (Insertion Sort) | Сортировка | O(n²) |
| Сортировка выбором (Selection Sort) | Сортировка | O(n²) |
| Бинарный поиск (Binary Search) | Поиск | O(log n) |

Каждый engine генерирует массив шагов с пояснениями на русском языке.

### 9.4 Integration Tab (VisualizationTab.tsx)

Компоновка вкладки:
1. **Input Section** — поле ввода массива (например, `[5, 3, 8, 1, 9]`), кнопка «Запустить»
2. **Canvas Section** — бар-чарт с анимацией
3. **Controls** — Play/Pause, Step, Reset, Speed slider
4. **Info Panel** — текущий шаг, статистика, псевдокод
5. **AI Assistant** — кнопка «Объяснить шаг» с интеграцией AI

---

## 10. API endpoints

### 10.1 Полный список эндпоинтов

| Метод | Путь | Аутентификация | Описание |
|---|---|---|---|
| GET | /api/health | Нет | Проверка состояния сервера |
| POST | /api/auth/register | Нет | Регистрация |
| POST | /api/auth/login | Нет | Вход |
| GET | /api/auth/me | Да | Текущий пользователь |
| GET | /api/algorithms | Опционально | Список алгоритмов |
| GET | /api/algorithms/:id | Опционально | Детали алгоритма |
| GET | /api/algorithms/:id/tests | Опционально | Тесты алгоритма |
| GET | /api/tests/:id | Опционально | Детали теста |
| GET | /api/tests/by-algorithm/:algorithmId | Опционально | Тесты по алгоритму |
| POST | /api/tests/:id/submit | Да | Отправка теста |
| POST | /api/tests/:id/attempt | Да | Начать попытку |
| POST | /api/tests/attempt/:id/submit | Да | Завершить попытку |
| GET | /api/tests/attempt/:id | Да | Результат попытки |
| POST | /api/solutions | Да | Отправить решение |
| GET | /api/solutions/task/:taskId | Да | Решения задачи |
| GET | /api/solutions/my | Да | Мои решения |
| GET | /api/progress | Да | Весь прогресс |
| PUT | /api/progress/:algorithmId | Да | Обновить прогресс |
| POST | /api/theory/:materialId/generate | Да | Сгенерировать вопрос |
| POST | /api/theory/:materialId/check | Да | Проверить ответ |
| POST | /api/ai/ask | Да | Запрос к AI |
| POST | /api/ai/explain | Да | Объяснение |
| POST | /api/ai/generate-question | Да | Генерация вопроса |
| POST | /api/ai/analyze-code | Да | Анализ кода |
| POST | /api/ai/analyze-dual | Да | Двойной анализ |
| GET | /api/ai/stats | Да | Статистика AI |
| POST | /api/execute/run | Да | Выполнить код |
| POST | /api/execute/trace | Да | Трассировка |
| GET | /api/docs | Нет | Swagger UI |

### 10.2 Формат ответа

Успешный ответ:
```json
{
  "data": { ... },
  "meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 }
}
```

Ошибка:
```json
{
  "code": "VALIDATION_ERROR",
  "message": "Описание ошибки",
  "statusCode": 400,
  "requestId": "uuid"
}
```

### 10.3 Swagger-документация

OpenAPI 3.0.3 спецификация доступна по адресу `/api/openapi.json`. Swagger UI — `/api/docs`. Спецификация содержит:
- Все эндпоинты с методами и путями
- Схемы запросов и ответов
- Security scheme (Bearer JWT)

---

## 11. Тестирование и качество кода

### 11.1 Статический анализ

- **ESLint** — проверка кода на соответствие стандартам (TypeScript-специфичные правила)
- **Prettier** — автоматическое форматирование
- **TypeScript (`tsc --noEmit`)** — проверка типов

### 11.2 Модульное тестирование

- **Vitest** — фреймворк для тестирования (совместим с Jest API)
- **supertest** — HTTP-тестирование Express-приложения
- **testcontainers** — докеризированные тесты с PostgreSQL

### 11.3 Типы тестов

(Структура готова к написанию):
- Unit-тесты: валидация Zod-схем, утилиты, AI-парсинг
- Integration-тесты: API-эндпоинты с тестовой БД
- E2E-тесты: (планируется)

---

## 12. Заключение

### 12.1 Реализованный функционал

Разработанное веб-приложение представляет собой полноценный электронный учебник по алгоритмам и структурам данных, включающий:

- **Теоретический блок**: 24 модуля по 4 алгоритмам с текстовыми материалами и AI-генерируемыми вопросами
- **Визуализацию**: пошаговая анимация работы алгоритмов на произвольных данных
- **Тестирование**: автоматическая проверка знаний через тесты разных типов
- **Практику**: онлайн-редактор кода с поддержкой 5 языков и выполнением в песочнице
- **AI-помощника**: интеграция с OpenAI и GigaChat для генерации вопросов и анализа кода
- **Систему прогресса**: отслеживание прохождения материала с персистентностью
- **Личный кабинет**: детальная статистика обучения

### 12.2 Использованные технологии

**Backend**: Node.js, Express, TypeScript, Prisma, PostgreSQL, JWT, Zod, Winston, Helmet
**Frontend**: React, TypeScript, Vite, Tailwind CSS, Zustand, Axios, Monaco Editor, Recharts, i18next
**AI**: OpenAI API, GigaChat API, Circuit Breaker, LRU Cache
**Инфраструктура**: Docker, npm workspaces, Swagger

### 12.3 Направления развития

- Добавление новых алгоритмов (быстрая сортировка, сортировка слиянием, BFS, DFS)
- Улучшение AI-генерации с RAG (Retrieval-Augmented Generation)
- Режим соревнований между студентами
- Адаптивное обучение с подбором сложности под уровень студента
- PWA (Progressive Web App) для офлайн-доступа
