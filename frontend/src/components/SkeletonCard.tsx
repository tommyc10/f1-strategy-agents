type Props = {
  lines?: number;
  height?: string;
};

export function SkeletonCard({ lines = 4, height }: Props) {
  return (
    <div
      className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--f1-border)] rounded-2xl overflow-hidden animate-pulse"
      style={height ? { height } : undefined}
    >
      <div className="px-5 py-3 border-b border-[var(--f1-border)]">
        <div className="h-2.5 w-24 bg-[var(--f1-border)] rounded" />
      </div>
      <div className="p-5 space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-2 bg-[var(--f1-border)] rounded"
            style={{ width: `${70 + Math.random() * 30}%` }}
          />
        ))}
      </div>
    </div>
  );
}
