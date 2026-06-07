# Multi-stage Dockerfile для Node.js 20 + Express
# Stage 1: build
FROM node:20-alpine AS builder

WORKDIR /app

# Копируем файлы зависимостей
COPY package*.json ./
COPY prisma ./prisma/

# Устанавливаем все зависимости (включая devDependencies для сборки)
RUN npm ci

# Копируем исходный код
COPY tsconfig.json ./
COPY src ./src

# Генерируем Prisma Client
RUN npx prisma generate

# Сборка TypeScript
RUN npm run build

# Удаляем dev-зависимости
RUN npm prune --production

# Stage 2: production
FROM node:20-alpine AS production

# Устанавливаем dumb-init для корректной обработки сигналов
RUN apk add --no-cache dumb-init

WORKDIR /app

# Копируем production-зависимости
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./

# Создаём non-root пользователя
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3001

# Graceful shutdown через dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
