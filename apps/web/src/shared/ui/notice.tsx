interface NoticeProps {
  tone: 'info' | 'error';
  message: string;
}

export function Notice({ tone, message }: NoticeProps) {
  const isError = tone === 'error';
  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm ${
        isError
          ? 'border-rose-300/55 bg-rose-50/85 text-rose-700 dark:border-rose-500/35 dark:bg-rose-500/12 dark:text-rose-200'
          : 'border-slate-200/85 bg-white/85 text-slate-700 dark:border-slate-700/75 dark:bg-slate-900/55 dark:text-slate-200'
      }`}
      role="status"
      aria-live={isError ? 'assertive' : 'polite'}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${
            isError ? 'bg-rose-500 dark:bg-rose-400' : 'bg-cyan-500 dark:bg-cyan-400'
          }`}
        />
        <span className="line-clamp-2">{message}</span>
      </div>
    </div>
  );
}
