interface StarterChip {
  label: string;
  value: string;
}

const ORDER_STARTERS: StarterChip[] = [
  { label: "Track my order", value: "Can you track my order?" },
  { label: "Cancellation & refund policy", value: "What is your cancellation and refund policy?" },
  { label: "Reschedule pickup", value: "I want to reschedule my pickup" },
  { label: "Payment methods", value: "Do you accept Cash on Delivery?" },
];

const GENERAL_STARTERS: StarterChip[] = [
  { label: "Track my order", value: "Can you track my order?" },
  { label: "Cancellation & refund policy", value: "What is your cancellation and refund policy?" },
  { label: "Payment methods", value: "What payment methods do you accept?" },
  { label: "Delivery timelines", value: "How long does stitching/delivery usually take?" },
];

/** Starter prompts shown on the empty chat greeting, before the customer has
 * typed anything - same pattern as Zomato/Amazon's pre-filled quick
 * questions. Tapping one sends it exactly like a typed message (same
 * handleSend used by the message-bubble quick-reply chips), so there's no
 * separate send path to keep in sync. */
export default function StarterChips({
  hasOrderContext,
  onSelect,
}: {
  hasOrderContext: boolean;
  onSelect: (value: string) => void;
}) {
  const chips = hasOrderContext ? ORDER_STARTERS : GENERAL_STARTERS;
  return (
    <div className="mt-4 flex flex-wrap justify-center gap-2 px-2">
      {chips.map((chip) => (
        <button
          key={chip.label}
          type="button"
          onClick={() => onSelect(chip.value)}
          className="rounded-full border-2 border-ink/15 px-3.5 py-1.5 text-xs font-bold text-ink transition hover:border-ink/30 hover:bg-gray-50"
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
