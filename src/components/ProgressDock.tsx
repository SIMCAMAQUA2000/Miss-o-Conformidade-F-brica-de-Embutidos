import { CheckCircle2, ChevronDown, ChevronUp, Lock, MapPin } from 'lucide-react';
import { ROOMS, ROOM_ORDER } from '../data/factoryLayout';
import type { RoomId, StationId } from '../types/game';

interface ProgressDockProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  currentRoom: RoomId;
  completedStations: Record<StationId, boolean>;
  activeStation: StationId;
  panelOpen: boolean;
  onSelectRoom: (room: RoomId) => void;
  onOpenCurrentStation: () => void;
}

export function ProgressDock({
  collapsed,
  onToggleCollapse,
  currentRoom,
  completedStations,
  activeStation,
  panelOpen,
  onSelectRoom,
  onOpenCurrentStation,
}: ProgressDockProps) {
  return (
    <div className="pointer-events-none fixed right-0 bottom-3 left-0 z-20 flex flex-col items-center px-3">
      {/* Collapse Toggle + Quick Open Station Button */}
      <div className="pointer-events-auto mb-1.5 flex items-center gap-2">
        {!panelOpen && (
          <button
            type="button"
            onClick={onOpenCurrentStation}
            className="flex items-center gap-1.5 rounded-lg border border-sky-700 bg-sky-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-sky-700 whitespace-nowrap shrink-0"
          >
            <MapPin className="h-3.5 w-3.5" />
            <span>Interagir: {ROOMS[currentRoom].shortName}</span>
          </button>
        )}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white/95 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
        >
          {collapsed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          <span>{collapsed ? 'Mostrar Roteiro' : 'Recolher'}</span>
        </button>
      </div>

      {!collapsed && (
        <div className="pointer-events-auto w-full max-w-[920px] rounded-xl border border-slate-200 bg-white/95 px-3 py-2.5 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {ROOM_ORDER.map((roomId, idx) => {
                const meta = ROOMS[roomId];
                const done = completedStations[roomId];
                const isHere = currentRoom === roomId;
                const isTarget = activeStation === roomId;
                const prevDone = idx === 0 || completedStations[ROOM_ORDER[idx - 1]];
                const locked = !done && !prevDone && roomId !== 'doca' && roomId !== 'barreira';

                return (
                  <button
                    key={roomId}
                    type="button"
                    onClick={() => onSelectRoom(roomId)}
                    className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      isHere
                        ? 'border-sky-600 bg-sky-50 text-sky-900'
                        : done
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                          : isTarget
                            ? 'border-sky-300 bg-white text-slate-800 hover:bg-slate-50'
                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    ) : locked ? (
                      <Lock className="h-3.5 w-3.5 text-slate-400" />
                    ) : (
                      <span className="font-mono-tabular text-[11px] font-bold text-sky-700">
                        {meta.order}.
                      </span>
                    )}
                    <span>{meta.shortName}</span>
                  </button>
                );
              })}
            </div>

            <div className="text-[11px] text-slate-500">
              Clique no chão ou use WASD/Setas · Arraste para girar câmera
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
