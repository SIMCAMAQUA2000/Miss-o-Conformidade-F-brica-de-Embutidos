import { Award, CheckCircle2, RotateCcw, ShieldAlert } from 'lucide-react';
import { ROOMS, ROOM_ORDER } from '../data/factoryLayout';
import type { AuditEntry, StationId } from '../types/game';

interface AuditModalProps {
  score: number;
  completedStations: Record<StationId, boolean>;
  auditLog: AuditEntry[];
  onRestart: () => void;
}

export function AuditModal({
  score,
  completedStations,
  auditLog,
  onRestart,
}: AuditModalProps) {
  const errors = auditLog.filter((e) => e.type === 'error');
  const verdict =
    score >= 90
      ? { label: 'Excelência Sanitária BPF', tone: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' }
      : score >= 70
        ? { label: 'Conforme com Ressalvas', tone: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' }
        : { label: 'Não Conforme · Necessita Reciclagem', tone: 'text-red-700', bg: 'bg-red-50 border-red-200' };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/55 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="text-xs font-semibold text-sky-700">
              Relatório Final de Auditoria do Turno
            </div>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              Inspeção Sanitária Concluída
            </h2>
          </div>

          <div className={`rounded-xl border px-4 py-2.5 text-right ${verdict.bg}`}>
            <div className="text-[11px] font-medium text-slate-600">
              Índice de Conformidade
            </div>
            <div className={`font-mono-tabular text-2xl font-extrabold ${verdict.tone}`}>
              {score}%
            </div>
            <div className={`text-xs font-semibold ${verdict.tone}`}>{verdict.label}</div>
          </div>
        </div>

        {/* Checklist of the 5 areas */}
        <div className="mt-5">
          <h3 className="text-xs font-semibold text-slate-500">
            Etapas do Fluxo Sanitário Contínuo
          </h3>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {ROOM_ORDER.map((id) => {
              const done = completedStations[id];
              return (
                <div
                  key={id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
                >
                  <span className="font-medium text-slate-800">{ROOMS[id].name}</span>
                  <span className="flex items-center gap-1 font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {done ? 'Conforme' : 'Pendente'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Errors / Infractions vs Clean Record */}
        <div className="mt-5">
          <h3 className="text-xs font-semibold text-slate-500">
            Ocorrências de Boas Práticas de Fabricação ({errors.length})
          </h3>
          {errors.length === 0 ? (
            <div className="mt-2 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-900">
              <Award className="h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <div className="font-bold">Zero Não Conformidades Registradas</div>
                <p className="mt-0.5 text-emerald-800">
                  Fluxo sanitário sem cruzamento, barreira higiênica completa, rejeição de lote irregular, controle térmico rigoroso e PPHO executado com sucesso.
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-2 max-h-44 space-y-2 overflow-y-auto pr-1">
              {errors.map((err) => (
                <div
                  key={err.id}
                  className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-950"
                >
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 font-bold">
                      <span>{err.title}</span>
                      <span className="font-mono-tabular text-red-700">{err.deltaScore}%</span>
                    </div>
                    <p className="mt-0.5 text-red-800">{err.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={onRestart}
            className="flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reiniciar Turno</span>
          </button>
        </div>
      </div>
    </div>
  );
}
