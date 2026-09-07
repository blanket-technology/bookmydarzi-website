"use client";

import { ChevronRight, Package, X } from "lucide-react";
import { getIssueOptionsForStatus } from "@/lib/supportIssues";
import { useChatOpenRequest } from "@/lib/chat/openChat";

// Step-2-of-support picker, ported from react_app/app/support-issue-picker.tsx
// (the mobile app's proven "select order -> select issue -> chat" flow) as a
// modal rather than a separate route, since the website already has the
// order loaded on this page. Selecting an issue opens the same ChatWidget
// every other entry point uses (see lib/chat/openChat.ts), pinned to this
// order and issue category, so the AI/agent on the other end sees the same
// context a mobile customer's chat would carry.
export default function IssueSelectorModal({
  orderId,
  orderCode,
  orderStatus,
  onClose,
}: {
  orderId: number;
  orderCode?: string | null;
  orderStatus: string;
  onClose: () => void;
}) {
  const requestChatOpen = useChatOpenRequest((s) => s.requestOpen);
  const options = getIssueOptionsForStatus(orderStatus);

  const selectIssue = (issueKey: string) => {
    requestChatOpen({ orderId, issueCategory: issueKey });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-sm rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-ink">What&apos;s the issue?</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-ink"
          >
            <X size={17} />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-teal-100 bg-teal-50 px-3.5 py-2.5">
          <Package size={15} className="shrink-0 text-teal-700" />
          <span className="truncate text-xs font-bold text-teal-800">
            {orderCode || `Order #${orderId}`}
          </span>
        </div>

        <div className="mt-4 flex max-h-[50vh] flex-col gap-2 overflow-y-auto">
          {options.length === 0 && (
            <button
              onClick={() => selectIssue("other")}
              className="flex items-center gap-3 rounded-xl border border-black/5 bg-white px-3.5 py-3 text-left transition hover:border-black/10 hover:bg-gray-50"
            >
              <span className="flex-1 text-sm font-bold text-ink">Something else</span>
              <ChevronRight size={16} className="shrink-0 text-gray-300" />
            </button>
          )}
          {options.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.key}
                onClick={() => selectIssue(opt.key)}
                className="flex items-center gap-3 rounded-xl border border-black/5 bg-white px-3.5 py-3 text-left transition hover:border-black/10 hover:bg-gray-50"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-50">
                  <Icon size={17} className="text-teal-700" />
                </span>
                <span className="flex-1 text-sm font-bold text-ink">{opt.label}</span>
                <ChevronRight size={16} className="shrink-0 text-gray-300" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
