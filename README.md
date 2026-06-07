# Электронный учебник «Алгоритмы и структуры данных»

> Дипломный проект студентки Абдулатиповой А.З. (ИСПк-402-52-00)

Веб-приложение для интерактивного изучения алгоритмов сортировки и поиска с визуализацией, тестированием, практическими задачами и ИИ-поддержкой.

## 🚀 Технологический стек

**Frontend:** React 18, TypeScript 5, Vite 5, Tailwind CSS 3, shadcn/ui, Monaco Editor, Canvas API, Zustand  
**Backend:** Node.js 20 LTS, Express 4, TypeScript, Prisma 5  
**Database:** PostgreSQL 15  
**AI:** OpenAI GPT-4o-mini + GigaChat (Sber) с circuit-breaker failover  
**Auth:** JWT (jsonwebtoken) + bcrypt  
**Tests:** Vitest, Playwright, k6  
**Deploy:** Docker, Docker Compose, GitHub Actions

## 📋 Системные требования

- **Node.js** ≥ 20 LTS
- **Docker** ≥ 24 + Docker Compose v2
- **RAM** ≥ 4 ГБ
- **Свободное место** ≥ 5 ГБ

## ⚙️ Установка и запуск

### 1. Клонирование

```bash
git clone <repo-url>
cd algorithms-textbook
```

### 2. Настройка переменных окружения

```bash
# Корень — для docker-compose
cp .env.example .env

# Backend
cp server/.env.example server/.env
```

Сгенерируйте JWT_SECRET:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Вставьте значение в оба `.env` файла.

Получите API-ключи:
- **OpenAI:** <https://platform.openai.com/api-keys>
- **GigaChat:** <https://developers.sber.ru/portal/products/gigachat>

### 3. Запуск через Docker (рекомендуется)

```bash
docker-compose up -d
docker-compose logs -f server
```

Дождитесь выполнения миграций. Если сиды не применились автоматически:

```bash
docker-compose exec server npx prisma db seed
```

### 4. Запуск локально (без Docker)

```bash
# Установить PostgreSQL 15 локально, создать БД algorithms_db
# Обновить DATABASE_URL в server/.env

# Установить зависимости
npm install

# Миграции и сиды
npm run db:migrate
npm run db:seed

# Запустить dev-серверы (клиент + сервер параллельно)
npm run dev
```

## 🌐 Доступные URL

| Сервис | URL | Описание |
|--------|-----|----------|
| Клиент | <http://localhost> (Docker) / <http://localhost:5173> (dev) | Веб-интерфейс |
| API | <http://localhost:3001/api> | REST API |
| Swagger UI | <http://localhost:3001/api/docs> | Документация API |
| Health check | <http://localhost:3001/api/health> | Проверка работоспособности |
| Prisma Studio | <http://localhost:5555> | GUI для БД (`npm run db:studio`) |

## 👤 Учётные данные по умолчанию

После сидов создаётся администратор:

| Поле | Значение |
|------|----------|
| Username | `admin` |
| Email | `admin@example.com` |
| Password | `admin123` |
| Role | `admin` |

⚠️ **Смените пароль перед деплоем в production!**

## 📚 Содержимое (после сидов)

- **4 алгоритма:** bubble-sort, insertion-sort, selection-sort, binary-search
- **24 теоретических блока** (6 на алгоритм)
- **~30 вопросов** для тестирования (5–10 на алгоритм)
- **4 практические задачи** с эталонными решениями

## 🧪 Тестирование

```bash
# Backend unit-тесты
npm run test --workspace=server

# С покрытием
npm run test:coverage --workspace=server

# E2E (Playwright)
npm run test:e2e

# Нагрузочное (k6)
docker run -i grafana/k6 run - <tests/load/k6-script.js
```

## 🛠 Скрипты

```bash
npm run dev              # Параллельный запуск client + server
npm run build            # Production-сборка
npm run lint             # ESLint
npm run typecheck        # TypeScript
npm run db:migrate       # Применить миграции
npm run db:seed          # Загрузить тестовые данные
npm run db:studio        # Открыть Prisma Studio
npm run db:reset         # Сбросить БД (удалит все данные!)
```

## 📁 Структура проекта

```
algorithms-textbook/
├── server/                  # Backend (Express + Prisma)
│   ├── src/
│   │   ├── config/          # Конфигурация (env, logger, db)
│   │   ├── controllers/     # HTTP-обработчики (thin)
│   │   ├── services/        # Бизнес-логика
│   │   ├── repositories/    # Доступ к данным (Prisma)
│   │   ├── middleware/      # auth, rate-limit, error-handler
│   │   ├── routes/          # Маршрутизация
│   │   ├── validators/      # Zod-схемы
│   │   ├── ai/              # AI Service Layer
│   │   │   ├── interfaces/
│   │   │   ├── providers/   # OpenAI, GigaChat
│   │   │   ├── factory.ts   # Circuit breaker
│   │   │   └── cache.ts     # LRU cache
│   │   ├── types/           # TypeScript типы
│   │   ├── utils/           # Хелперы
│   │   └── index.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── tests/               # Vitest
│   ├── Dockerfile
│   └── package.json
│
├── client/                  # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/      # Atomic Design
│   │   ├── pages/           # Страницы (роуты)
│   │   ├── hooks/           # React-хуки
│   │   ├── stores/          # Zustand state
│   │   ├── services/        # API clients (axios)
│   │   ├── workers/         # Web Workers
│   │   ├── visualization/   # Canvas-рендер алгоритмов
│   │   ├── i18n/            # Локализация (ru.json)
│   │   ├── types/
│   │   └── App.tsx
│   ├── public/
│   ├── Dockerfile
│   └── package.json
│
├── .github/
│   └── workflows/
│       └── ci.yml           # CI/CD pipeline
│
├── docker-compose.yml       # Оркестрация контейнеров
├── .env.example
├── package.json             # Workspaces root
└── README.md
```

## 🛡 Безопасность

- **JWT** для stateless-аутентификации (TTL 7 дней)
- **bcrypt** для хеширования паролей (10 раундов)
- **helmet** для security headers (включая COOP/COEP для SharedArrayBuffer)
- **CORS** с whitelist через `CLIENT_URL`
- **Rate limiting:** 100 req/15min на IP, 20 req/min на `/api/ai/*`
- **Web Worker + AST-парсинг** для безопасного выполнения кода студентов
- **Белый список API:** Math, Array, Object, Number, String, console.log
- **Таймаут 5 секунд** через Atomics.wait + SharedArrayBuffer

## 🤖 ИИ-абстракция

Система поддерживает двух провайдеров с автоматическим failover:

1. **OpenAI GPT-4o-mini** (primary) — `$0.15/1M input`, `$0.60/1M output`
2. **GigaChat** (fallback) — русскоязычный контекст, бесплатный лимит

Логика выбора (`AIProviderFactory`):
- Health-check перед каждым запросом
- Circuit breaker: после 3 ошибок — изоляция на 60 секунд
- LRU-кэш (1000 записей, TTL 1 час) — снижает затраты на ~40%

## 📊 Нагрузочное тестирование

Целевые метрики (требование ТЗ — 100 одновременных пользователей):

- **p95 latency** < 2 секунд
- **Error rate** < 1%
- **RPS** > 50

## 📄 Лицензия

Дипломный проект. © 2026 Абдулатипова А.З.

## 🤝 Контакты

Вопросы по проекту — через Issue tracker.
