# Тестовое задание — AI Tools Specialist

Репозиторий реализует полный pipeline:

1. Импорт `mock_orders.json` в RetailCRM
2. Синхронизация заказов из RetailCRM в Supabase
3. Веб-дашборд (Next.js) с графиком заказов и выручки
4. Telegram-уведомления для новых заказов свыше `50 000 ₸`
5. Автозапуск sync/notify по расписанию через Vercel Cron

## Стек

- Next.js 16 + TypeScript
- Supabase (`orders`, `sync_state`)
- RetailCRM API v5
- Telegram Bot API
- Vercel Cron

## Структура

- `src/app/page.tsx` — дашборд
- `src/app/api/cron/sync/route.ts` — cron endpoint sync
- `src/app/api/cron/notify/route.ts` — cron endpoint notify
- `src/lib/server/jobs/sync-retailcrm.ts` — ядро sync-логики
- `src/lib/server/jobs/notify-high-value.ts` — ядро notify-логики
- `scripts/import-mock-to-retailcrm.ts` — загрузка `mock_orders.json` в RetailCRM
- `scripts/sync-retailcrm-to-supabase.ts` — ручной запуск sync
- `scripts/check-high-value-orders.ts` — ручной запуск notify
- `supabase/schema.sql` — SQL-схема
- `vercel.json` — расписание cron-задач

## Быстрый запуск

### 1) Установить зависимости

```bash
npm install
```

### 2) Настроить env

Скопируй `.env.example` в `.env.local` и заполни:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

RETAILCRM_BASE_URL=...
RETAILCRM_API_KEY=...
RETAILCRM_SITE=...

TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
HIGH_VALUE_THRESHOLD=50000

CRON_SECRET=...
```

### 3) Создать таблицы в Supabase

Выполни SQL из `supabase/schema.sql` в Supabase SQL Editor.

### 4) Импортировать тестовые заказы в RetailCRM

```bash
npm run import:retailcrm
```

### 5) Синхронизировать RetailCRM -> Supabase

```bash
npm run sync:retailcrm
```

### 6) Проверить Telegram-уведомления вручную

```bash
npm run notify:telegram
```

### 7) Запустить дашборд локально

```bash
npm run dev
```

Открой: [http://localhost:3000](http://localhost:3000)

## Деплой на Vercel

1. Импортируй репозиторий в Vercel.
2. Добавь все переменные окружения из `.env.local` в `Project Settings -> Environment Variables`.
3. Обязательно добавь `CRON_SECRET`.
4. Нажми Deploy.

## Cron в Vercel

Расписание задаётся в `vercel.json`:

- `0 3 * * *` -> `/api/cron/sync`
- `20 3 * * *` -> `/api/cron/notify`

Это UTC-время. Для `Europe/Kaliningrad` это `06:00` и `06:20`.

Оба endpoint защищены заголовком `Authorization: Bearer <CRON_SECRET>`.
Vercel добавляет его автоматически при настроенном `CRON_SECRET`.

## Какие промпты давал AI-инструмент

1. «Изучи README и реализуй pipeline RetailCRM -> Supabase -> Dashboard + Telegram alerts»
2. «Сделай рабочие скрипты импорта/синка/уведомлений и проверь на реальных данных»
3. «Добавь автозапуск через Vercel Cron с защитой CRON_SECRET»
4. «Проверь build/lint и обнови README с runbook»

## Где застрял и как решил

1. Проблема: `next build` падал из-за BOM в `package.json` и `tsconfig.json`.
   Решение: переписал файлы в UTF-8 без BOM.
2. Проблема: исходный payload `mock_orders.json` не принимался RetailCRM (`Order is not loaded`).
   Решение: добавил sanitize payload перед отправкой в `orders/create`.
3. Проблема: в Next 16 команда `next lint` не работает как отдельный subcommand.
   Решение: заменил lint-скрипт на `eslint .`.

## Проверка

- `npm run build` — успешно
- `npm run lint` — успешно
- `npm run import:retailcrm` — успешно (50/50)
- `npm run sync:retailcrm` — успешно
- `npm run notify:telegram` — успешно