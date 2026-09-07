"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, ChevronLeft, ChevronRight, CheckCheck, Lock } from "lucide-react";
import { apiClient, ClientApiError } from "@/lib/apiClient";
import { useAuth } from "@/lib/useAuth";
import { useNotificationsWS } from "@/lib/useNotificationsWS";

// Mirrors app/api/v1/endpoints/notifications.py::_notification_dict and
// app/schemas/notification.py::NotificationResponseSchema /
// NotificationListResponse (bmd repo) field-for-field.
interface NotificationItem {
  id: number;
  title: string;
  body: string;
  type: string;
  priority: string;
  deep_link: string | null;
  data: Record<string, unknown> | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

interface NotificationListResponse {
  notifications: NotificationItem[];
  total: number;
  unread_count: number;
  page: number;
  limit: number;
}

const PAGE_SIZE = 20;

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** deep_link is NOT a URL - it's a screen-name token from the backend's
 * notification policy (app/services/notifications/policy.py), e.g.
 * "order_details" / "pickup_details" / "delivery_details" /
 * "support_conversation", meant for the mobile app's own internal router.
 * The real target (an order id, a chat session id, ...) lives in `data`.
 * Map the customer-relevant tokens to real website routes here; anything
 * else (staff-only tokens like "refund_approval", "support_queue", or a
 * token/data shape we don't recognize) safely resolves to no navigation -
 * the notification still gets marked read either way. */
function resolveNotificationPath(
  deepLink: string | null,
  data: Record<string, unknown> | null,
): string | null {
  const orderId = data && typeof data.order_id === "number" ? data.order_id : null;
  switch (deepLink) {
    case "order_details":
    case "pickup_details":
    case "delivery_details":
    case "progress_gallery":
    case "payment_details":
    case "payment_retry":
      return orderId != null ? `/orders/${orderId}` : null;
    default:
      return null;
  }
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
      <span className="px-3 text-sm font-bold text-ink">
        Page {page} of {totalPages}
      </span>
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

function NotificationCard({
  notification,
  onOpen,
}: {
  notification: NotificationItem;
  onOpen: (n: NotificationItem) => void;
}) {
  const hasTarget = resolveNotificationPath(notification.deep_link, notification.data) != null;

  return (
    <button
      onClick={() => onOpen(notification)}
      className={`group flex w-full items-start gap-4 rounded-3xl border p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl ${
        notification.is_read
          ? "border-black/5 bg-white"
          : "border-gold/30 bg-cream-deep"
      }`}
    >
      <span
        className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
          notification.is_read ? "bg-transparent" : "bg-gold-deep"
        }`}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 className={`text-base ${notification.is_read ? "font-bold" : "font-black"} text-ink`}>
            {notification.title}
          </h2>
          <span className="shrink-0 text-xs font-semibold text-muted">
            {formatDate(notification.created_at)}
          </span>
        </div>
        <p className="mt-1.5 text-sm leading-6 text-muted">{notification.body}</p>
        <span className="mt-2.5 inline-block rounded-full bg-cream px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-gold-deep">
          {notification.type.replace(/_/g, " ")}
        </span>
      </div>
      {hasTarget && (
        <ChevronRight
          size={16}
          className="mt-1 shrink-0 text-gray-300 transition group-hover:translate-x-1 group-hover:text-ink"
        />
      )}
    </button>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user, checked, fetchSession } = useAuth();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<NotificationListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    if (!checked) fetchSession();
  }, [checked, fetchSession]);

  const load = useCallback(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiClient<NotificationListResponse>(`/notifications?page=${page}&limit=${PAGE_SIZE}`)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ClientApiError ? err.message : "Couldn't load notifications.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, page]);

  useEffect(() => {
    const cleanup = load();
    return cleanup;
  }, [load]);

  // Live refresh while viewing page 1 (the newest notifications) - a
  // customer sitting on this page previously had no way to see a new
  // notification arrive without manually reloading. Deliberately does NOT
  // refetch while browsing a later page, so an arrival doesn't reshuffle
  // pagination out from under them mid-scroll.
  useNotificationsWS(
    !!user && page === 1,
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleOpen = async (notification: NotificationItem) => {
    if (!notification.is_read) {
      // Optimistic local update so the dot/badge react immediately.
      setData((prev) =>
        prev
          ? {
              ...prev,
              unread_count: Math.max(0, prev.unread_count - 1),
              notifications: prev.notifications.map((n) =>
                n.id === notification.id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n,
              ),
            }
          : prev,
      );
      try {
        await apiClient(`/notifications/${notification.id}/read`, { method: "PATCH" });
      } catch {
        // Non-fatal - worst case the item shows unread again on next load.
      }
    }
    const path = resolveNotificationPath(notification.deep_link, notification.data);
    if (path) {
      router.push(path);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await apiClient<{ message: string; updated: number }>("/notifications/read-all", { method: "POST" });
      setData((prev) =>
        prev
          ? {
              ...prev,
              unread_count: 0,
              notifications: prev.notifications.map((n) => ({ ...n, is_read: true })),
            }
          : prev,
      );
    } catch {
      // Leave state as-is; user can retry.
    } finally {
      setMarkingAll(false);
    }
  };

  if (checked && !user) {
    return (
      <main className="mx-auto max-w-5xl px-5 py-20 text-center lg:px-8">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gray-100">
          <Lock size={26} className="text-gray-400" />
        </span>
        <h1 className="mt-6 text-3xl font-black">Sign in to view your notifications</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-500">
          Order updates, payment confirmations and support replies show up here once you&apos;re signed in.
        </p>
        <Link
          href="/login?redirect=/notifications"
          className="mt-8 inline-flex rounded-xl bg-ink px-6 py-3.5 text-sm font-bold text-white shadow-lg hover:-translate-y-0.5"
        >
          Log in
        </Link>
      </main>
    );
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <main className="mx-auto max-w-5xl px-5 py-12 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.2em] text-gold-deep">Account</p>
          <h1 className="mt-2 text-4xl font-black">Notifications</h1>
        </div>
        {data && data.unread_count > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-bold hover:bg-gray-50 disabled:opacity-50"
          >
            <CheckCheck size={15} /> {markingAll ? "Marking..." : "Mark all read"}
          </button>
        )}
      </div>

      <div className="mt-8">
        {(loading && !data) || !checked ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-3xl bg-gray-100" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-100 bg-red-50 p-6 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : data && data.notifications.length === 0 ? (
          <div className="flex flex-col items-center rounded-3xl border border-black/5 bg-white px-6 py-16 text-center">
            <Bell size={32} className="text-gray-300" />
            <p className="mt-4 text-base font-bold">No notifications yet</p>
            <p className="mt-1 text-sm text-gray-500">
              We&apos;ll let you know here when there&apos;s something new about your orders.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {data?.notifications.map((n) => (
              <NotificationCard key={n.id} notification={n} onOpen={handleOpen} />
            ))}
          </div>
        )}
      </div>

      {data && data.notifications.length > 0 && (
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      )}
    </main>
  );
}
