import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sfx } from './audio/sfx';
import { AuditModal } from './components/AuditModal';
import { FeedbackToast } from './components/FeedbackToast';
import { ProgressDock } from './components/ProgressDock';
import { StationPanel } from './components/StationPanel';
import { TopHud } from './components/TopHud';
import { ROOMS } from './data/factoryLayout';
import { FactoryScene } from './three/FactoryScene';
import type {
  AuditEntry,
  FeedbackBanner,
  GameProgress,
  PpeSelection,
  RoomId,
  StationId,
} from './types/game';

function createInitialProgress(): GameProgress {
  return {
    barreira: {
      ppe: { touca: false, mascara: false, botas: false, avental: false },
      sinkDone: false,
      pediluvioDone: false,
    },
    doca: {
      batchIndex: 1,
      thermometerMeasured: false,
      batch1Rejected: false,
      batch2Approved: false,
      truckState: 'docked',
    },
    manipulacao: {
      roomTemp: 18.4,
      acTargetTemp: 18,
      cureSaltLevel: 'none',
      seasoningAdded: false,
      processed: false,
    },
    cozimento: {
      heatingStarted: false,
      coreTemp: 14.0,
      cookedOk: false,
      cooledOk: false,
      tankTemp: 3.5,
    },
    camara_fria: {
      boxesStackedOnPallets: false,
      pphoCompleted: false,
    },
  };
}

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<FactoryScene | null>(null);

  const [score, setScore] = useState(100);
  const [currentRoom, setCurrentRoom] = useState<RoomId>('barreira');
  const [activeStation, setActiveStation] = useState<StationId>('barreira');
  const [panelOpen, setPanelOpen] = useState(true);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState<GameProgress>(createInitialProgress);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [banner, setBanner] = useState<FeedbackBanner | null>(null);
  const [boxesOnFloorErr, setBoxesOnFloorErr] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);

  const bannerTimerRef = useRef<number | null>(null);

  const pushFeedback = useCallback(
    (
      type: 'success' | 'error' | 'info',
      title: string,
      message: string,
      room: RoomId,
      deltaScore = 0,
    ) => {
      if (type === 'success') sfx.playSuccess();
      else if (type === 'error') sfx.playError();

      if (deltaScore < 0) {
        setScore((s) => Math.max(0, s + deltaScore));
      }

      if (type === 'error' || type === 'success') {
        setAuditLog((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${Math.random()}`,
            timestamp: new Date().toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            }),
            room,
            type,
            title,
            detail: message,
            deltaScore,
          },
        ]);
      }

      setBanner({ id: Date.now(), type, title, message });
      if (bannerTimerRef.current) window.clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = window.setTimeout(() => {
        setBanner(null);
      }, 5200);
    },
    [],
  );

  const completedStations = useMemo<Record<StationId, boolean>>(() => {
    const p = progress;
    const allPpe =
      p.barreira.ppe.touca &&
      p.barreira.ppe.mascara &&
      p.barreira.ppe.botas &&
      p.barreira.ppe.avental;
    return {
      barreira: allPpe && p.barreira.sinkDone && p.barreira.pediluvioDone,
      doca: p.doca.batch1Rejected && p.doca.batch2Approved,
      manipulacao: p.manipulacao.processed,
      cozimento: p.cozimento.cookedOk && p.cozimento.cooledOk,
      camara_fria: p.camara_fria.boxesStackedOnPallets && p.camara_fria.pphoCompleted,
    };
  }, [progress]);

  // Ref callbacks for Three.js scene (avoids re-mounting WebGL canvas)
  const handlePlaceBoxesRef = useRef<(onPallet: boolean) => void>(() => {});

  const currentRoomRef = useRef<RoomId>('barreira');

  useEffect(() => {
    currentRoomRef.current = currentRoom;
  }, [currentRoom]);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const factory = new FactoryScene(el, {
      onRoomChange: (room) => {
        currentRoomRef.current = room;
        setCurrentRoom(room);
        setActiveStation(room);
        setPanelOpen(true);
      },
      onStationActivate: (station) => {
        setActiveStation(station);
        setPanelOpen(true);
      },
      onDoorBlocked: (reason, requiredRoom) => {
        const room = currentRoomRef.current;
        if (reason === 'cross_contamination') {
          pushFeedback(
            'error',
            'Risco de Contaminação Cruzada!',
            'Porta bloqueada: conclua 100% da Barreira Sanitária (EPIs, pia com pedal e pedilúvio azul) antes de acessar as áreas produtivas.',
            room,
            -8,
          );
        } else {
          pushFeedback(
            'error',
            'Fluxo Sanitário Interrompido',
            `Siga a ordem contínua sem cruzamento: conclua primeiro a etapa "${ROOMS[requiredRoom].name}".`,
            room,
            -5,
          );
        }
      },
      onBoxPlacementClick: (onPallet) => {
        handlePlaceBoxesRef.current(onPallet);
      },
    });

    sceneRef.current = factory;
    return () => {
      factory.dispose();
      sceneRef.current = null;
    };
  }, [pushFeedback]);

  const nextTargetStation = useMemo<StationId>(() => {
    if (!completedStations.barreira) return 'barreira';
    if (!completedStations.doca) return 'doca';
    if (!completedStations.manipulacao) return 'manipulacao';
    if (!completedStations.cozimento) return 'cozimento';
    return 'camara_fria';
  }, [completedStations]);

  // Keep 3D visual state synchronized
  useEffect(() => {
    sceneRef.current?.syncState({
      barreiraDone: completedStations.barreira,
      docaDone: completedStations.doca,
      manipDone: completedStations.manipulacao,
      cozimentoDone: completedStations.cozimento,
      camaraDone: completedStations.camara_fria,
      activeStation: nextTargetStation,
      ppe: progress.barreira.ppe,
      batchIndex: progress.doca.batchIndex,
      batch2Approved: progress.doca.batch2Approved,
      manipRoomTemp: progress.manipulacao.roomTemp,
      manipProcessed: progress.manipulacao.processed,
      cozCoreTemp: progress.cozimento.coreTemp,
      cozHeating: progress.cozimento.heatingStarted,
      cozCooled: progress.cozimento.cooledOk,
      boxesOnPallet: progress.camara_fria.boxesStackedOnPallets,
      boxesOnFloor: boxesOnFloorErr,
      pphoActive: progress.camara_fria.pphoCompleted,
    });
  }, [progress, completedStations, nextTargetStation, boxesOnFloorErr]);

  // Smoothly ramp Manipulacao room temperature toward AC target
  useEffect(() => {
    const id = window.setInterval(() => {
      setProgress((prev) => {
        const diff = prev.manipulacao.acTargetTemp - prev.manipulacao.roomTemp;
        if (Math.abs(diff) < 0.08) return prev;
        return {
          ...prev,
          manipulacao: {
            ...prev.manipulacao,
            roomTemp: prev.manipulacao.roomTemp + diff * 0.25,
          },
        };
      });
    }, 350);
    return () => window.clearInterval(id);
  }, []);

  // Oven heating simulation (ramps coreTemp toward 76°C when heatingStarted)
  useEffect(() => {
    if (!progress.cozimento.heatingStarted || progress.cozimento.cooledOk) return;
    const id = window.setInterval(() => {
      setProgress((prev) => {
        if (!prev.cozimento.heatingStarted || prev.cozimento.coreTemp >= 76.5) return prev;
        const nextTemp = Math.min(76.5, prev.cozimento.coreTemp + 2.4);
        const reached72 = nextTemp >= 72 && prev.cozimento.coreTemp < 72;
        if (reached72) {
          sfx.playBeep(true);
        }
        return {
          ...prev,
          cozimento: {
            ...prev.cozimento,
            coreTemp: nextTemp,
            cookedOk: nextTemp >= 72,
          },
        };
      });
    }, 250);
    return () => window.clearInterval(id);
  }, [progress.cozimento.heatingStarted, progress.cozimento.cooledOk]);

  // Station 1 Handlers
  const handleTogglePpe = (key: keyof PpeSelection) => {
    sfx.playEquip();
    setProgress((prev) => ({
      ...prev,
      barreira: {
        ...prev.barreira,
        ppe: { ...prev.barreira.ppe, [key]: !prev.barreira.ppe[key] },
      },
    }));
  };

  const handleBadPpeAttempt = (item: 'adorno' | 'bone') => {
    sceneRef.current?.showFloorFeedback('error');
    if (item === 'adorno') {
      pushFeedback(
        'error',
        'Violação BPF: Adornos Proibidos',
        'Anéis, relógios e pulseiras acumulam microrganismos e oferecem risco de contaminação física no alimento (RDC 216/ANVISA).',
        'barreira',
        -8,
      );
    } else {
      pushFeedback(
        'error',
        'Violação BPF: Boné de Tecido',
        'Bonés de uso externo não retêm fios de cabelo adequadamente. Utilize sempre touca descartável cobrindo todo o cabelo e orelhas.',
        'barreira',
        -6,
      );
    }
  };

  const handleActivateSink = () => {
    sfx.playWaterSplash();
    sceneRef.current?.spawnBurst({ x: -10.5, y: 1.05, z: 6.5 }, 0x7dd3fc, 28, 1.1, 1.5);
    sceneRef.current?.showFloorFeedback('success', -10.5, 6.2);
    setProgress((prev) => ({
      ...prev,
      barreira: { ...prev.barreira, sinkDone: true },
    }));
    pushFeedback(
      'success',
      'Higienização das Mãos Concluída',
      'Acionamento por pedal evita recontaminação da torneira. Sabonete neutro e álcool 70% aplicados conforme POP.',
      'barreira',
    );
  };

  const handleActivatePediluvio = () => {
    sfx.playWaterSplash();
    sceneRef.current?.spawnBurst({ x: -7.6, y: 0.2, z: 3.4 }, 0x38bdf8, 30, 1.4, 2.0);
    sceneRef.current?.showFloorFeedback('success', -7.6, 3.4);
    setProgress((prev) => ({
      ...prev,
      barreira: { ...prev.barreira, pediluvioDone: true },
    }));
    pushFeedback(
      'success',
      'Pedilúvio Sanitizante Concluído',
      'Solado das botas sanitizado em solução clorada. Se todos os EPIs e a pia estiverem prontos, a porta para a Doca e Manipulação será liberada.',
      'barreira',
    );
  };

  // Station 2 Handlers
  const handleMeasureTruck = () => {
    sfx.playBeep(progress.doca.batchIndex === 2);
    sceneRef.current?.triggerThermometerLaser();
    setProgress((prev) => ({
      ...prev,
      doca: { ...prev.doca, thermometerMeasured: true },
    }));
  };

  const handleRejectBatch = () => {
    if (progress.doca.batchIndex === 1) {
      sfx.playMachineryHum();
      sceneRef.current?.showFloorFeedback('success', -10.5, -5.2);
      sceneRef.current?.triggerTruckRejectionSequence();
      setProgress((prev) => ({
        ...prev,
        doca: {
          ...prev.doca,
          batch1Rejected: true,
          batchIndex: 2,
          thermometerMeasured: false,
          truckState: 'departing',
        },
      }));
      pushFeedback(
        'success',
        'Lote Irregular Rejeitado com Sucesso!',
        'Carne acima de 7°C ou sem Selo de Inspeção Oficial não pode entrar na indústria. Novo caminhão certificado a caminho da doca.',
        'doca',
      );
      window.setTimeout(() => {
        setProgress((prev) => ({
          ...prev,
          doca: { ...prev.doca, truckState: 'arriving' },
        }));
      }, 2200);
      window.setTimeout(() => {
        setProgress((prev) => ({
          ...prev,
          doca: { ...prev.doca, truckState: 'docked' },
        }));
      }, 4100);
    } else {
      sceneRef.current?.showFloorFeedback('error', -10.5, -5.2);
      pushFeedback(
        'error',
        'Lote Conforme Rejeitado Indevidamente',
        'O Lote #02 está a 3,4 °C (abaixo de 7 °C) e possui Selo SIF #0482 válido. Aprove o recebimento para seguir à Manipulação.',
        'doca',
        -5,
      );
    }
  };

  const handleApproveBatch = () => {
    if (progress.doca.batchIndex === 1) {
      sceneRef.current?.showFloorFeedback('error', -10.5, -5.2);
      pushFeedback(
        'error',
        'Violação Crítica de BPF no Recebimento!',
        'Matéria-prima a 11,2 °C (> 7,0 °C) e sem Selo de Inspeção Oficial apresenta alto risco sanitário. Clique em "Rejeitar Lote"!',
        'doca',
        -12,
      );
      return;
    }
    sceneRef.current?.showFloorFeedback('success', -10.5, -5.2);
    setProgress((prev) => ({
      ...prev,
      doca: { ...prev.doca, batch2Approved: true },
    }));
    pushFeedback(
      'success',
      'Lote #02 Aprovado e Pesado (SIF #0482)',
      'Temperatura a 3,4 °C e procedência oficial confirmadas. Siga pela porta Leste para a Sala de Manipulação Climatizada.',
      'doca',
    );
  };

  // Station 3 Handlers
  const handleSetAcTarget = (temp: number) => {
    sfx.playBeep(temp <= 16);
    setProgress((prev) => ({
      ...prev,
      manipulacao: { ...prev.manipulacao, acTargetTemp: temp },
    }));
  };

  const handleSetCureSalt = (level: 'none' | 'ideal' | 'excess') => {
    sfx.playEquip();
    setProgress((prev) => ({
      ...prev,
      manipulacao: { ...prev.manipulacao, cureSaltLevel: level },
    }));
  };

  const handleToggleSeasoning = () => {
    sfx.playEquip();
    setProgress((prev) => ({
      ...prev,
      manipulacao: { ...prev.manipulacao, seasoningAdded: !prev.manipulacao.seasoningAdded },
    }));
  };

  const handleProcessMeat = () => {
    const m = progress.manipulacao;
    if (m.roomTemp > 16) {
      sceneRef.current?.showFloorFeedback('error', -1.7, 0.2);
      pushFeedback(
        'error',
        'Violação BPF: Temperatura da Sala Acima de 16°C',
        'A sala de manipulação deve estar climatizada abaixo de 16°C (ideal 12–14°C) para evitar multiplicação bacteriana e quebra da emulsão cárnea.',
        'manipulacao',
        -10,
      );
      return;
    }
    if (m.cureSaltLevel === 'excess') {
      sceneRef.current?.showFloorFeedback('error', -1.7, 0.2);
      pushFeedback(
        'error',
        'Violação BPF: Excesso de Nitrito/Nitrato (Sal de Cura)',
        'Dosagem excessiva de sal de cura excede o limite toxicológico permitido pela legislação (150 ppm). Ajuste para 2,5 g/kg.',
        'manipulacao',
        -10,
      );
      return;
    }
    if (m.cureSaltLevel === 'none') {
      sceneRef.current?.showFloorFeedback('error', -1.7, 0.2);
      pushFeedback(
        'error',
        'Falha de Formulação: Sal de Cura Ausente',
        'O sal de cura na dosagem correta (2,5 g/kg) previne o desenvolvimento de Clostridium botulinum e estabiliza a cor.',
        'manipulacao',
        -6,
      );
      return;
    }
    if (!m.seasoningAdded) {
      sceneRef.current?.showFloorFeedback('error', -1.7, 0.2);
      pushFeedback(
        'error',
        'Condimentos e Gelo Escama Pendentes',
        'Adicione os condimentos e o gelo escama antes de acionar o moedor para controlar o aquecimento da massa por atrito.',
        'manipulacao',
        -4,
      );
      return;
    }

    sfx.playMachineryHum();
    sceneRef.current?.triggerProcessingAnimation();
    sceneRef.current?.showFloorFeedback('success', -1.7, 0.2);
    setProgress((prev) => ({
      ...prev,
      manipulacao: { ...prev.manipulacao, processed: true },
    }));
    pushFeedback(
      'success',
      'Moagem e Embutimento Concluídos!',
      'Massa cárnea processada sob climatização (< 16°C) e dosagem segura. Avance para a Área de Cozimento / Estufa.',
      'manipulacao',
    );
  };

  // Station 4 Handlers
  const handleStartOven = () => {
    sfx.playEquip();
    setProgress((prev) => ({
      ...prev,
      cozimento: { ...prev.cozimento, heatingStarted: true },
    }));
    pushFeedback(
      'info',
      'Estufa Ligada · Monitorando Centro Térmico',
      'Acompanhe o visor da estufa subir até atingir no mínimo 72,0 °C no centro do embutido.',
      'cozimento',
    );
  };

  const handleMoveCartToCooling = () => {
    if (!progress.cozimento.heatingStarted || progress.cozimento.coreTemp < 72) {
      sceneRef.current?.showFloorFeedback('error', 5.7, -1.5);
      pushFeedback(
        'error',
        'Cozimento Insuficiente (< 72 °C)!',
        `Temperatura atual de ${progress.cozimento.coreTemp.toFixed(1)} °C não garante eliminação de patógenos como Salmonella e Listeria. Aguarde ≥ 72 °C.`,
        'cozimento',
        -10,
      );
      return;
    }

    sfx.playWaterSplash();
    sceneRef.current?.spawnBurst({ x: 5.7, y: 1.0, z: 4.3 }, 0xbae6fd, 35, 1.8, 2.2);
    sceneRef.current?.showFloorFeedback('success', 5.7, 4.3);
    setProgress((prev) => ({
      ...prev,
      cozimento: { ...prev.cozimento, cooledOk: true, heatingStarted: false },
    }));
    pushFeedback(
      'success',
      'Cozimento a 72°C e Choque Térmico Concluídos!',
      'O resfriamento rápido impede a germinação de esporos na zona de perigo térmico. Prossiga para a Câmara Fria.',
      'cozimento',
    );
  };

  // Station 5 Handlers
  const handlePlaceBoxes = useCallback(
    (onPallet: boolean) => {
      if (!onPallet) {
        setBoxesOnFloorErr(true);
        sceneRef.current?.showFloorFeedback('error', 12.8, 2.6);
        pushFeedback(
          'error',
          'Violação BPF: Contato Direto com o Piso!',
          'Caixas e alimentos nunca podem tocar o piso. Armazene sempre sobre estrados plásticos a no mínimo 15 cm do solo para limpeza e circulação de ar.',
          'camara_fria',
          -10,
        );
        return;
      }
      setBoxesOnFloorErr(false);
      sceneRef.current?.showFloorFeedback('success', 12.8, -2.6);
      setProgress((prev) => ({
        ...prev,
        camara_fria: { ...prev.camara_fria, boxesStackedOnPallets: true },
      }));
      pushFeedback(
        'success',
        'Armazenamento Correto sobre Estrados Plásticos',
        'Caixas rotuladas empilhadas com afastamento do piso e paredes. Acione agora a Higienização PPHO para finalizar o turno.',
        'camara_fria',
      );
    },
    [pushFeedback],
  );

  handlePlaceBoxesRef.current = handlePlaceBoxes;

  const handleTriggerPpho = () => {
    sfx.playWaterSplash();
    sceneRef.current?.triggerPphoSpray();
    sceneRef.current?.showFloorFeedback('success', 11.2, 0);
    setProgress((prev) => ({
      ...prev,
      camara_fria: { ...prev.camara_fria, pphoCompleted: true },
    }));
    pushFeedback(
      'success',
      'Higienização PPHO Executada!',
      'Mesas de inox, moedor, embutideira, estufa e ralos higienizados conforme Procedimento Padrão de Higiene Operacional.',
      'camara_fria',
    );
    window.setTimeout(() => {
      setShowAuditModal(true);
    }, 1300);
  };

  const handleRestart = () => {
    setScore(100);
    setProgress(createInitialProgress());
    setAuditLog([]);
    setBanner(null);
    setBoxesOnFloorErr(false);
    setShowAuditModal(false);
    setCurrentRoom('barreira');
    setActiveStation('barreira');
    setPanelOpen(true);
    sceneRef.current?.resetWorld();
  };

  const handleToggleMute = () => {
    const next = !muted;
    sfx.muted = next;
    setMuted(next);
  };

  const currentRoomTemp = useMemo(() => {
    if (currentRoom === 'manipulacao') return progress.manipulacao.roomTemp;
    if (currentRoom === 'cozimento' && progress.cozimento.heatingStarted) return 29.0;
    return ROOMS[currentRoom].nominalTemp;
  }, [currentRoom, progress.manipulacao.roomTemp, progress.cozimento.heatingStarted]);

  const currentObjective = useMemo(() => {
    if (!completedStations.barreira) return ROOMS.barreira.objectiveText;
    if (!completedStations.doca) return ROOMS.doca.objectiveText;
    if (!completedStations.manipulacao) return ROOMS.manipulacao.objectiveText;
    if (!completedStations.cozimento) return ROOMS.cozimento.objectiveText;
    return ROOMS.camara_fria.objectiveText;
  }, [completedStations]);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#eef3f7]">
      {/* Isolated Full-Bleed WebGL Canvas Container */}
      <div ref={mountRef} className="h-full w-full" />

      <TopHud
        score={score}
        currentRoom={currentRoom}
        roomTemp={currentRoomTemp}
        objectiveText={currentObjective}
        muted={muted}
        onToggleMute={handleToggleMute}
        onResetCamera={() => sceneRef.current?.resetCamera()}
        onRestart={handleRestart}
      />

      <FeedbackToast banner={banner} onDismiss={() => setBanner(null)} />

      <StationPanel
        open={panelOpen}
        station={activeStation}
        progress={progress}
        completed={completedStations}
        onClose={() => setPanelOpen(false)}
        onTogglePpe={handleTogglePpe}
        onBadPpeAttempt={handleBadPpeAttempt}
        onActivateSink={handleActivateSink}
        onActivatePediluvio={handleActivatePediluvio}
        onMeasureTruck={handleMeasureTruck}
        onRejectBatch={handleRejectBatch}
        onApproveBatch={handleApproveBatch}
        onSetAcTarget={handleSetAcTarget}
        onSetCureSalt={handleSetCureSalt}
        onToggleSeasoning={handleToggleSeasoning}
        onProcessMeat={handleProcessMeat}
        onStartOven={handleStartOven}
        onMoveCartToCooling={handleMoveCartToCooling}
        onPlaceBoxes={handlePlaceBoxes}
        onTriggerPpho={handleTriggerPpho}
      />

      <ProgressDock
        collapsed={dockCollapsed}
        onToggleCollapse={() => setDockCollapsed((c) => !c)}
        currentRoom={currentRoom}
        completedStations={completedStations}
        activeStation={activeStation}
        panelOpen={panelOpen}
        onSelectRoom={(room) => {
          sceneRef.current?.walkToStation(room);
        }}
        onOpenCurrentStation={() => {
          setActiveStation(currentRoom);
          setPanelOpen(true);
        }}
      />

      {showAuditModal && (
        <AuditModal
          score={score}
          completedStations={completedStations}
          auditLog={auditLog}
          onRestart={handleRestart}
        />
      )}
    </main>
  );
}
