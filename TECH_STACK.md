# Технологический стек — «Алгоритмы и структуры данных»

Дипломный проект студентки Абдулатиповой А.З. (ИСПк-402-52-00)

---

## 1. Языки / Runtime

| Технология | Версия | Назначение |
|---|---|---|
| Node.js | >=20 LTS | Серверный runtime |
| TypeScript | 5.6.x (server) / 5.5.x (client) | Типизация full-stack |
| HTML5 | — | Разметка |
| CSS3 + CSS Custom Properties | — | Стилизация (светлая/тёмная тема) |

---

## 2. Фронтенд

| Технология | Версия | Назначение |
|---|---|---|
| React | ^18.3.1 | UI-библиотека |
| React DOM | ^18.3.1 | Рендеринг в DOM |
| Vite | ^5.4.6 | Сборщик и dev-сервер |
| TypeScript | ^5.5.4 | Типизация |
| Tailwind CSS | ^3.4.10 | Utility-first CSS-фреймворк |
| PostCSS | ^8.4.47 | Обработка CSS |
| Autoprefixer | ^10.4.20 | Вендорные префиксы |
| shadcn/ui | — | UI-компоненты на CSS-переменных |
| Zustand | ^4.5.5 | Управление состоянием |
| React Router DOM | ^6.26.2 | Клиентская маршрутизация |
| Axios | ^1.7.7 | HTTP-клиент |
| i18next | ^23.15.1 | Интернационализация (ru/en) |
| react-i18next | ^15.0.2 | React-биндинги для i18next |
| i18next-browser-languagedetector | ^8.0.0 | Автоопределение языка |

### UI / Визуализация

| Технология | Версия | Назначение |
|---|---|---|
| Lucide React | ^0.451.0 | Иконки |
| Recharts | ^2.12.7 | Графики и диаграммы (прогресс) |
| Monaco Editor (@monaco-editor/react) | ^4.6.0 | Редактор кода |
| Тiptap (react + starter-kit + ext-link + ext-placeholder) | ^2.6.6 | Rich-text редактор (теория) |
| HTML5 Canvas API | — | Визуализация алгоритмов |
| canvas-confetti | ^1.9.3 | Анимация (конфетти при успехе) |
| react-hot-toast | ^2.4.1 | Всплывающие уведомления |
| @dnd-kit/core + @dnd-kit/sortable | ^6.1.0 / ^8.0.0 | Drag-and-drop для упражнений |
| Fuse.js | ^7.0.0 | Нечёткий поиск по каталогу |
| clsx | ^2.1.1 | Условное объединение классов |
| tailwind-merge | ^2.5.2 | Разрешение конфликтов Tailwind |

### Web Workers / Изоляция кода

| Технология | Назначение |
|---|---|
| Web Worker API | Запуск кода студента в песочнице |
| SharedArrayBuffer | Передача данных между потоками |
| Atomics.wait | Таймаут выполнения (5 с) |
| Proxy + AST-парсинг | Трассировка операций (сравнения, обмены) |

---

## 3. Бэкенд

| Технология | Версия | Назначение |
|---|---|---|
| Express | ^4.21.1 | HTTP-фреймворк |
| TypeScript | ^5.6.3 | Типизация |
| tsx | ^4.19.1 | Запуск TS в dev-режиме (watch) |
| dotenv | ^16.4.5 | Переменные окружения |
| compression | ^1.7.4 | Сжатие gzip/deflate |
| cookie-parser | ^1.4.7 | Парсинг кук |
| cors | ^2.8.5 | CORS-заголовки |
| helmet | ^8.0.0 | Security-заголовки (COOP/COEP) |
| express-rate-limit | ^7.4.1 | Rate limiting (100/15min + 20/min AI) |
| winston | ^3.15.0 | Структурированное логирование |
| lru-cache | ^11.0.2 | Кэш ответов AI (1000 записей, 1 час TTL) |

### Аутентификация

| Технология | Версия | Назначение |
|---|---|---|
| jsonwebtoken | ^9.0.2 | JWT-токены (7 дней TTL) |
| bcrypt | ^5.1.1 | Хеширование паролей (10 раундов) |

### Валидация

| Технология | Версия | Назначение |
|---|---|---|
| Zod | ^3.23.8 | Схемы валидации (env, request body, params) |

---

## 4. База данных

