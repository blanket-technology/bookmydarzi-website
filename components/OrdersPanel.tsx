"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CalendarClock, ChevronLeft, ChevronRight, PackageSearch, Shirt } from "lucide-react";
import { apiClient, ClientApiError } from "@/lib/apiClient";
import { getOrderStatusMeta, STATUS_TONE_CLASSES } from "@/lib/orderStatus";
import { useNotificationsWS } from "@/lib/useNotificationsWS";
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
  const dateVerb = order.completed_at ? "Completed" : order.cancelled_at ? "Cancelled" : "Placed";
  const isCancelled = !!order.cancelled_at;

  return (
    <Link
      href={`/orders/${order.order_id}`}
      className="group flex gap-4 rounded-3xl border border-black/5 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-xl sm:p-5"
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-cream sm:h-24 sm:w-24">
        {order.thumbnail ? (
          <Image
            src={order.thumbnail}
            alt={order.service_name ?? "Order"}
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-gray-300">
            <Shirt size={26} />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-gray-400">
              {order.order_code ?? `ORD${order.order_id}`} · {dateVerb} {dateLabel}
            </p>
            <h2 className="mt-1 truncate text-lg font-black sm:text-xl">
              {order.service_name ?? "Tailoring service"}
            </h2>
            {order.category_name && (
              <p className="mt-0.5 truncate text-sm text-gray-500">{order.category_name}</p>
            )}
          </div>
          <span
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${STATUS_TONE_CLASSES[meta.tone]}`}
          >
            {meta.customerLabel}
          </span>
        </div>

        {isCancelled && order.reason ? (
          <p className="mt-2 line-clamp-1 text-xs font-medium text-red-600">Reason: {order.reason}</p>
        ) : order.expected_delivery_date && !order.completed_at && !isCancelled ? (
          <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-gray-500">
            <CalendarClock size={13} className="text-gold-deep" />
            Expected by {formatDate(order.expected_delivery_date)}
          </p>
        ) : null}

        <div className="mt-3 flex items-center justify-between border-t border-black/5 pt-3 sm:mt-4 sm:pt-4">
          <span className="text-base font-black sm:text-lg">{formatAmount(order.price)}</span>
          <span className="flex items-center gap-1 text-sm font-bold text-gray-700 group-hover:text-gold-deep">
            View details <ChevronRight size={16} />
          </span>
        </div>
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

  // Live status updates: an order changing status server-side (admin panel
  // action) can also move it between tabs (e.g. active -> completed/
  // cancelled), so a targeted single-row patch isn't enough here - just
  // silently re-fetch the current tab/page on any order_update event. No
  // setLoading/setError here on purpose - a background refresh shouldn't
  // flash the skeleton or clobber a good render with a transient hiccup.
  // See app/orders/[id]/page.tsx's identical wiring for the single-order
  // detail view.
  useNotificationsWS(
    true,
    useCallback(
      (n) => {
        if (n.type !== "order_update") return;
        apiClient<PaginatedOrderList<CustomerOrderListItem>>(
          `/customer/orders/${tab}?page=${page}&limit=${PAGE_SIZE}`,
        )
          .then((res) => {
            setOrders(res.items ?? []);
            setTotal(res.total ?? 0);
          })
          .catch(() => {
            // Silent - the next live event or a manual tab/page change retries.
          });
      },
      [tab, page],
    ),
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const changeTab = (t: Tab) => {
    setTab(t);
    setPage(1);
    setOrders(null);
  };

  return (
    <div>
      <div className="flex gap-1 rounded-2xl bg-cream p-1 sm:inline-flex sm:gap-2 sm:bg-transparent sm:p-0 sm:border-b sm:border-black/5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => changeTab(t.key)}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 sm:flex-none sm:rounded-t-xl sm:rounded-b-none sm:py-3 ${
              tab === t.key
                ? "bg-white text-ink shadow-sm sm:bg-transparent sm:border-b-2 sm:border-ink sm:shadow-none"
                : "text-gray-500 hover:text-gray-700 sm:text-gray-400 sm:hover:text-gray-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {loading && (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[104px] animate-pulse rounded-3xl bg-gray-100 sm:h-[120px]" />
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
