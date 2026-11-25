import {
  AlertTriangle,
  CheckCircle2,
  Droplets,
  Flame,
  Package,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Thermometer,
  Truck,
  X,
} from 'lucide-react';
import type { GameProgress, PpeSelection, StationId } from '../types/game';

interface StationPanelProps {
  open: boolean;
  station: StationId;
  progress: GameProgress;
  completed: Record<StationId, boolean>;
  onClose: () => void;
  onTogglePpe: (key: keyof PpeSelection) => void;
  onBadPpeAttempt: (item: 'adorno' | 'bone') => void;
  onActivateSink: () => void;
  onActivatePediluvio: () => void;
  onMeasureTruck: () => void;
  onRejectBatch: () => void;
  onApproveBatch: () => void;
  onSetAcTarget: (temp: number) => void;
  onSetCureSalt: (level: 'none' | 'ideal' | 'excess') => void;
  onToggleSeasoning: () => void;
  onProcessMeat: () => void;
  onStartOven: () => void;
  onMoveCartToCooling: () => void;
  onPlaceBoxes: (onPallet: boolean) => void;
  onTriggerPpho: () => void;
}

export function StationPanel({
  open,
  station,
  progress,
  completed,
  onClose,
  onTogglePpe,
  onBadPpeAttempt,
  onActivateSink,
  onActivatePediluvio,
  onMeasureTruck,
  onRejectBatch,
  onApproveBatch,
  onSetAcTarget,
  onSetCureSalt,
  onToggleSeasoning,
  onProcessMeat,
  onStartOven,
  onMoveCartToCooling,
  onPlaceBoxes,
  onTriggerPpho,
}: StationPanelProps) {
  if (!open) return null;

  const isDone = completed[station];

  return (
    <div className="pointer-events-none fixed right-0 bottom-20 left-0 z-20 flex justify-center px-3">
      <section className="pointer-events-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white/96 p-4 shadow-lg">
        {/* Panel Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900">
              {station === 'barreira' && '1. Barreira Sanitária e Paramentação'}
              {station === 'doca' && '2. Doca de Recebimento e Inspeção'}
              {station === 'manipulacao' && '3. Sala de Manipulação Climatizada'}
              {station === 'cozimento' && '4. Área de Cozimento e Choque Térmico'}
              {station === 'camara_fria' && '5. Câmara Fria, Estrados e PPHO'}
            </span>
            {isDone && (
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Concluída
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar painel da estação"
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Station 1: Barreira Sanitaria */}
        {station === 'barreira' && (
          <div className="mt-3 space-y-3">
            <div>
              <div className="mb-1.5 text-xs font-semibold text-slate-600">
                1. Selecione apenas os EPIs sanitários corretos (o personagem veste em tempo real):
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(
                  [
                    ['touca', 'Touca Descartável'],
                    ['mascara', 'Máscara Sanitária'],
                    ['botas', 'Botas Brancas'],
                    ['avental', 'Avental Impermeável'],
                  ] as const
                ).map(([key, label]) => {
                  const active = progress.barreira.ppe[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onTogglePpe(key)}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                        active
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{label}</span>
                      {active && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => onBadPpeAttempt('adorno')}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:border-red-300 hover:bg-red-50"
                >
                  <span>Anel e Relógio</span>
                </button>
                <button
                  type="button"
                  onClick={() => onBadPpeAttempt('bone')}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:border-red-300 hover:bg-red-50"
                >
                  <span>Boné de Tecido</span>
                </button>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={onActivateSink}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors ${
                  progress.barreira.sinkDone
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                    : 'border-sky-600 bg-sky-600 text-white hover:bg-sky-700'
                }`}
              >
                <Droplets className="h-4 w-4" />
                <span>
                  {progress.barreira.sinkDone
                    ? 'Mãos Higienizadas (Pia + Álcool 70%)'
                    : 'Acionar Pia com Pedal e Sabão'}
                </span>
              </button>

              <button
                type="button"
                onClick={onActivatePediluvio}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors ${
                  progress.barreira.pediluvioDone
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                    : 'border-sky-600 bg-sky-600 text-white hover:bg-sky-700'
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                <span>
                  {progress.barreira.pediluvioDone
                    ? 'Botas Sanitizadas no Pedilúvio'
                    : 'Passar pelo Pedilúvio Azul'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Station 2: Doca de Recebimento */}
        {station === 'doca' && (
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
              <div>
                <div className="font-bold text-slate-900">
                  {progress.doca.batchIndex === 1
                    ? 'Caminhão Frigorífico · Lote #01 (Matéria-prima Suína)'
                    : 'Caminhão Frigorífico · Lote #02 (Fornecedor Certificado)'}
                </div>
                <div className="mt-0.5 text-slate-600">
                  Limite BPF de recebimento: temperatura ≤ 7,0 °C e Selo de Inspeção Oficial obrigatório.
                </div>
              </div>
              <Truck className="h-5 w-5 text-sky-600" />
            </div>

            {progress.doca.truckState !== 'docked' ? (
              <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-center text-xs font-semibold text-sky-900">
                {progress.doca.truckState === 'departing'
                  ? 'Caminhão irregular fechando portas e deixando a doca...'
                  : 'Novo caminhão frigorífico encostando na doca...'}
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={onMeasureTruck}
                    className="flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-sky-700"
                  >
                    <Thermometer className="h-4 w-4" />
                    <span>Apontar Termômetro 3D para a Carne</span>
                  </button>

                  {progress.doca.thermometerMeasured && (
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span
                        className={`font-mono-tabular font-bold ${
                          progress.doca.batchIndex === 1 ? 'text-red-600' : 'text-emerald-700'
                        }`}
                      >
                        Leitura: {progress.doca.batchIndex === 1 ? '11,2 °C (Acima de 7°C)' : '3,4 °C (Conforme)'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={`font-semibold ${
                          progress.doca.batchIndex === 1 ? 'text-red-600' : 'text-emerald-700'
                        }`}
                      >
                        {progress.doca.batchIndex === 1
                          ? 'Selo Oficial: AUSENTE'
                          : 'Selo Oficial: SIF #0482'}
                      </span>
                    </div>
                  )}
                </div>

                {progress.doca.thermometerMeasured && !progress.doca.batch2Approved && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={onRejectBatch}
                      className="flex items-center justify-center gap-2 rounded-xl border border-red-300 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-800 transition-colors hover:bg-red-100"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      <span>Rejeitar Lote</span>
                    </button>
                    <button
                      type="button"
                      onClick={onApproveBatch}
                      className="flex items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2.5 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-100"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Aprovar e Pesar Lote</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Station 3: Sala de Manipulacao Climatizada */}
        {station === 'manipulacao' && (
          <div className="mt-3 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Climatization */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Climatização da Sala (meta ≤ 16°C)</span>
                  <span
                    className={`font-mono-tabular font-bold ${
                      progress.manipulacao.roomTemp <= 16 ? 'text-sky-700' : 'text-red-600'
                    }`}
                  >
                    {progress.manipulacao.roomTemp.toFixed(1)} °C
                  </span>
                </div>
                <div className="mt-2 flex gap-1.5">
                  {[12, 14, 18].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => onSetAcTarget(t)}
                      className={`font-mono-tabular flex-1 rounded-lg border py-1.5 text-xs font-semibold transition-colors ${
                        progress.manipulacao.acTargetTemp === t
                          ? 'border-sky-600 bg-sky-600 text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {t}°C
                    </button>
                  ))}
                </div>
              </div>

              {/* Cure salt & seasoning */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-semibold text-slate-700">
                  Dosagem de Sal de Cura (Nitrito/Nitrato)
                </div>
                <div className="mt-2 flex gap-1.5">
                  {(
                    [
                      ['none', '0 g/kg'],
                      ['ideal', '2,5 g/kg (Ideal)'],
                      ['excess', '12 g/kg'],
                    ] as const
                  ).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => onSetCureSalt(val)}
                      className={`flex-1 rounded-lg border px-1.5 py-1.5 text-[11px] font-semibold transition-colors ${
                        progress.manipulacao.cureSaltLevel === val
                          ? 'border-sky-600 bg-sky-600 text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={onToggleSeasoning}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors ${
                  progress.manipulacao.seasoningAdded
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                    : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Snowflake className="h-4 w-4 text-sky-600" />
                <span>
                  {progress.manipulacao.seasoningAdded
                    ? 'Condimentos e Gelo Adicionados'
                    : 'Adicionar Condimentos e Gelo Escama'}
                </span>
              </button>

              <button
                type="button"
                onClick={onProcessMeat}
                disabled={progress.manipulacao.processed}
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors ${
                  progress.manipulacao.processed
                    ? 'bg-emerald-600 text-white'
                    : 'bg-sky-600 text-white hover:bg-sky-700'
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  {progress.manipulacao.processed
                    ? 'Moagem e Embutimento Concluídos'
                    : 'Acionar Moedor e Embutideira'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Station 4: Area de Cozimento / Estufa */}
        {station === 'cozimento' && (
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div>
                <div className="text-xs font-semibold text-slate-700">
                  Termômetro do Centro Térmico do Produto
                </div>
                <div className="text-[11px] text-slate-500">
                  Aguarde atingir ≥ 72,0 °C na estufa antes de mover para o tanque de choque térmico.
                </div>
              </div>
              <div className="font-mono-tabular text-xl font-extrabold text-slate-900">
                <span
                  className={
                    progress.cozimento.coreTemp >= 72
                      ? 'text-emerald-600'
                      : progress.cozimento.heatingStarted
                        ? 'text-amber-600'
                        : 'text-sky-700'
                  }
                >
                  {progress.cozimento.coreTemp.toFixed(1)} °C
                </span>
              </div>
            </div>

            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full transition-all duration-200 ${
                  progress.cozimento.coreTemp >= 72 ? 'bg-emerald-600' : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(100, (progress.cozimento.coreTemp / 80) * 100)}%` }}
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={onStartOven}
                disabled={progress.cozimento.heatingStarted || progress.cozimento.cooledOk}
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors ${
                  progress.cozimento.heatingStarted
                    ? 'border border-amber-300 bg-amber-50 text-amber-900'
                    : 'bg-amber-600 text-white hover:bg-amber-700'
                }`}
              >
                <Flame className="h-4 w-4" />
                <span>
                  {progress.cozimento.heatingStarted
                    ? 'Estufa Aquecendo...'
                    : 'Iniciar Cozimento na Estufa'}
                </span>
              </button>

              <button
                type="button"
                onClick={onMoveCartToCooling}
                disabled={progress.cozimento.cooledOk}
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors ${
                  progress.cozimento.cooledOk
                    ? 'bg-emerald-600 text-white'
                    : 'bg-sky-600 text-white hover:bg-sky-700'
                }`}
              >
                <Snowflake className="h-4 w-4" />
                <span>
                  {progress.cozimento.cooledOk
                    ? 'Choque Térmico Concluído'
                    : 'Mover Carrinho para Resfriamento'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Station 5: Camara Fria & PPHO */}
        {station === 'camara_fria' && (
          <div className="mt-3 space-y-3">
            <div className="text-xs text-slate-600">
              Escolha onde empilhar as caixas rotuladas (ou clique diretamente nos estrados azuis / piso na cena 3D):
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => onPlaceBoxes(true)}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors ${
                  progress.camara_fria.boxesStackedOnPallets
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                    : 'border-sky-600 bg-sky-600 text-white hover:bg-sky-700'
                }`}
              >
                <Package className="h-4 w-4" />
                <span>
                  {progress.camara_fria.boxesStackedOnPallets
                    ? 'Caixas Empilhadas sobre Estrados (15 cm)'
                    : 'Empilhar sobre Estrados Plásticos'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onPlaceBoxes(false)}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:border-red-300 hover:bg-red-50"
              >
                <AlertTriangle className="h-4 w-4 text-slate-500" />
                <span>Colocar Direto no Piso</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onTriggerPpho}
              disabled={!progress.camara_fria.boxesStackedOnPallets}
              className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-colors ${
                progress.camara_fria.boxesStackedOnPallets
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'cursor-not-allowed bg-slate-200 text-slate-500'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span>Acionar Modo Higienização PPHO e Finalizar Auditoria</span>
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