| Технология | Версия | Назначение |
|---|---|---|
| PostgreSQL | 15 | Реляционная БД |
| Prisma (ORM) | ^5.22.0 | ORM + CLI |
| @prisma/client | ^5.22.0 | Сгенерированный клиент |
| Prisma Studio | — | GUI для БД |

### Модели данных (Prisma)

`User`, `Algorithm`, `TheoryMaterial`, `Test`, `Question`, `Option`, `Task`, `UserProgress`, `TestAttempt`, `UserAnswer`, `UserSolution`, `AIFeedback`

---

## 5. Искусственный интеллект

| Технология | Назначение |
|---|---|
| OpenAI GPT-4o-mini | Основной AI-провайдер (генерация подсказок, вопросов, ревью кода) |
| GigaChat (Sber, GigaChat:latest) | Резервный AI-провайдер |
| AI Provider Factory (Strategy + Factory) | Абстракция выбора провайдера с health-check |
| Circuit Breaker (3 ошибки → изоляция на 60 с) | Failover-механизм |
| LRU Cache (1000 записей, TTL 1 ч) | Снижение затрат на AI (~40%) |

---

## 6. Docker / Инфраструктура

| Технология | Назначение |
|---|---|
| Docker (>=24) | Контейнеризация |
| Docker Compose v2 (spec 3.8) | Оркестрация сервисов |
| postgres:15-alpine | Образ БД |
| node:20-alpine | Образ Node.js |
| dumb-init | Обработка сигналов в контейнере |
| Multi-stage build | Сервер: builder → production |
| Named volume (pgdata) | Персистентность БД |

---

## 7. CI/CD (GitHub Actions)

| Этап | Инструменты |
|---|---|
| Lint + Typecheck | ESLint + tsc --noEmit |
| Unit-тесты | Vitest + @vitest/coverage-v8 + Testcontainers |
| Сборка | tsc (server) + Vite build (client) |
| E2E-тесты | Playwright + Chromium + Docker Compose |
| Деплой | Docker → Docker Hub → SSH (appleboy/ssh-action) |

---

## 8. Тестирование

| Технология | Версия | Назначение |
|---|---|---|
| Vitest | ^2.1.3 | Runner + assertion |
| @vitest/coverage-v8 | ^2.1.3 | Покрытие кода (порог: 70%) |
| Supertest | ^7.0.0 | HTTP-тестирование Express |
| Testcontainers | ^10.13.2 | Контейнеры для тестов |
| Playwright | — | E2E-тесты (Chromium) |
| Grafana k6 | — | Нагрузочное тестирование (100 RPS, p95 < 2 с) |

---

## 9. Качество кода

| Технология | Версия | Назначение |
|---|---|---|
| ESLint | ^8.57.x | Линтер |
| @typescript-eslint/parser | ^7-8.x | TS-парсер ESLint |
| @typescript-eslint/eslint-plugin | ^7-8.x | TS-правила ESLint |
| eslint-plugin-react-hooks | ^4.6.2 | Правила для хуков React |
| eslint-plugin-react-refresh | ^0.4.12 | HMR-safe exports |
| Prettier | ^3.3.3 | Форматирование кода |

---

## 10. Инструменты сборки и запуска

| Технология | Версия | Назначение |
|---|---|---|
| npm Workspaces | — | Монорепозиторий (server + client) |
| concurrently | ^9.0.1 | Параллельный запуск dev-серверов |
| tsc | — | Компиляция TypeScript |
| Vite | ^5.4.6 | Dev-сервер + production bundle |
| tsx | ^4.19.1 | Запуск .ts (dev, seed) |

---

## 11. Внешние API

| Сервис | Назначение |
|---|---|
| OpenAI API | AI-функции (чат, код, вопросы) |
| GigaChat API (Сбер) | Резервный AI-провайдер |
| Piston API (codex.lol) | Запуск кода на 5+ языках (JS, Python, Java, C++, Go) |
| Swagger UI (/api/docs) | Документация REST API |
| Google Fonts (Inter, JetBrains Mono) | Шрифты |

---

## 12. Плагины и утилиты

| Технология | Назначение |
|---|---|
| OpenAPI 3.0.3 | Inline-спецификация API |
| OpenCode AI Factory | Agent Skills (более 30) |
| shadcn/ui theme | Светлая/тёмная тема через Tailwind class |
| Atomic Design | Архитектура компонентов |
