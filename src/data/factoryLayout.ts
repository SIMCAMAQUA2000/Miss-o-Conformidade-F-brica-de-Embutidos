import type { RoomId, RoomMeta } from '../types/game';

export const FACTORY_BOUNDS = {
  minX: -14.7,
  maxX: 14.7,
  minZ: -7.2,
  maxZ: 7.2,
};

export const ROOMS: Record<RoomId, RoomMeta> = {
  barreira: {
    id: 'barreira',
    order: 1,
    name: '1. Vestiário / Barreira Sanitária',
    shortName: 'Barreira',
    bounds: { minX: -15, maxX: -6, minZ: 0, maxZ: 7.5 },
    stationPos: { x: -10.5, z: 4.5 },
    walkTarget: { x: -10.5, z: 3.8 },
    nominalTemp: 21.0,
    objectiveText: 'Vista os EPIs corretos, lave as mãos na pia com pedal e higienize as botas no pedilúvio.',
  },
  doca: {
    id: 'doca',
    order: 2,
    name: '2. Doca de Recebimento',
    shortName: 'Doca',
    bounds: { minX: -15, maxX: -6, minZ: -7.5, maxZ: 0 },
    stationPos: { x: -10.5, z: -5.4 },
    walkTarget: { x: -10.5, z: -4.2 },
    nominalTemp: 14.0,
    objectiveText: 'Meça a temperatura da carne no caminhão frigorífico e verifique o Selo de Inspeção Oficial.',
  },
  manipulacao: {
    id: 'manipulacao',
    order: 3,
    name: '3. Sala de Manipulação Climatizada',
    shortName: 'Manipulação',
    bounds: { minX: -6, maxX: 2.5, minZ: -7.5, maxZ: 7.5 },
    stationPos: { x: -1.6, z: 0.2 },
    walkTarget: { x: -1.6, z: 2.4 },
    nominalTemp: 12.5,
    objectiveText: 'Mantenha a sala abaixo de 16°C, dose o sal de cura corretamente e processe no moedor e embutideira.',
  },
  cozimento: {
    id: 'cozimento',
    order: 4,
    name: '4. Área de Cozimento / Estufa',
    shortName: 'Cozimento',
    bounds: { minX: 2.5, maxX: 9.0, minZ: -7.5, maxZ: 7.5 },
    stationPos: { x: 5.7, z: -0.5 },
    walkTarget: { x: 5.7, z: 1.5 },
    nominalTemp: 26.5,
    objectiveText: 'Aqueça o produto na estufa até 72°C no centro térmico e faça o choque térmico no tanque.',
  },
  camara_fria: {
    id: 'camara_fria',
    order: 5,
    name: '5. Câmara Fria e Expedição (PPHO)',
    shortName: 'Câmara Fria',
    bounds: { minX: 9.0, maxX: 15, minZ: -7.5, maxZ: 7.5 },
    stationPos: { x: 12.1, z: 0.0 },
    walkTarget: { x: 11.0, z: 0.4 },
    nominalTemp: 2.0,
    objectiveText: 'Empilhe as caixas rotuladas apenas sobre os estrados plásticos e acione a Higienização PPHO.',
  },
};

export const ROOM_ORDER: RoomId[] = [
  'barreira',
  'doca',
  'manipulacao',
  'cozimento',
  'camara_fria',
];

export interface WallObstacle {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  doorId?: 'barreira_to_doca' | 'barreira_to_manip' | 'doca_to_manip' | 'manip_to_coz' | 'coz_to_camara';
}

// Physical wall colliders (with doorways left open or gated by doorId)
export const WALL_COLLIDERS: WallObstacle[] = [
  // Wall between Barreira (z>0) and Doca (z<0), x in [-15, -6], doorway at x in [-11.6, -9.4]
  { minX: -15.1, maxX: -11.6, minZ: -0.18, maxZ: 0.18 },
  { minX: -9.4, maxX: -5.9, minZ: -0.18, maxZ: 0.18 },
  // Doorway gate barreira_to_doca
  { minX: -11.6, maxX: -9.4, minZ: -0.18, maxZ: 0.18, doorId: 'barreira_to_doca' },

  // Wall at x = -6 separating (Barreira & Doca) from Manipulacao
  // Doca doorway at z in [-4.5, -2.3], Barreira doorway at z in [2.3, 4.5]
  { minX: -6.18, maxX: -5.82, minZ: -7.6, maxZ: -4.5 },
  { minX: -6.18, maxX: -5.82, minZ: -2.3, maxZ: 2.3 },
  { minX: -6.18, maxX: -5.82, minZ: 4.5, maxZ: 7.6 },
  { minX: -6.18, maxX: -5.82, minZ: -4.5, maxZ: -2.3, doorId: 'doca_to_manip' },
  { minX: -6.18, maxX: -5.82, minZ: 2.3, maxZ: 4.5, doorId: 'barreira_to_manip' },

  // Wall at x = 2.5 separating Manipulacao from Cozimento, doorway at z in [-1.2, 1.2]
  { minX: 2.32, maxX: 2.68, minZ: -7.6, maxZ: -1.2 },
  { minX: 2.32, maxX: 2.68, minZ: 1.2, maxZ: 7.6 },
  { minX: 2.32, maxX: 2.68, minZ: -1.2, maxZ: 1.2, doorId: 'manip_to_coz' },

  // Wall at x = 9.0 separating Cozimento from Camara Fria, doorway at z in [-1.2, 1.2]
  { minX: 8.82, maxX: 9.18, minZ: -7.6, maxZ: -1.2 },
  { minX: 8.82, maxX: 9.18, minZ: 1.2, maxZ: 7.6 },
  { minX: 8.82, maxX: 9.18, minZ: -1.2, maxZ: 1.2, doorId: 'coz_to_camara' },

  // Equipment footprint colliders so player walks around large machinery cleanly
  // Grinder + Table in Manipulacao
  { minX: -3.2, maxX: -0.2, minZ: -1.1, maxZ: 1.3 },
  // Estufa in Cozimento
  { minX: 4.2, maxX: 7.1, minZ: -5.8, maxZ: -3.1 },
  // Cooling tank in Cozimento
  { minX: 4.2, maxX: 7.0, minZ: 3.1, maxZ: 5.5 },
  // Pallets in Camara Fria
  { minX: 11.4, maxX: 14.3, minZ: -4.2, maxZ: -1.0 },
];

export function getRoomAtPosition(x: number, z: number): RoomId {
  if (x < -6) {
    return z >= 0 ? 'barreira' : 'doca';
  }
  if (x < 2.5) return 'manipulacao';
  if (x < 9.0) return 'cozimento';
  return 'camara_fria';
}
