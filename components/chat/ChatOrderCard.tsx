import { getOrderStatusMeta, STATUS_TONE_CLASSES } from "@/lib/orderStatus";

export interface ChatOrderCardData {
  order_code: string | null;
  status: string;
  status_label: string;
  amount: number;
  issue_category: string | null;
}

/** Compact order-summary card attached to the AI's first reply on a
 * session the customer pinned to an order - lets them see the order's
 * real status/amount inline in chat instead of only in prose, mirroring
 * the order card the customer app already shows above its chat screen. */
export default function ChatOrderCard({ data }: { data: ChatOrderCardData }) {
  const meta = getOrderStatusMeta(data.status);
  return (
    <div className="mb-1 max-w-[78%] rounded-2xl border border-black/5 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-black text-ink">{data.order_code ?? "Order"}</span>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_TONE_CLASSES[meta.tone]}`}>
          {data.status_label}
        </span>
      </div>
      <div className="mt-1.5 flex items-center justify-between text-xs text-gray-500">
        <span className="font-semibold">
          {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
            data.amount,
          )}
        </span>
        {data.issue_category ? <span className="font-medium">{data.issue_category.replace(/_/g, " ")}</span> : null}
      </div>
    </div>
  );
}
