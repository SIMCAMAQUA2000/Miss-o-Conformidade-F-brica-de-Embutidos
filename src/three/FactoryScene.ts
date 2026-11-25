import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  FACTORY_BOUNDS,
  ROOMS,
  WALL_COLLIDERS,
  getRoomAtPosition,
} from '../data/factoryLayout';
import type { PpeSelection, RoomId, StationId } from '../types/game';
import {
  createAcUnit,
  createCookingOven,
  createCoolingTank,
  createFloorDrain,
  createFloorFeedbackRing,
  createMeatGrinder,
  createPediluvioStation,
  createPlasticPalletAndBoxes,
  createPpeLocker,
  createPrepTable,
  createRackCart,
  createRefrigeratedTruck,
  createSausageStuffer,
  createScaleAndThermometer,
  createSinkStation,
  createStationBeacon,
  createWorkerCharacter,
  type TruckRig,
  type WorkerRig,
} from './models';
import {
  createAsphaltTexture,
  createContactShadowTexture,
  createEpoxyFloorTexture,
  createRoomSignTexture,
  createTileWallTexture,
} from './textures';
import { sfx } from '../audio/sfx';

export interface SceneCallbacks {
  onRoomChange: (room: RoomId) => void;
  onStationActivate: (station: StationId) => void;
  onDoorBlocked: (reason: 'cross_contamination' | 'sequence', requiredRoom: RoomId) => void;
  onBoxPlacementClick?: (onPallet: boolean) => void;
}

export interface SceneVisualState {
  barreiraDone: boolean;
  docaDone: boolean;
  manipDone: boolean;
  cozimentoDone: boolean;
  camaraDone: boolean;
  activeStation: StationId;
  ppe: PpeSelection;
  batchIndex: 1 | 2;
  batch2Approved: boolean;
  manipRoomTemp: number;
  manipProcessed: boolean;
  cozCoreTemp: number;
  cozHeating: boolean;
  cozCooled: boolean;
  boxesOnPallet: boolean;
  boxesOnFloor: boolean;
  pphoActive: boolean;
}

interface Particle {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  scale: number;
  color: THREE.Color;
}

// Pre-allocated scratch math objects (zero GC churn inside tick)
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _camForward = new THREE.Vector3();
const _camRight = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _scaleVec = new THREE.Vector3();

export class FactoryScene {
  private container: HTMLElement;
  private callbacks: SceneCallbacks;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private isSoftwareGl: boolean;
  private clock = new THREE.Clock();
  private frameId = 0;
  private disposed = false;

  // Player & navigation
  private worker: WorkerRig;
  private playerPos = new THREE.Vector3(-12.5, 0, 4.2);
  private walkTarget: THREE.Vector3 | null = null;
  private pendingStationOpen: StationId | null = null;
  private currentRoom: RoomId = 'barreira';
  private keysPressed = new Set<string>();
  private stepTimer = 0;
  private lastDoorAlertTime = 0;

  // Camera follow state
  private userOrbiting = false;
  private resettingCamera = false;
  private readonly defaultCamOffset = new THREE.Vector3(11.5, 13.5, 13.5);

  // Raycasting
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private floorPlaneMesh!: THREE.Mesh;
  private clickTargets: { mesh: THREE.Object3D; type: 'station' | 'pallet' | 'floor_zone'; id: string }[] = [];
  private pointerDownPos = { x: 0, y: 0 };

  // Dynamic visual elements
  private walkMarker: THREE.Mesh;
  private feedbackRing: ReturnType<typeof createFloorFeedbackRing>;
  private feedbackTimer = 0;
  private beacons: Record<StationId, THREE.Group>;
  private doorBars: Record<string, THREE.Mesh> = {};

  // Equipment rigs
  private truckRig!: TruckRig;
  private truckPosZ = -10.35;
  private truckDoorAngle = 1; // 1 = open, 0 = closed
  private truckAnimMode: 'docked' | 'departing' | 'arriving' = 'docked';
  private scaleRig!: ReturnType<typeof createScaleAndThermometer>;
  private laserTimer = 0;

  private grinderRig!: ReturnType<typeof createMeatGrinder>;
  private stufferRig!: ReturnType<typeof createSausageStuffer>;
  private acRig!: ReturnType<typeof createAcUnit>;
  private processingAnimTimer = 0;

  private ovenRig!: ReturnType<typeof createCookingOven>;
  private rackCart!: THREE.Group;
  private cartTargetZ = -3.4;

  private palletRig!: ReturnType<typeof createPlasticPalletAndBoxes>;
  private pphoGleamMats: THREE.MeshStandardMaterial[] = [];

  // Particle pool
  private particleMesh!: THREE.InstancedMesh;
  private particles: Particle[] = [];
  private readonly maxParticles = 110;

  // External state mirror
  private state: SceneVisualState = {
    barreiraDone: false,
    docaDone: false,
    manipDone: false,
    cozimentoDone: false,
    camaraDone: false,
    activeStation: 'barreira',
    ppe: { touca: false, mascara: false, botas: false, avental: false },
    batchIndex: 1,
    batch2Approved: false,
    manipRoomTemp: 18.4,
    manipProcessed: false,
    cozCoreTemp: 14,
    cozHeating: false,
    cozCooled: false,
    boxesOnPallet: false,
    boxesOnFloor: false,
    pphoActive: false,
  };

