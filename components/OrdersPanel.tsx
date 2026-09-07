"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, PackageSearch } from "lucide-react";
import { apiClient, ClientApiError } from "@/lib/apiClient";
import { getOrderStatusMeta, STATUS_TONE_CLASSES } from "@/lib/orderStatus";
import type { CustomerOrderListItem, PaginatedOrderList } from "@/lib/types/account";

type Tab = "active" | "completed" | "cancelled";

const TABS: { key: Tab; label: string }[] = [
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const PAGE_SIZE = 10;

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatAmount(price: number): string {
  return `₹${Math.round(price).toLocaleString("en-IN")}`;
}

function OrderCard({ order }: { order: CustomerOrderListItem }) {
  const meta = getOrderStatusMeta(order.status);
  const dateLabel = order.completed_at
    ? formatDate(order.completed_at)
    : order.cancelled_at
      ? formatDate(order.cancelled_at)
      : order.created_at
        ? formatDate(order.created_at)
        : "-";

  return (
    <Link
      href={`/orders/${order.order_id}`}
      className="group block rounded-3xl border border-black/5 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-gray-400">
            {order.order_code ?? `ORD${order.order_id}`} · {dateLabel}
          </p>
          <h2 className="mt-2 text-xl font-black">{order.service_name ?? "Tailoring service"}</h2>
          {order.category_name && <p className="mt-1 text-sm text-gray-500">{order.category_name}</p>}
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${STATUS_TONE_CLASSES[meta.tone]}`}>
          {meta.customerLabel}
        </span>
      </div>
      <div className="mt-6 flex items-center justify-between border-t border-black/5 pt-4">
        <span className="text-lg font-black">{formatAmount(order.price)}</span>
        <span className="flex items-center gap-1 text-sm font-bold text-gray-700 group-hover:text-gold-deep">
          View details <ChevronRight size={16} />
        </span>
      </div>
    </Link>
  );
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages: (number | "ellipsis")[] = [];
  const add = (p: number) => pages.push(p);
  add(1);
  if (page > 3) pages.push("ellipsis");
  for (let p = Math.max(2, page - 1); p <= Math.min(totalPages - 1, page + 1); p++) add(p);
  if (page < totalPages - 2) pages.push("ellipsis");
  if (totalPages > 1) add(totalPages);

  return (
    <div className="mt-8 flex items-center justify-center gap-1.5">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="grid h-9 w-9 place-items-center rounded-lg border border-black/10 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Previous page"
      >
        <ChevronLeft size={15} />
      </button>
      {pages.map((p, i) =>
        p === "ellipsis" ? (
          <span key={`e${i}`} className="px-1 text-sm text-gray-400">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`h-9 min-w-9 rounded-lg px-2.5 text-sm font-bold transition ${
              p === page ? "bg-ink text-white" : "border border-black/10 text-ink hover:bg-cream-deep"
            }`}
          >
            {p}
          </button>
        ),
      )}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="grid h-9 w-9 place-items-center rounded-lg border border-black/10 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Next page"
      >
        <ChevronRight size={15} />
      </button>
    </div>
  );
}

export default function OrdersPanel() {
  const [tab, setTab] = useState<Tab>("active");
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState<CustomerOrderListItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiClient<PaginatedOrderList<CustomerOrderListItem>>(
      `/customer/orders/${tab}?page=${page}&limit=${PAGE_SIZE}`,
    )
      .then((res) => {
        if (cancelled) return;
        setOrders(res.items ?? []);
        setTotal(res.total ?? 0);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ClientApiError ? err.message : "Couldn't load your orders.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tab, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const changeTab = (t: Tab) => {
    setTab(t);
    setPage(1);
    setOrders(null);
  };

  return (
    <div>
      <div className="flex gap-2 border-b border-black/5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => changeTab(t.key)}
            className={`rounded-t-xl px-4 py-3 text-sm font-bold transition ${
              tab === t.key ? "border-b-2 border-ink text-ink" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {loading && (
          <div className="space-y-4">
            {[0, 1].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-3xl bg-gray-100" />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-3xl border border-red-100 bg-red-50 p-6 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && orders && orders.length === 0 && (
          <div className="flex flex-col items-center rounded-3xl border border-black/5 bg-white px-6 py-16 text-center">
            <PackageSearch size={32} className="text-gray-300" />
            <p className="mt-4 text-base font-bold">No {tab} orders</p>
            <p className="mt-1 text-sm text-gray-500">
              {tab === "active"
                ? "Once you book a service, it'll show up here."
                : `You have no ${tab} orders yet.`}
            </p>
            {tab === "active" && (
              <Link
                href="/services"
                className="mt-6 rounded-xl bg-ink px-5 py-3 text-sm font-bold text-white hover:-translate-y-0.5"
              >
                Browse services
              </Link>
            )}
          </div>
        )}

        {!loading && !error && orders && orders.map((o) => <OrderCard key={o.order_id} order={o} />)}
      </div>

      {!loading && !error && orders && orders.length > 0 && (
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      )}
    </div>
  );
}
