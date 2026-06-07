export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Algorithms Textbook API",
    version: "1.0.0",
    description:
      "REST API для электронного учебника «Алгоритмы и структуры данных»",
  },
  servers: [
    { url: "http://localhost:3001/api", description: "Development" },
    { url: "https://algorithms.example.com/api", description: "Production" },
  ],
  tags: [
    { name: "Auth" },
    { name: "Algorithms" },
    { name: "Tests" },
    { name: "Solutions" },
    { name: "AI" },
    { name: "Progress" },
    { name: "Admin" },
    { name: "Health" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              code: { type: "string" },
              message: { type: "string" },
              statusCode: { type: "integer" },
              details: {},
              requestId: { type: "string" },
            },
            required: ["code", "message", "statusCode"],
          },
        },
      },
      User: {
        type: "object",
        properties: {
          user_id: { type: "integer" },
          username: { type: "string" },
          email: { type: "string" },
          role: { type: "string", enum: ["student", "teacher", "admin"] },
        },
      },
      AuthResponse: {
        type: "object",
        properties: {
          user: { $ref: "#/components/schemas/User" },
          token: { type: "string" },
          expiresIn: { type: "string" },
        },
      },
      Algorithm: {
        type: "object",
        properties: {
          algorithm_id: { type: "integer" },
          slug: { type: "string" },
          name: { type: "string" },
          category: { type: "string" },
          difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
          description: { type: "string" },
          time_complexity: { type: "string" },
          space_complexity: { type: "string" },
        },
      },
      PaginatedAlgorithms: {
        type: "object",
        properties: {
          data: { type: "array", items: { $ref: "#/components/schemas/Algorithm" } },
          meta: {
            type: "object",
            properties: {
              page: { type: "integer" },
              limit: { type: "integer" },
              total: { type: "integer" },
              totalPages: { type: "integer" },
            },
          },
        },
      },
    },
  },
  paths: {
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Регистрация пользователя",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["username", "email", "password"],
                properties: {
                  username: { type: "string", minLength: 3, maxLength: 100 },
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "OK" },
          409: { description: "Email/username уже заняты" },
          422: { description: "Ошибка валидации" },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Авторизация",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthResponse" },
              },
            },
          },
          401: { description: "Неверные учётные данные" },
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Текущий пользователь",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "OK" } },
      },
    },
    "/algorithms": {
      get: {
        tags: ["Algorithms"],
        summary: "Список алгоритмов с фильтрацией",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 12, maximum: 100 } },
          { name: "category", in: "query", schema: { type: "string" } },
          { name: "difficulty", in: "query", schema: { type: "string", enum: ["easy", "medium", "hard"] } },
          { name: "search", in: "query", schema: { type: "string" } },
        ],
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PaginatedAlgorithms" },
              },
            },
          },
        },
      },
    },
    "/algorithms/{id}": {
      get: {
        tags: ["Algorithms"],
        summary: "Детали алгоритма",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "OK" }, 404: { description: "Не найден" } },
      },
    },
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Проверка работоспособности",
        responses: { 200: { description: "OK" } },
      },
    },
  },
} as const;