  constructor(container: HTMLElement, callbacks: SceneCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xeef3f7);
    this.scene.fog = new THREE.Fog(0xeef3f7, 30, 72);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const aspect = container.clientWidth / Math.max(container.clientHeight, 1);
    this.camera = new THREE.PerspectiveCamera(35, aspect, 0.2, 120);
    this.camera.position.copy(this.playerPos).add(this.defaultCamOffset);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI * 0.44;
    this.controls.minPolarAngle = Math.PI * 0.16;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 36;
    this.controls.enablePan = false;
    this.controls.target.set(this.playerPos.x, 0.9, this.playerPos.z);

    this.controls.addEventListener('start', () => {
      this.userOrbiting = true;
      this.resettingCamera = false;
    });
    this.controls.addEventListener('end', () => {
      this.userOrbiting = false;
    });

    this.setupLighting();
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.buildArchitecture(maxAniso);
    this.buildStations(maxAniso);
    this.initParticles();

    const shadowTex = createContactShadowTexture();
    this.worker = createWorkerCharacter(shadowTex);
    this.worker.group.position.copy(this.playerPos);
    this.scene.add(this.worker.group);

    this.walkMarker = new THREE.Mesh(
      new THREE.RingGeometry(0.22, 0.34, 24),
      new THREE.MeshBasicMaterial({ color: 0x0284c7, side: THREE.DoubleSide, transparent: true, opacity: 0.8 }),
    );
    this.walkMarker.rotation.x = -Math.PI / 2;
    this.walkMarker.position.y = 0.025;
    this.walkMarker.visible = false;
    this.scene.add(this.walkMarker);

    this.feedbackRing = createFloorFeedbackRing();
    this.scene.add(this.feedbackRing.mesh);

