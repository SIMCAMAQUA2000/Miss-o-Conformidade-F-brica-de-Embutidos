import { CheckCircle2, Info, ShieldAlert, X } from 'lucide-react';
import type { FeedbackBanner } from '../types/game';

interface FeedbackToastProps {
  banner: FeedbackBanner | null;
  onDismiss: () => void;
}

export function FeedbackToast({ banner, onDismiss }: FeedbackToastProps) {
  if (!banner) return null;

  const isError = banner.type === 'error';
  const isSuccess = banner.type === 'success';

  const containerStyle = isError
    ? 'border-red-300 bg-red-50 text-red-950'
    : isSuccess
      ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
      : 'border-sky-300 bg-sky-50 text-sky-950';

  const Icon = isError ? ShieldAlert : isSuccess ? CheckCircle2 : Info;
  const iconColor = isError
    ? 'text-red-600'
    : isSuccess
      ? 'text-emerald-600'
      : 'text-sky-600';

  return (
    <div className="pointer-events-none fixed top-20 right-4 left-4 z-30 flex justify-center">
      <div
        role="alert"
        className={`pointer-events-auto flex max-w-xl items-start gap-3 rounded-xl border px-4 py-3 shadow-md ${containerStyle}`}
      >
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconColor}`} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold">{banner.title}</div>
          <p className="mt-0.5 text-xs leading-relaxed opacity-90">{banner.message}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Fechar aviso"
          className="rounded-md p-1 opacity-70 transition-opacity hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
