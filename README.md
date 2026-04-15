# Тестовое задание — AI Tools Specialist

Репозиторий реализует полный pipeline:

1. Импорт `mock_orders.json` в RetailCRM
2. Синхронизация заказов из RetailCRM в Supabase
3. Веб-дашборд (Next.js) с графиком заказов и выручки
4. Telegram-уведомления для новых заказов свыше `50 000 ₸`

## Стек

- Next.js 16 + TypeScript
- Supabase (таблицы `orders`, `sync_state`)
- RetailCRM API v5
- Telegram Bot API

## Структура

- `src/app/page.tsx` — дашборд
- `scripts/import-mock-to-retailcrm.ts` — загрузка `mock_orders.json` в RetailCRM
- `scripts/sync-retailcrm-to-supabase.ts` — перенос заказов из RetailCRM в Supabase
- `scripts/check-high-value-orders.ts` — отправка Telegram-уведомлений
- `supabase/schema.sql` — SQL-схема

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
```

### 3) Создать таблицы в Supabase

Выполни SQL из файла `supabase/schema.sql` в SQL Editor проекта Supabase.

### 4) Импортировать тестовые заказы в RetailCRM

```bash
npm run import:retailcrm
```

### 5) Синхронизировать RetailCRM -> Supabase

```bash
npm run sync:retailcrm
```

### 6) Запустить дашборд локально

```bash
npm run dev
```

Открой: [http://localhost:3000](http://localhost:3000)

### 7) Проверить Telegram-уведомления

```bash
npm run notify:telegram
```

Скрипт отправит сообщения только по новым заказам (по `sync_state.last_notified_order_id`) и только если сумма заказа >= `HIGH_VALUE_THRESHOLD`.

## Деплой на Vercel

1. Импортируй репозиторий в Vercel.
2. Добавь все переменные окружения из `.env.local` в Project Settings -> Environment Variables.
3. Нажми Deploy.

## Что нужно от CRM для полного запуска

Минимум, который нужен от тебя по RetailCRM:

1. `RETAILCRM_BASE_URL` (например `https://demo123.retailcrm.ru`)
2. `RETAILCRM_API_KEY`
3. `RETAILCRM_SITE` (код магазина, например `demo`)

Для полной автоматизации уведомлений дополнительно:

4. Подтверждение, что API-ключ имеет доступ к заказам (чтение/создание)
5. При желании webhook-сценарий: публичный URL и событие `order create` в RetailCRM

## Какие промпты давал AI-инструмент

1. «Изучи README и реализуй pipeline RetailCRM -> Supabase -> Dashboard + Telegram alerts»
2. «Создай SQL-схему для orders/sync_state и подготовь скрипты импорта/синка/уведомлений»
3. «Сделай дашборд на Next.js с графиком заказов из Supabase и метриками»
4. «Проверь build/lint, исправь типизацию и совместимость»

## Где застрял и как решил

1. Проблема: `next build` падал из-за BOM в `package.json` и `tsconfig.json`.
   Решение: переписал файлы в UTF-8 без BOM.
2. Проблема: в Next 16 команда `next lint` не работает как отдельный subcommand.
   Решение: заменил lint-скрипт на прямой `eslint .`.
3. Проблема: строгая типизация `recharts` tooltip и индексных типов TS.
   Решение: привёл formatter к безопасной типизации и поправил типы в `src/lib/types.ts`.

## Проверка

- `npm run build` — успешно
- `npm run lint` — успешно