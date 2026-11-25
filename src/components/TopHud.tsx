import {
  AlertTriangle,
  CheckCircle2,
  Compass,
  RotateCcw,
  Thermometer,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ROOMS } from '../data/factoryLayout';
import type { RoomId } from '../types/game';

interface TopHudProps {
  score: number;
  currentRoom: RoomId;
  roomTemp: number;
  objectiveText: string;
  muted: boolean;
  onToggleMute: () => void;
  onResetCamera: () => void;
  onRestart: () => void;
}

export function TopHud({
  score,
  currentRoom,
  roomTemp,
  objectiveText,
  muted,
  onToggleMute,
  onResetCamera,
  onRestart,
}: TopHudProps) {
  const roomMeta = ROOMS[currentRoom];
  const isManipHot = currentRoom === 'manipulacao' && roomTemp > 16;
  const scoreColor =
    score >= 85 ? 'bg-emerald-600' : score >= 60 ? 'bg-amber-500' : 'bg-red-600';

  return (
    <header className="pointer-events-auto fixed top-0 right-0 left-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-2.5 shadow-sm">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4">
        {/* Title & Current Room */}
        <div className="flex min-w-0 items-center gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold tracking-tight text-slate-900 sm:text-base">
              Fábrica de Embutidos 3D · Rotina Sanitária
            </h1>
            <p className="truncate text-xs text-slate-600">
              <span>{roomMeta.name}</span>
              <span aria-hidden="true"> · </span>
              <span className="font-medium text-sky-700">{objectiveText}</span>
            </p>
          </div>
        </div>

        {/* Metrics & Quick Actions */}
        <div className="flex shrink-0 items-center gap-4">
          {/* Sanitary Compliance Bar */}
          <div className="flex items-center gap-2.5 border-r border-slate-200 pr-4">
            <div className="text-right">
              <div className="text-[11px] font-medium text-slate-500">
                Conformidade Sanitária
              </div>
              <div className="font-mono-tabular flex items-center justify-end gap-1 text-sm font-bold text-slate-900">
                {score >= 80 ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                )}
                <span>{score}%</span>
              </div>
            </div>
            <div className="h-2.5 w-24 overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full transition-all duration-300 ${scoreColor}`}
                style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
              />
            </div>
          </div>

          {/* Ambient Room Temperature */}
          <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
            <Thermometer
              className={`h-4 w-4 ${isManipHot ? 'text-red-600' : 'text-sky-600'}`}
            />
            <div>
              <div className="text-[11px] font-medium text-slate-500">
                Temp. Ambiente
              </div>
              <div
                className={`font-mono-tabular text-sm font-bold ${
                  isManipHot ? 'text-red-600' : 'text-slate-900'
                }`}
              >
                {roomTemp.toFixed(1)} °C
                {isManipHot ? ' (Acima 16°C)' : ''}
              </div>
            </div>
          </div>

          {/* Functional Controls */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onResetCamera}
              title="Recentralizar câmera (C)"
              className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 whitespace-nowrap shrink-0"
            >
              <Compass className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Câmera</span>
            </button>
            <button
              type="button"
              onClick={onToggleMute}
              title={muted ? 'Ativar áudio' : 'Silenciar áudio'}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 transition-colors hover:bg-slate-100 shrink-0"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={onRestart}
              title="Reiniciar turno"
              className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 whitespace-nowrap shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Reiniciar</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
