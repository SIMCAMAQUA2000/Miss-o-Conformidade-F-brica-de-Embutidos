export type RoomId =
  | 'barreira'
  | 'doca'
  | 'manipulacao'
  | 'cozimento'
  | 'camara_fria';

export type StationId =
  | 'barreira'
  | 'doca'
  | 'manipulacao'
  | 'cozimento'
  | 'camara_fria';

export interface PpeSelection {
  touca: boolean;
  mascara: boolean;
  botas: boolean;
  avental: boolean;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  room: RoomId;
  type: 'success' | 'error';
  title: string;
  detail: string;
  deltaScore: number;
}

export interface FeedbackBanner {
  id: number;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

export interface BarreiraProgress {
  ppe: PpeSelection;
  sinkDone: boolean;
  pediluvioDone: boolean;
}

export interface DocaProgress {
  batchIndex: 1 | 2; // 1 = non-compliant (11.2°C, sem selo), 2 = compliant (3.4°C, SIF)
  thermometerMeasured: boolean;
  batch1Rejected: boolean;
  batch2Approved: boolean;
  truckState: 'docked' | 'departing' | 'arriving';
}

export interface ManipulacaoProgress {
  roomTemp: number; // starts at 18.4°C, must cool <= 16°C
  acTargetTemp: number;
  cureSaltLevel: 'none' | 'ideal' | 'excess';
  seasoningAdded: boolean;
  processed: boolean;
}

export interface CozimentoProgress {
  heatingStarted: boolean;
  coreTemp: number; // starts at 14°C, target >= 72°C
  cookedOk: boolean;
  cooledOk: boolean;
  tankTemp: number;
}

export interface CamaraFriaProgress {
  boxesStackedOnPallets: boolean;
  pphoCompleted: boolean;
}

export interface GameProgress {
  barreira: BarreiraProgress;
  doca: DocaProgress;
  manipulacao: ManipulacaoProgress;
  cozimento: CozimentoProgress;
  camara_fria: CamaraFriaProgress;
}

export interface RoomMeta {
  id: RoomId;
  order: number;
  name: string;
  shortName: string;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  stationPos: { x: number; z: number };
  walkTarget: { x: number; z: number };
  nominalTemp: number;
  objectiveText: string;
}