    this.beacons = {
      barreira: createStationBeacon(0x0284c7),
      doca: createStationBeacon(0x0284c7),
      manipulacao: createStationBeacon(0x0284c7),
      cozimento: createStationBeacon(0x0284c7),
      camara_fria: createStationBeacon(0x0284c7),
    };
    (Object.keys(ROOMS) as StationId[]).forEach((id) => {
      const b = this.beacons[id];
      b.position.set(ROOMS[id].stationPos.x, 0, ROOMS[id].stationPos.z);
      this.scene.add(b);
      this.registerStationHitbox(id, ROOMS[id].stationPos.x, ROOMS[id].stationPos.z, 1.5, 2.8, 1.5);
    });

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.tick();
  }

  private setupLighting() {
    const hemi = new THREE.HemisphereLight(0xdbeafe, 0xcbd5e1, 0.9);
    hemi.position.set(0, 20, 0);
    this.scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff7ea, 1.35);
    keyLight.position.set(16, 24, 14);
    keyLight.castShadow = !this.isSoftwareGl;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.near = 2;
    keyLight.shadow.camera.far = 62;
    keyLight.shadow.camera.left = -20;
    keyLight.shadow.camera.right = 20;
    keyLight.shadow.camera.top = 16;
    keyLight.shadow.camera.bottom = -16;
    keyLight.shadow.bias = -0.0004;
    keyLight.shadow.normalBias = 0.02;
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe0f2fe, 0.45);
    fillLight.position.set(-14, 12, -10);
    this.scene.add(fillLight);
  }

  private buildArchitecture(maxAniso: number) {
    // Ground terrain outside building
    const outerGround = new THREE.Mesh(
      new THREE.PlaneGeometry(140, 140),
      new THREE.MeshStandardMaterial({ color: 0xdbe3ec, roughness: 0.95, metalness: 0.0 }),
    );
    outerGround.rotation.x = -Math.PI / 2;
    outerGround.position.y = -0.03;
    outerGround.receiveShadow = true;
    this.scene.add(outerGround);

    // Asphalt truck dock apron at North (z: -19 to -7.5)
    const asphaltTex = createAsphaltTexture(maxAniso);
    asphaltTex.repeat.set(6, 4);
    const apron = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 12),
      new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.92 }),
    );
    apron.rotation.x = -Math.PI / 2;
    apron.position.set(-10.5, -0.015, -13.5);
    apron.receiveShadow = true;
    this.scene.add(apron);

    // Invisible click plane for walking across entire factory floor
    this.floorPlaneMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 15),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    this.floorPlaneMesh.rotation.x = -Math.PI / 2;
    this.floorPlaneMesh.position.y = 0.01;
    this.scene.add(this.floorPlaneMesh);

    // Room epoxy floors
    const addRoomFloor = (
      x1: number,
      x2: number,
      z1: number,
      z2: number,
      baseHex: string,
      speckHex: string,
    ) => {
      const w = x2 - x1;
      const d = z2 - z1;
      const tex = createEpoxyFloorTexture(baseHex, speckHex, maxAniso);
      tex.repeat.set(Math.max(1, Math.round(w / 2)), Math.max(1, Math.round(d / 2)));
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.36,
        metalness: 0.04,
      });
      this.pphoGleamMats.push(mat);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), mat);
      mesh.position.set((x1 + x2) / 2, -0.03, (z1 + z2) / 2);
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    };

    addRoomFloor(-15, -6, 0, 7.5, '#e6f2fa', '#bae6fd'); // Barreira
    addRoomFloor(-15, -6, -7.5, 0, '#eef2f6', '#cbd5e1'); // Doca
    addRoomFloor(-6, 2.5, -7.5, 7.5, '#f8fafc', '#cbd5e1'); // Manipulacao
    addRoomFloor(2.5, 9, -7.5, 7.5, '#faf6ef', '#e2d9c8'); // Cozimento
    addRoomFloor(9, 15, -7.5, 7.5, '#e2effc', '#93c5fd'); // Camara Fria

    // Floor drains (Ralos Sifonados)
    [
      [-10.5, 4.8],
      [-10.5, -3.2],
      [-2.2, -3.8],
      [-2.2, 3.8],
      [5.7, 0.8],
      [11.8, 1.5],
    ].forEach(([x, z]) => {
      const drain = createFloorDrain();
      drain.position.set(x, 0, z);
      this.scene.add(drain);
    });

    // Ceramic tiled walls
    const wallTex = createTileWallTexture(maxAniso);
    const makeWall = (x1: number, z1: number, x2: number, z2: number, height: number) => {
      const len = Math.hypot(x2 - x1, z2 - z1);
      const tex = wallTex.clone();
      tex.needsUpdate = true;
      tex.repeat.set(Math.max(1, len / 2.2), height / 2.2);
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.22,
        metalness: 0.04,
      });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(len, height, 0.22), mat);
      mesh.position.set((x1 + x2) / 2, height / 2, (z1 + z2) / 2);
      mesh.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    };

    // North wall (tall, with truck dock bay opening x: -12.0 to -9.0)
    makeWall(-15, -7.5, -12.0, -7.5, 3.1);
    makeWall(-9.0, -7.5, 15, -7.5, 3.1);
    // West wall (tall)
    makeWall(-15, -7.5, -15, 7.5, 3.1);
    // East & South cutaway walls (low 0.95m so isometric view stays completely clear)
    makeWall(15, -7.5, 15, 7.5, 1.25);
    makeWall(-15, 7.5, 15, 7.5, 0.9);

    // Wall Barreira/Doca (z = 0)
    makeWall(-15, 0, -11.6, 0, 1.45);
    makeWall(-9.4, 0, -6, 0, 1.45);

    // Wall x = -6 (Barreira/Doca -> Manipulacao)
    makeWall(-6, -7.5, -6, -4.5, 1.45);
    makeWall(-6, -2.3, -6, 2.3, 1.45);
    makeWall(-6, 4.5, -6, 7.5, 1.45);

    // Wall x = 2.5 (Manipulacao -> Cozimento)
    makeWall(2.5, -7.5, 2.5, -1.2, 1.45);
    makeWall(2.5, 1.2, 2.5, 7.5, 1.45);

    // Wall x = 9.0 (Cozimento -> Camara Fria)
    makeWall(9.0, -7.5, 9.0, -1.2, 1.65);
    makeWall(9.0, 1.2, 9.0, 7.5, 1.65);

    // Door indicator bars on floor/thresholds
    const addDoorGate = (doorId: string, x: number, z: number, rotY: number) => {
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, 0.14, 0.14),
        new THREE.MeshStandardMaterial({
          color: 0xef4444,
          emissive: 0xef4444,
          emissiveIntensity: 0.35,
          transparent: true,
          opacity: 0.78,
        }),
      );
      bar.position.set(x, 0.72, z);
      bar.rotation.y = rotY;
      this.scene.add(bar);
      this.doorBars[doorId] = bar;
    };

    addDoorGate('barreira_to_doca', -10.5, 0, 0);
    addDoorGate('barreira_to_manip', -6, 3.4, Math.PI / 2);
    addDoorGate('doca_to_manip', -6, -3.4, Math.PI / 2);
    addDoorGate('manip_to_coz', 2.5, 0, Math.PI / 2);
    addDoorGate('coz_to_camara', 9.0, 0, Math.PI / 2);

    // Room header signs on North wall & West wall
    const addSign = (label: string, color: string, x: number, y: number, z: number, rotY = 0) => {
      const tex = createRoomSignTexture(label, color, maxAniso);
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(3.1, 0.78),
        new THREE.MeshBasicMaterial({ map: tex }),
      );
      sign.position.set(x, y, z);
      sign.rotation.y = rotY;
      this.scene.add(sign);
    };

    addSign('1. BARREIRA SANITÁRIA', '#0284c7', -14.86, 2.35, 3.6, Math.PI / 2);
    addSign('2. DOCA DE RECEBIMENTO', '#0284c7', -14.86, 2.35, -3.6, Math.PI / 2);
    addSign('3. MANIPULAÇÃO CLIMATIZADA', '#0284c7', -1.8, 2.45, -7.36, 0);
    addSign('4. COZIMENTO / ESTUFA', '#d97706', 5.7, 2.45, -7.36, 0);
    addSign('5. CÂMARA FRIA & PPHO', '#0284c7', 12.0, 2.45, -7.36, 0);
  }

  private buildStations(maxAniso: number) {
    // 1. Barreira Sanitaria
    const locker = createPpeLocker();
    locker.position.set(-14.1, 0, 5.4);
    locker.rotation.y = Math.PI / 2;
    this.scene.add(locker);

    const sink = createSinkStation();
    sink.position.set(-10.5, 0, 6.7);
    sink.rotation.y = Math.PI;
    this.scene.add(sink);

    const pediluvio = createPediluvioStation();
    pediluvio.position.set(-7.6, 0, 3.4);
    pediluvio.rotation.y = Math.PI / 2;
    this.scene.add(pediluvio);

    // 2. Doca de Recebimento
    this.truckRig = createRefrigeratedTruck();
    this.truckRig.group.position.set(-10.5, 0, this.truckPosZ);
    this.scene.add(this.truckRig.group);

    this.scaleRig = createScaleAndThermometer(maxAniso);
    this.scaleRig.group.position.set(-10.5, 0, -5.6);
    this.scene.add(this.scaleRig.group);
    this.registerStationHitbox('doca', -10.5, -8.5, 2.4, 2.5, 3.2);
    this.registerStationHitbox('barreira', -10.5, 6.5, 1.5, 1.8, 1.2);
    this.registerStationHitbox('barreira', -7.6, 3.4, 1.8, 1.2, 1.8);

    // 3. Manipulacao Climatizada
    const table1 = createPrepTable();
    table1.position.set(-1.7, 0, -0.2);
    this.scene.add(table1);

    this.grinderRig = createMeatGrinder();
    this.grinderRig.group.position.set(-2.6, 0.92, -0.2);
    this.scene.add(this.grinderRig.group);

    this.stufferRig = createSausageStuffer();
    this.stufferRig.group.position.set(-0.9, 0.92, -0.2);
    this.scene.add(this.stufferRig.group);

    this.acRig = createAcUnit(maxAniso);
    this.acRig.group.position.set(-1.8, 1.75, -7.25);
    this.scene.add(this.acRig.group);

    // 4. Cozimento / Estufa
    this.ovenRig = createCookingOven(maxAniso);
    this.ovenRig.group.position.set(5.7, 0, -4.6);
    this.scene.add(this.ovenRig.group);

    const coolingTank = createCoolingTank();
    coolingTank.position.set(5.7, 0, 4.3);
    this.scene.add(coolingTank);

    this.rackCart = createRackCart();
    this.rackCart.position.set(5.7, 0, this.cartTargetZ);
    this.scene.add(this.rackCart);

    // 5. Camara Fria & PPHO
    this.palletRig = createPlasticPalletAndBoxes(maxAniso);
    this.palletRig.palletGroup.position.set(12.8, 0, -2.6);
    this.palletRig.boxesOnPallet.position.set(12.8, 0, -2.6);
    this.palletRig.boxesOnFloor.position.set(12.8, 0, 2.6);
    this.scene.add(
      this.palletRig.palletGroup,
      this.palletRig.boxesOnPallet,
      this.palletRig.boxesOnFloor,
    );

    // Interactive floor-zone vs pallet hitboxes in Câmara Fria
    const palletHit = new THREE.Mesh(
      new THREE.BoxGeometry(2.3, 0.6, 2.3),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    palletHit.position.set(12.8, 0.3, -2.6);
    this.scene.add(palletHit);
    this.clickTargets.push({ mesh: palletHit, type: 'pallet', id: 'camara_pallet' });

    const floorZoneMesh = new THREE.Mesh(
      new THREE.RingGeometry(0.7, 1.0, 24),
      new THREE.MeshBasicMaterial({ color: 0x94a3b8, side: THREE.DoubleSide, transparent: true, opacity: 0.45 }),
    );
    floorZoneMesh.rotation.x = -Math.PI / 2;
    floorZoneMesh.position.set(12.8, 0.02, 2.6);
    this.scene.add(floorZoneMesh);

    const floorHit = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.5, 2.0),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    floorHit.position.set(12.8, 0.25, 2.6);
    this.scene.add(floorHit);
    this.clickTargets.push({ mesh: floorHit, type: 'floor_zone', id: 'camara_floor' });
  }

  private registerStationHitbox(
    station: StationId,
    x: number,
    z: number,
    w: number,
    h: number,
    d: number,
  ) {
    const hit = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    hit.position.set(x, h / 2, z);
    this.scene.add(hit);
    this.clickTargets.push({ mesh: hit, type: 'station', id: station });
  }

  private initParticles() {
    const geo = new THREE.SphereGeometry(0.06, 6, 6);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25,
      metalness: 0.05,
    });
    this.particleMesh = new THREE.InstancedMesh(geo, mat, this.maxParticles);
    this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.particleMesh.frustumCulled = false;

    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        active: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 1,
        scale: 1,
        color: new THREE.Color(0x38bdf8),
      });
      _mat4.makeScale(0, 0, 0);
      this.particleMesh.setMatrixAt(i, _mat4);
      this.particleMesh.setColorAt(i, new THREE.Color(0x38bdf8));
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
    if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;
    this.scene.add(this.particleMesh);
  }

  public spawnBurst(
    origin: { x: number; y: number; z: number },
    colorHex: number,
    count = 26,
    spread = 1.6,
    upVel = 2.6,
  ) {
    let spawned = 0;
    for (let i = 0; i < this.maxParticles && spawned < count; i++) {
      const p = this.particles[i];
      if (!p.active) {
        p.active = true;
        p.pos.set(
          origin.x + (Math.random() - 0.5) * 0.45,
          origin.y + Math.random() * 0.25,
          origin.z + (Math.random() - 0.5) * 0.45,
        );
        p.vel.set(
          (Math.random() - 0.5) * spread,
          Math.random() * upVel + 0.6,
          (Math.random() - 0.5) * spread,
        );
        p.life = 0;
        p.maxLife = 0.65 + Math.random() * 0.45;
        p.scale = 0.75 + Math.random() * 0.9;
        p.color.setHex(colorHex);
        spawned++;
      }
    }
  }

  public showFloorFeedback(type: 'success' | 'error', x = this.playerPos.x, z = this.playerPos.z) {
    this.feedbackRing.mesh.position.set(x, 0.03, z);
    this.feedbackRing.material.color.setHex(type === 'success' ? 0x10b981 : 0xef4444);
    this.feedbackRing.material.opacity = 0.95;
    this.feedbackRing.mesh.scale.setScalar(0.8);
    this.feedbackTimer = 1.1;
  }

  public triggerThermometerLaser() {
    this.laserTimer = 1.4;
    this.scaleRig.laserBeam.visible = true;
  }

  public triggerTruckRejectionSequence() {
    this.truckAnimMode = 'departing';
  }

  public triggerTruckArrivalBatch2() {
    this.truckPosZ = -18;
    this.truckRig.sealPlaque.visible = true;
    this.truckAnimMode = 'arriving';
  }

  public triggerProcessingAnimation() {
    this.processingAnimTimer = 2.2;
  }

  public triggerPphoSpray() {
    const spots = [
      { x: -1.7, y: 1.2, z: -0.2 },
      { x: -2.6, y: 1.3, z: -0.2 },
      { x: -0.9, y: 1.3, z: -0.2 },
      { x: 5.7, y: 1.4, z: -4.0 },
      { x: 5.7, y: 1.0, z: 4.3 },
      { x: 12.5, y: 0.9, z: -2.6 },
    ];
    spots.forEach((s) => this.spawnBurst(s, 0xe0f2fe, 15, 2.2, 1.8));
    this.pphoGleamMats.forEach((m) => {
      m.roughness = 0.24;
    });
  }

  public syncState(next: SceneVisualState) {
    this.state = next;

    // Update worker PPE visuals
    this.worker.toucaMesh.visible = next.ppe.touca;
    this.worker.mascaraMesh.visible = next.ppe.mascara;
    this.worker.apronMesh.visible = next.ppe.avental;
    this.worker.leftBootWhite.visible = next.ppe.botas;
    this.worker.rightBootWhite.visible = next.ppe.botas;
    this.worker.leftShoeStreet.visible = !next.ppe.botas;
    this.worker.rightShoeStreet.visible = !next.ppe.botas;

    // Update Truck seal & scale
    this.truckRig.sealPlaque.visible = next.batchIndex === 2;
    this.scaleRig.crateOnScale.visible = next.batch2Approved;
    this.scaleRig.readout.update(
      'BALANÇA',
      next.batch2Approved ? '184.5 kg' : '0.0 kg',
      next.batch2Approved ? '#34d399' : '#94a3b8',
    );

    // Update AC screen
    const acColor = next.manipRoomTemp <= 16 ? '#38bdf8' : '#f59e0b';
    this.acRig.readout.update('SALA CLIM.', `${next.manipRoomTemp.toFixed(1)}°C`, acColor);

    // Update Stuffer sausage output
    this.stufferRig.sausageCoil.visible = next.manipProcessed;

    // Update Oven screen & glow
    const ovenColor = next.cozCoreTemp >= 72 ? '#34d399' : next.cozHeating ? '#fb923c' : '#38bdf8';
    this.ovenRig.readout.update('CENTRO TÉRM.', `${next.cozCoreTemp.toFixed(1)}°C`, ovenColor);
    const glowMat = this.ovenRig.glowWindow.material as THREE.MeshStandardMaterial;
    glowMat.emissiveIntensity = next.cozHeating ? 1.4 : 0.2;

    // Update Rack Cart position (in oven vs in cooling tank vs standby)
    if (next.cozCooled) {
      this.cartTargetZ = 4.3;
    } else if (next.cozHeating) {
      this.cartTargetZ = -3.6;
    } else {
      this.cartTargetZ = -1.6;
    }

    // Update Camara Fria boxes
    this.palletRig.boxesOnPallet.visible = next.boxesOnPallet;
    this.palletRig.boxesOnFloor.visible = next.boxesOnFloor;

    // Update doorway gate visual colors
    const setDoorColor = (id: string, open: boolean) => {
      const mesh = this.doorBars[id];
      if (!mesh) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (open) {
        mat.color.setHex(0x10b981);
        mat.emissive.setHex(0x10b981);
        mat.opacity = 0.25;
        mesh.position.y = 0.08;
      } else {
        mat.color.setHex(0xef4444);
        mat.emissive.setHex(0xef4444);
        mat.opacity = 0.72;
        mesh.position.y = 0.72;
      }
    };

    setDoorColor('barreira_to_doca', next.barreiraDone);
    setDoorColor('barreira_to_manip', next.barreiraDone && next.docaDone);
    setDoorColor('doca_to_manip', next.barreiraDone && next.docaDone);
    setDoorColor('manip_to_coz', next.manipDone);
    setDoorColor('coz_to_camara', next.cozimentoDone);
  }

  public resetCamera() {
    this.resettingCamera = true;
  }

  public resetWorld() {
    this.playerPos.set(-12.5, 0, 4.2);
    this.worker.group.position.copy(this.playerPos);
    this.worker.group.rotation.y = 0;
    this.walkTarget = null;
    this.walkMarker.visible = false;
    this.pendingStationOpen = null;
    this.currentRoom = 'barreira';
    this.truckPosZ = -10.35;
    this.truckDoorAngle = 1;
    this.truckAnimMode = 'docked';
    this.truckRig.group.position.z = this.truckPosZ;
    this.pphoGleamMats.forEach((m) => {
      m.roughness = 0.36;
    });
    this.resetCamera();
  }

  public walkToStation(station: StationId) {
    const meta = ROOMS[station];
    this.walkTarget = new THREE.Vector3(meta.walkTarget.x, 0, meta.walkTarget.z);
    this.pendingStationOpen = station;
    this.walkMarker.position.set(meta.walkTarget.x, 0.025, meta.walkTarget.z);
    this.walkMarker.visible = true;
  }

  private bindEvents() {
    const dom = this.renderer.domElement;

    const onPointerDown = (e: PointerEvent) => {
      this.pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      const moved = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
      if (moved > 8) return; // Was dragging OrbitControls

      const rect = dom.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.pointer, this.camera);

      // 1) Check interactive targets (stations, pallet/floor in Camara Fria)
      const meshes = this.clickTargets.map((t) => t.mesh);
      const hits = this.raycaster.intersectObjects(meshes, false);
      if (hits.length > 0) {
        const hitObj = hits[0].object;
        const entry = this.clickTargets.find((t) => t.mesh === hitObj);
        if (entry) {
          if (entry.type === 'pallet' || entry.type === 'floor_zone') {
            if (this.currentRoom === 'camara_fria') {
              this.callbacks.onBoxPlacementClick?.(entry.type === 'pallet');
              return;
            }
          }
          if (entry.type === 'station') {
            const st = entry.id as StationId;
            const target = ROOMS[st].walkTarget;
            const dist = Math.hypot(this.playerPos.x - target.x, this.playerPos.z - target.z);
            if (dist < 2.9 && this.currentRoom === st) {
              this.callbacks.onStationActivate(st);
            } else {
              this.walkToStation(st);
            }
            return;
          }
        }
      }

      // 2) Floor point-and-click walk
      const floorHits = this.raycaster.intersectObject(this.floorPlaneMesh, false);
      if (floorHits.length > 0) {
        const pt = floorHits[0].point;
        const tx = THREE.MathUtils.clamp(pt.x, FACTORY_BOUNDS.minX, FACTORY_BOUNDS.maxX);
        const tz = THREE.MathUtils.clamp(pt.z, FACTORY_BOUNDS.minZ, FACTORY_BOUNDS.maxZ);
        this.walkTarget = new THREE.Vector3(tx, 0, tz);
        this.pendingStationOpen = null;
        this.walkMarker.position.set(tx, 0.025, tz);
        this.walkMarker.visible = true;
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;
      this.keysPressed.add(e.code);
      if (e.code === 'KeyW' || e.code === 'KeyA' || e.code === 'KeyS' || e.code === 'KeyD' ||
          e.code === 'ArrowUp' || e.code === 'ArrowDown' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        this.walkTarget = null;
        this.walkMarker.visible = false;
        this.pendingStationOpen = null;
      }
      if (e.code === 'KeyC') {
        this.resetCamera();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      this.keysPressed.delete(e.code);
    };

    const onResize = () => {
      if (this.disposed) return;
      const w = this.container.clientWidth;
      const h = Math.max(this.container.clientHeight, 1);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };

    dom.addEventListener('pointerdown', onPointerDown);
    dom.addEventListener('pointerup', onPointerUp);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', onResize);

    this.unbindEvents = () => {
      dom.removeEventListener('pointerdown', onPointerDown);
      dom.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
    };
  }

  private unbindEvents = () => {};

  private isDoorLocked(doorId: string): { locked: boolean; reason: 'cross_contamination' | 'sequence'; required: RoomId } {
    if (doorId === 'barreira_to_doca') {
      return {
        locked: !this.state.barreiraDone,
        reason: 'cross_contamination',
        required: 'barreira',
      };
    }
    if (doorId === 'barreira_to_manip' || doorId === 'doca_to_manip') {
      if (!this.state.barreiraDone) {
        return { locked: true, reason: 'cross_contamination', required: 'barreira' };
      }
      if (!this.state.docaDone) {
        return { locked: true, reason: 'sequence', required: 'doca' };
      }
      return { locked: false, reason: 'sequence', required: 'doca' };
    }
    if (doorId === 'manip_to_coz') {
      return {
        locked: !this.state.manipDone,
        reason: 'sequence',
        required: 'manipulacao',
      };
    }
    if (doorId === 'coz_to_camara') {
      return {
        locked: !this.state.cozimentoDone,
        reason: 'sequence',
        required: 'cozimento',
      };
    }
    return { locked: false, reason: 'sequence', required: 'barreira' };
  }

  private tryMovePlayer(dx: number, dz: number, dt: number): boolean {
    const r = 0.36;
    let nx = THREE.MathUtils.clamp(this.playerPos.x + dx, FACTORY_BOUNDS.minX, FACTORY_BOUNDS.maxX);
    let nz = THREE.MathUtils.clamp(this.playerPos.z + dz, FACTORY_BOUNDS.minZ, FACTORY_BOUNDS.maxZ);

    let blockedByDoor: { reason: 'cross_contamination' | 'sequence'; required: RoomId } | null = null;

    // Check X axis
    for (const obs of WALL_COLLIDERS) {
      if (
        nx + r > obs.minX &&
        nx - r < obs.maxX &&
        this.playerPos.z + r > obs.minZ &&
        this.playerPos.z - r < obs.maxZ
      ) {
        if (obs.doorId) {
          const check = this.isDoorLocked(obs.doorId);
          if (check.locked) {
            nx = this.playerPos.x;
            blockedByDoor = { reason: check.reason, required: check.required };
          }
        } else {
          nx = this.playerPos.x;
        }
      }
    }

    // Check Z axis
    for (const obs of WALL_COLLIDERS) {
      if (
        nx + r > obs.minX &&
        nx - r < obs.maxX &&
        nz + r > obs.minZ &&
        nz - r < obs.maxZ
      ) {
        if (obs.doorId) {
          const check = this.isDoorLocked(obs.doorId);
          if (check.locked) {
            nz = this.playerPos.z;
            blockedByDoor = { reason: check.reason, required: check.required };
          }
        } else {
          nz = this.playerPos.z;
        }
      }
    }

    if (blockedByDoor) {
      const now = performance.now();
      if (now - this.lastDoorAlertTime > 1600) {
        this.lastDoorAlertTime = now;
        this.showFloorFeedback('error', this.playerPos.x, this.playerPos.z);
        this.callbacks.onDoorBlocked(blockedByDoor.reason, blockedByDoor.required);
      }
      this.walkTarget = null;
      this.walkMarker.visible = false;
      this.pendingStationOpen = null;
    }

    const moved = Math.hypot(nx - this.playerPos.x, nz - this.playerPos.z);
    if (moved > 0.0005) {
      const yaw = Math.atan2(nx - this.playerPos.x, nz - this.playerPos.z);
      const diff = Math.atan2(Math.sin(yaw - this.worker.group.rotation.y), Math.cos(yaw - this.worker.group.rotation.y));
      this.worker.group.rotation.y += diff * (1 - Math.exp(-14 * dt));
      this.playerPos.set(nx, 0, nz);
      this.worker.group.position.copy(this.playerPos);

      // Room detection
      const nextRoom = getRoomAtPosition(nx, nz);
      if (nextRoom !== this.currentRoom) {
        this.currentRoom = nextRoom;
        this.callbacks.onRoomChange(nextRoom);
      }
      return true;
    }
    return false;
  }

  private updatePlayer(dt: number, elapsed: number) {
    const speed = 5.4;
    let moving = false;

    // Keyboard input relative to camera azimuth
    let inX = 0;
    let inZ = 0;
    if (this.keysPressed.has('KeyW') || this.keysPressed.has('ArrowUp')) inZ -= 1;
    if (this.keysPressed.has('KeyS') || this.keysPressed.has('ArrowDown')) inZ += 1;
    if (this.keysPressed.has('KeyA') || this.keysPressed.has('ArrowLeft')) inX -= 1;
    if (this.keysPressed.has('KeyD') || this.keysPressed.has('ArrowRight')) inX += 1;

    if (inX !== 0 || inZ !== 0) {
      this.camera.getWorldDirection(_camForward);
      _camForward.y = 0;
      _camForward.normalize();
      _camRight.crossVectors(_camForward, THREE.Object3D.DEFAULT_UP).normalize();

      _v1.set(0, 0, 0)
        .addScaledVector(_camForward, -inZ)
        .addScaledVector(_camRight, inX)
        .normalize()
        .multiplyScalar(speed * dt);

      moving = this.tryMovePlayer(_v1.x, _v1.z, dt);
    } else if (this.walkTarget) {
      const dx = this.walkTarget.x - this.playerPos.x;
      const dz = this.walkTarget.z - this.playerPos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.2) {
        this.walkTarget = null;
        this.walkMarker.visible = false;
        if (this.pendingStationOpen) {
          const st = this.pendingStationOpen;
          this.pendingStationOpen = null;
          this.callbacks.onStationActivate(st);
        }
      } else {
        const step = Math.min(dist, speed * dt);
        moving = this.tryMovePlayer((dx / dist) * step, (dz / dist) * step, dt);
      }
    }

    // Limb walk cycle
    if (moving) {
      const swing = Math.sin(elapsed * 12) * 0.55;
      this.worker.leftLeg.rotation.x = swing;
      this.worker.rightLeg.rotation.x = -swing;
      this.worker.leftArm.rotation.x = -swing * 0.65;
      this.worker.rightArm.rotation.x = swing * 0.65;

      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        this.stepTimer = 0.28;
        sfx.playStep();
      }
    } else {
      const damp = 1 - Math.exp(-10 * dt);
      this.worker.leftLeg.rotation.x *= 1 - damp;
      this.worker.rightLeg.rotation.x *= 1 - damp;
      this.worker.leftArm.rotation.x *= 1 - damp;
      this.worker.rightArm.rotation.x *= 1 - damp;
    }

    // Walk marker pulse
    if (this.walkMarker.visible) {
      const s = 1 + Math.sin(elapsed * 8) * 0.14;
      this.walkMarker.scale.setScalar(s);
    }
  }

  private updateWorldAnimations(dt: number, elapsed: number) {
    // 1. Floating pulsing 3D station beacons
    (Object.keys(this.beacons) as StationId[]).forEach((id) => {
      const b = this.beacons[id];
      const diamond = b.children[0] as THREE.Mesh;
      const ring = b.children[1] as THREE.Mesh;
      const mat = diamond.material as THREE.MeshStandardMaterial;

      const isDone =
        (id === 'barreira' && this.state.barreiraDone) ||
        (id === 'doca' && this.state.docaDone) ||
        (id === 'manipulacao' && this.state.manipDone) ||
        (id === 'cozimento' && this.state.cozimentoDone) ||
        (id === 'camara_fria' && this.state.camaraDone);

      const isCurrent = this.state.activeStation === id;

      if (isDone) {
        mat.color.setHex(0x10b981);
        mat.emissive.setHex(0x10b981);
        (ring.material as THREE.MeshBasicMaterial).color.setHex(0x10b981);
      } else if (isCurrent) {
        mat.color.setHex(0x0284c7);
        mat.emissive.setHex(0x0284c7);
        (ring.material as THREE.MeshBasicMaterial).color.setHex(0x0284c7);
      } else {
        mat.color.setHex(0x94a3b8);
        mat.emissive.setHex(0x64748b);
        (ring.material as THREE.MeshBasicMaterial).color.setHex(0x94a3b8);
      }

      const pulse = isCurrent ? 1 + Math.sin(elapsed * 4.5) * 0.16 : 0.85;
      diamond.scale.setScalar(pulse);
      diamond.position.y = 2.6 + Math.sin(elapsed * 2.5) * 0.14;
      diamond.rotation.y += dt * 1.6;
      ring.scale.setScalar(isCurrent ? 1 + Math.sin(elapsed * 4) * 0.1 : 0.85);
    });

    // 2. Floor feedback ring fadeout
    if (this.feedbackTimer > 0) {
      this.feedbackTimer -= dt;
      this.feedbackRing.material.opacity = Math.max(0, this.feedbackTimer / 1.1);
      const s = 0.85 + (1.1 - this.feedbackTimer) * 0.65;
      this.feedbackRing.mesh.scale.setScalar(s);
    }

    // 3. Laser beam timer
    if (this.laserTimer > 0) {
      this.laserTimer -= dt;
      if (this.laserTimer <= 0) {
        this.scaleRig.laserBeam.visible = false;
      }
    }

    // 4. Refrigerated truck animation
    if (this.truckAnimMode === 'departing') {
      this.truckDoorAngle = Math.max(0, this.truckDoorAngle - dt * 1.8);
      if (this.truckDoorAngle <= 0.05) {
        this.truckPosZ -= dt * 5.5;
        if (this.truckPosZ < -22) {
          this.triggerTruckArrivalBatch2();
        }
      }
    } else if (this.truckAnimMode === 'arriving') {
      this.truckPosZ = THREE.MathUtils.damp(this.truckPosZ, -10.35, 3.2, dt);
      if (Math.abs(this.truckPosZ - -10.35) < 0.08) {
        this.truckPosZ = -10.35;
        this.truckDoorAngle = Math.min(1, this.truckDoorAngle + dt * 1.8);
        if (this.truckDoorAngle >= 0.99) {
          this.truckAnimMode = 'docked';
        }
      }
    }
    this.truckRig.group.position.z = this.truckPosZ;
    this.truckRig.leftDoor.rotation.y = -this.truckDoorAngle * Math.PI * 0.68;
    this.truckRig.rightDoor.rotation.y = this.truckDoorAngle * Math.PI * 0.68;

    // 5. Grinder & Stuffer animation
    if (this.processingAnimTimer > 0) {
      this.processingAnimTimer -= dt;
      this.grinderRig.augerSpinner.rotation.x += dt * 14;
      this.stufferRig.crankGroup.rotation.y += dt * 8;
    }

    // 6. Rack cart smooth slide from oven to cooling tank
    this.rackCart.position.z = THREE.MathUtils.damp(this.rackCart.position.z, this.cartTargetZ, 3.8, dt);

    // 7. Particles
    let anyParticle = false;
    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      anyParticle = true;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        _mat4.makeScale(0, 0, 0);
        this.particleMesh.setMatrixAt(i, _mat4);
      } else {
        p.vel.y -= 5.8 * dt;
        p.pos.addScaledVector(p.vel, dt);
        if (p.pos.y < 0.04) p.pos.y = 0.04;
        const fade = 1 - p.life / p.maxLife;
        _scaleVec.setScalar(p.scale * fade);
        _mat4.compose(p.pos, _quat, _scaleVec);
        this.particleMesh.setMatrixAt(i, _mat4);
        this.particleMesh.setColorAt(i, p.color);
      }
    }
    if (anyParticle) {
      this.particleMesh.instanceMatrix.needsUpdate = true;
      if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;
    }
  }

  private updateCamera(dt: number) {
    if (this.resettingCamera) {
      _v1.set(this.playerPos.x, 0.9, this.playerPos.z);
      _v2.copy(_v1).add(this.defaultCamOffset);
      const alpha = 1 - Math.exp(-6 * dt);
      this.controls.target.lerp(_v1, alpha);
      this.camera.position.lerp(_v2, alpha);
      if (this.camera.position.distanceTo(_v2) < 0.06) {
        this.resettingCamera = false;
      }
    } else if (!this.userOrbiting) {
      _v1.set(this.playerPos.x, 0.9, this.playerPos.z);
      _v2.copy(_v1).sub(this.controls.target);
      const alpha = 1 - Math.exp(-6 * dt);
      _v2.multiplyScalar(alpha);
      this.controls.target.add(_v2);
      this.camera.position.add(_v2);
    }
    this.controls.update();
  }

  private tick = () => {
    if (this.disposed) return;
    const dt = Math.min(this.clock.getDelta(), 0.08);
    const elapsed = this.clock.elapsedTime;

    this.updatePlayer(dt, elapsed);
    this.updateWorldAnimations(dt, elapsed);
    this.updateCamera(dt);

    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.unbindEvents();
    this.controls.dispose();
    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material?.dispose();
        }
      }
    });
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
