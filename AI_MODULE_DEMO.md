## Разработка модуля интеграции AI-провайдеров

В рамках дипломного проекта был разработан модуль для взаимодействия с AI-провайдерами, который обеспечивает генерацию учебных материалов, анализ кода студентов и интеллектуальную помощь в обучении.

Архитектура модуля построена на паттерне «Фабрика» (Factory) и «Стратегия» (Strategy). Это позволяет абстрагироваться от конкретного провайдера и легко переключаться между ними без изменения бизнес-логики приложения.

Система поддерживает двух провайдеров: **OpenAI GPT-4o-mini** (основной) и **GigaChat от Сбера** (резервный). Реализован механизм Circuit Breaker: после трёх последовательных ошибок провайдер изолируется на 60 секунд, после чего попытки возобновляются. Для снижения затрат на API-запросы используется LRU-кэш на 1000 записей с TTL 1 час.

Каждый запрос проходит через health-check. Если основной провайдер недоступен, автоматически выполняется fallback на резервный.

### Пример подключения GigaChat (TypeScript)

```typescript
import axios from "axios";
import https from "node:https";

export class GigaChatProvider {
  private token: string | null = null;
  private tokenExpiresAt = 0;

  async getAccessToken(clientId: string, clientSecret: string): Promise<string> {
    if (this.token && this.tokenExpiresAt > Date.now() + 60000) {
      return this.token;
    }

    const res = await axios.post(
      "https://ngw.devices.sberbank.ru:9443/api/v2/oauth",
      new URLSearchParams({ scope: "GIGACHAT_API_PERS" }),
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
          RqUID: crypto.randomUUID(),
        },
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      }
    );

    this.token = res.data.access_token;
    this.tokenExpiresAt = res.data.expires_at;
    return this.token;
  }

  async generateExplanation(
    prompt: string,
    clientId: string,
    clientSecret: string
  ): Promise<string> {
    const token = await this.getAccessToken(clientId, clientSecret);

    const res = await axios.post(
      "https://gigachat.devices.sberbank.ru/api/v1/chat/completions",
      {
        model: "GigaChat:latest",
        messages: [
          { role: "system", content: "Ты — педагог по алгоритмам и структурам данных." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 300,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      }
    );

    return res.data.choices[0].message.content;
  }
}
```

**Принцип работы:** Провайдер получает OAuth-токен с помощью client_id и client_secret, кэширует его до истечения срока, затем отправляет запрос с промптом в чат-модель GigaChat и возвращает сгенерированный ответ. Self-signed сертификаты GigaChat обрабатываются через `https.Agent` с `rejectUnauthorized: false`.

Аналогично реализован провайдер для OpenAI, что позволяет системе автоматически переключаться между ними в случае недоступности одного из сервисов.
