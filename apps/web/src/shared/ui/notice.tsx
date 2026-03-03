interface NoticeProps {
  tone: 'info' | 'error';
  message: string;
}

export function Notice({ tone, message }: NoticeProps) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm ${
        tone === 'error'
          ? 'border-rose-400/40 bg-rose-400/10 text-rose-200'
          : 'border-border/70 bg-panel-soft text-muted'
      }`}
    >
      {message}
    </div>
  );
}
