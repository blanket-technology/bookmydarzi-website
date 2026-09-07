export default function TypingIndicator({ isAi }: { isAi: boolean }) {
  return (
    <div className="flex items-center gap-2 px-4 py-1.5">
      <span className="text-[11px] font-bold text-muted">
        {isAi ? "BMD Assistant is typing" : "Typing"}
      </span>
      <span className="flex items-center gap-0.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"
            style={{ animationDelay: `${i * 0.12}s` }}
          />
        ))}
      </span>
    </div>
  );
}
