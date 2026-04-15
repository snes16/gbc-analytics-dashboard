import { MetricCard } from "@/components/metric-card";
import { OrdersChart } from "@/components/orders-chart";
import { getDashboardData } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

function formatMoney(value: number): string {
  return `${new Intl.NumberFormat("ru-RU").format(value)} ₸`;
}

export default async function HomePage() {
  let dashboard;

  try {
    dashboard = await getDashboardData();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return (
      <main className="page">
        <section className="panel">
          <h1>GBC Analytics Dashboard</h1>
          <p className="subtitle">Ошибка загрузки данных из Supabase.</p>
          <pre className="error-box">{message}</pre>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="panel">
        <div className="panel-head">
          <div>
            <h1>GBC Analytics Dashboard</h1>
            <p className="subtitle">
              Заказы из RetailCRM, синхронизированные в Supabase
            </p>
          </div>
          <span className="badge">Порог уведомлений: 50 000 ₸</span>
        </div>

        <div className="metrics-grid">
          <MetricCard
            label="Всего заказов"
            value={dashboard.totalOrders.toString()}
            hint="Синхронизировано в таблицу orders"
          />
          <MetricCard
            label="Общая выручка"
            value={formatMoney(dashboard.totalRevenue)}
          />
          <MetricCard
            label="Средний чек"
            value={formatMoney(dashboard.averageCheck)}
          />
          <MetricCard
            label="Заказы > 50 000 ₸"
            value={dashboard.highValueOrders.toString()}
            hint="Кандидаты для Telegram-уведомлений"
          />
        </div>
      </section>

      <section className="panel">
        <h2>Динамика заказов и выручки</h2>
        <OrdersChart data={dashboard.daily} />
      </section>

      <section className="panel panel-split">
        <div>
          <h2>Топ городов</h2>
          {dashboard.topCities.length === 0 ? (
            <p className="subtitle">Данные появятся после первой синхронизации.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Город</th>
                  <th>Заказы</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.topCities.map((row) => (
                  <tr key={row.city}>
                    <td>{row.city}</td>
                    <td>{row.orders}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div>
          <h2>Последние заказы</h2>
          {dashboard.orders.length === 0 ? (
            <p className="subtitle">Таблица пуста.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Клиент</th>
                  <th>Город</th>
                  <th>Сумма</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.orders.slice(-7).reverse().map((order) => (
                  <tr key={order.id}>
                    <td>{order.number}</td>
                    <td>{order.customer_name ?? "—"}</td>
                    <td>{order.city ?? "—"}</td>
                    <td>{formatMoney(order.total_sum)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}
