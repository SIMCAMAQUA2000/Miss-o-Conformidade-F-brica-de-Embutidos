import * as THREE from 'three';
import {
  createBoxLabelTexture,
  createDigitalReadoutTexture,
} from './textures';

export interface WorkerRig {
  group: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  toucaMesh: THREE.Mesh;
  mascaraMesh: THREE.Mesh;
  leftBootWhite: THREE.Mesh;
  rightBootWhite: THREE.Mesh;
  leftShoeStreet: THREE.Mesh;
  rightShoeStreet: THREE.Mesh;
  apronMesh: THREE.Mesh;
}

export function createWorkerCharacter(shadowTex: THREE.CanvasTexture): WorkerRig {
  const group = new THREE.Group();

  // Contact shadow disc
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 1.1),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.015;
  group.add(shadow);

  const skinMat = new THREE.MeshStandardMaterial({ color: 0xf1c29b, roughness: 0.72, metalness: 0.0 });
  const uniformMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.85, metalness: 0.02 });
  const apronMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.45, metalness: 0.05 });
  const streetShoeMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8, metalness: 0.05 });
  const whiteBootMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.05 });
  const bootSoleMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.65, metalness: 0.05 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.9 });
  const toucaMat = new THREE.MeshStandardMaterial({ color: 0xbae6fd, roughness: 0.75 });
  const maskMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.75 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 });

  // Legs
  const makeLeg = (xOffset: number) => {
    const legPivot = new THREE.Group();
    legPivot.position.set(xOffset, 0.52, 0);

    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.085, 0.36, 10), uniformMat);
    thigh.position.y = -0.18;
    thigh.castShadow = true;
    legPivot.add(thigh);

    // Street shoe (visible initially before boots equipped)
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.25), streetShoeMat);
    shoe.position.set(0, -0.45, 0.04);
    shoe.castShadow = true;
    legPivot.add(shoe);

    // White sanitary rubber boot (hidden until equipped)
    const bootShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.1, 0.28, 10), whiteBootMat);
    bootShaft.position.set(0, -0.34, 0);
    bootShaft.castShadow = true;
    bootShaft.visible = false;
    legPivot.add(bootShaft);

    const bootSole = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.05, 0.27), bootSoleMat);
    bootSole.position.set(0, -0.12, 0.04);
    bootShaft.add(bootSole);

    return { legPivot, shoe, bootShaft };
  };

  const left = makeLeg(-0.14);
  const right = makeLeg(0.14);
  group.add(left.legPivot, right.legPivot);

  // Torso
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.36, 6, 12), uniformMat);
  torso.position.y = 0.92;
  torso.scale.set(1.15, 1, 0.82);
  torso.castShadow = true;
  group.add(torso);

  // Collar / badge
  const badge = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.08, 0.02),
    new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 }),
  );
  badge.position.set(0.12, 1.05, 0.19);
  group.add(badge);

  // Impervious apron (toggled with avental)
  const apronMesh = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.56, 0.05), apronMat);
  apronMesh.position.set(0, 0.85, 0.19);
  apronMesh.castShadow = true;
  apronMesh.visible = false;
  group.add(apronMesh);

  // Arms
  const makeArm = (xOffset: number) => {
    const armPivot = new THREE.Group();
    armPivot.position.set(xOffset, 1.12, 0);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.38, 10), uniformMat);
    sleeve.position.y = -0.19;
    sleeve.castShadow = true;
    armPivot.add(sleeve);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 10), skinMat);
    hand.position.y = -0.4;
    hand.castShadow = true;
    armPivot.add(hand);
    return armPivot;
  };
  const leftArm = makeArm(-0.31);
  const rightArm = makeArm(0.31);
  group.add(leftArm, rightArm);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 16, 14), skinMat);
  head.position.y = 1.44;
  head.castShadow = true;
  group.add(head);

  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.215, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
    hairMat,
  );
  hair.position.set(0, 1.46, -0.01);
  group.add(hair);

  // Eyes
  const eyeGeo = new THREE.SphereGeometry(0.022, 8, 8);
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.07, 1.45, 0.19);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeR.position.set(0.07, 1.45, 0.19);
  group.add(eyeL, eyeR);

  // Touca (hairnet) - hidden until equipped
  const toucaMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.235, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62),
    toucaMat,
  );
  toucaMesh.position.set(0, 1.48, -0.01);
  toucaMesh.castShadow = true;
  toucaMesh.visible = false;
  group.add(toucaMesh);

  // Surgical mask - hidden until equipped
  const mascaraMesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.11, 0.12), maskMat);
  mascaraMesh.position.set(0, 1.37, 0.16);
  mascaraMesh.visible = false;
  group.add(mascaraMesh);

  return {
    group,
    leftLeg: left.legPivot,
    rightLeg: right.legPivot,
    leftArm,
    rightArm,
    toucaMesh,
    mascaraMesh,
    leftBootWhite: left.bootShaft,
    rightBootWhite: right.bootShaft,
    leftShoeStreet: left.shoe,
    rightShoeStreet: right.shoe,
    apronMesh,
  };
}

export function createSinkStation(): THREE.Group {
  const group = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0xdbe3eb, metalness: 0.88, roughness: 0.24 });
  const darkSteel = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.75, roughness: 0.42 });
  const soapMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.35, metalness: 0.05 });
  const alcoholMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.35, metalness: 0.05 });

  // Pedestal legs
  const legGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.82, 8);
  [[-0.48, -0.22], [0.48, -0.22], [-0.48, 0.22], [0.48, 0.22]].forEach(([x, z]) => {
    const leg = new THREE.Mesh(legGeo, darkSteel);
    leg.position.set(x, 0.41, z);
    leg.castShadow = true;
    group.add(leg);
  });

  // Sink basin apron
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.22, 0.58), steel);
  body.position.y = 0.88;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Dark recessed basin interior
  const bowl = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.06, 0.42), darkSteel);
  bowl.position.set(0, 0.98, 0.02);
  group.add(bowl);

  // Backsplash
  const backsplash = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.55, 0.06), steel);
  backsplash.position.set(0, 1.24, -0.26);
  backsplash.castShadow = true;
  group.add(backsplash);

  // Gooseneck faucet via TubeGeometry
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 1.0, -0.2),
    new THREE.Vector3(0, 1.28, -0.18),
    new THREE.Vector3(0, 1.36, -0.02),
    new THREE.Vector3(0, 1.24, 0.06),
  ]);
  const faucet = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.024, 8, false), steel);
  faucet.castShadow = true;
  group.add(faucet);

  // Soap & Alcohol dispensers on backsplash
  const dispenserGeo = new THREE.BoxGeometry(0.14, 0.24, 0.11);
  const soap = new THREE.Mesh(dispenserGeo, soapMat);
  soap.position.set(-0.34, 1.28, -0.18);
  soap.castShadow = true;
  group.add(soap);

  const alcohol = new THREE.Mesh(dispenserGeo, alcoholMat);
  alcohol.position.set(0.34, 1.28, -0.18);
  alcohol.castShadow = true;
  group.add(alcohol);

  // Foot pedal at floor level
  const pedal = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.18), darkSteel);
  pedal.position.set(0, 0.04, 0.28);
  pedal.rotation.x = 0.18;
  group.add(pedal);

  return group;
}

export function createPediluvioStation(): THREE.Group {
  const group = new THREE.Group();
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.42, metalness: 0.05 });
  const liquidMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.12,
    metalness: 0.1,
    transparent: true,
    opacity: 0.85,
  });
  const grateMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.65 });

  // Outer raised frame (4 walls)
  const front = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.14, 0.12), curbMat);
  front.position.set(0, 0.07, 0.72);
  const back = front.clone();
  back.position.z = -0.72;
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 1.56), curbMat);
  left.position.set(-0.79, 0.07, 0);
  const right = left.clone();
  right.position.x = 0.79;
  [front, back, left, right].forEach((m) => {
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
  });

  // Base floor of basin
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.04, 1.34), curbMat);
  base.position.y = 0.02;
  group.add(base);

  // Sanitizing liquid
  const water = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.05, 1.3), liquidMat);
  water.position.y = 0.07;
  group.add(water);

  // Anti-slip slats
  for (let i = -2; i <= 2; i++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.02, 0.07), grateMat);
    slat.position.set(0, 0.085, i * 0.24);
    group.add(slat);
  }

  return group;
}

export function createPpeLocker(): THREE.Group {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.45, metalness: 0.15 });
  const doorMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35, metalness: 0.25 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.5 });

  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.85, 0.55), bodyMat);
  cabinet.position.y = 0.925;
  cabinet.castShadow = true;
  cabinet.receiveShadow = true;
  group.add(cabinet);

  // Two doors
  const doorL = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.65, 0.04), doorMat);
  doorL.position.set(-0.33, 0.92, 0.28);
  const doorR = doorL.clone();
  doorR.position.x = 0.33;
  group.add(doorL, doorR);

  // Top blue header strip
  const header = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.14, 0.57), accentMat);
  header.position.y = 1.88;
  group.add(header);

  // Visible hairnets & boots on top/side shelf
  const toucaProp = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 12, 8),
    new THREE.MeshStandardMaterial({ color: 0xbae6fd, roughness: 0.8 }),
  );
  toucaProp.position.set(-0.35, 2.02, 0);
  group.add(toucaProp);

  const bootProp = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.07, 0.24, 10),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 }),
  );
  bootProp.position.set(0.35, 2.07, 0);
  group.add(bootProp);

  return group;
}

export interface TruckRig {
  group: THREE.Group;
  leftDoor: THREE.Group;
  rightDoor: THREE.Group;
  sealPlaque: THREE.Mesh;
  cargoGroup: THREE.Group;
  meatCuts: THREE.Mesh[];
}

export function createRefrigeratedTruck(): TruckRig {
  const group = new THREE.Group();
  const boxMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35, metalness: 0.1 });
  const cabMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.38, metalness: 0.25 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.1, metalness: 0.6 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85, metalness: 0.05 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.3, metalness: 0.8 });
  const chassisMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.65, metalness: 0.4 });
  const meatMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.45, metalness: 0.05 });

  // Chassis rails
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.22, 6.2), chassisMat);
  chassis.position.set(0, 0.56, -0.3);
  chassis.castShadow = true;
  group.add(chassis);

  // 6 wheels
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.28, 16);
  wheelGeo.rotateZ(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.3, 12);
  hubGeo.rotateZ(Math.PI / 2);

  [[-1.12, -2.5], [1.12, -2.5], [-1.12, 0.8], [1.12, 0.8], [-1.12, 1.85], [1.12, 1.85]].forEach(([x, z]) => {
    const wheel = new THREE.Mesh(wheelGeo, tireMat);
    wheel.position.set(x, 0.42, z);
    wheel.castShadow = true;
    const hub = new THREE.Mesh(hubGeo, rimMat);
    wheel.add(hub);
    group.add(wheel);
  });

  // Cab (at negative Z end, facing away from dock)
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.25, 1.75, 1.7), cabMat);
  cab.position.set(0, 1.55, -2.65);
  cab.castShadow = true;
  group.add(cab);

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.72, 0.08), glassMat);
  windshield.position.set(0, 1.82, -3.51);
  group.add(windshield);

  // Refrigerated cargo box (open at +Z end toward dock)
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.48, 0.14, 4.4), boxMat);
  roof.position.set(0, 2.75, 0.65);
  roof.castShadow = true;
  group.add(roof);

  const floorBox = new THREE.Mesh(new THREE.BoxGeometry(2.48, 0.14, 4.4), chassisMat);
  floorBox.position.set(0, 0.74, 0.65);
  group.add(floorBox);

  const wallL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.95, 4.4), boxMat);
  wallL.position.set(-1.18, 1.75, 0.65);
  wallL.castShadow = true;
  const wallR = wallL.clone();
  wallR.position.x = 1.18;
  const frontWall = new THREE.Mesh(new THREE.BoxGeometry(2.48, 1.95, 0.14), boxMat);
  frontWall.position.set(0, 1.75, -1.48);
  group.add(wallL, wallR, frontWall);

  // Thermo-King refrigeration unit mounted above cab
  const thermoUnit = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.58, 0.45), rimMat);
  thermoUnit.position.set(0, 2.52, -1.72);
  thermoUnit.castShadow = true;
  group.add(thermoUnit);

  // Hinged rear doors (+Z = 2.85)
  const makeDoor = (side: -1 | 1) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 1.18, 1.75, 2.84);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(1.14, 1.92, 0.08), boxMat);
    panel.position.x = -side * 0.57;
    panel.castShadow = true;
    pivot.add(panel);
    // Open outward by default
    pivot.rotation.y = side * (Math.PI * 0.68);
    return pivot;
  };
  const leftDoor = makeDoor(-1);
  const rightDoor = makeDoor(1);
  group.add(leftDoor, rightDoor);

  // Cargo inside truck (hanging meat cuts + crates)
  const cargoGroup = new THREE.Group();
  const meatCuts: THREE.Mesh[] = [];
  for (let i = -1; i <= 1; i++) {
    const cut = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.65, 6, 10), meatMat);
    cut.position.set(i * 0.58, 1.9, 1.6);
    cut.castShadow = true;
    cargoGroup.add(cut);
    meatCuts.push(cut);
  }

  // Inspection Seal plaque inside rear wall
  const sealPlaque = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.24, 0.04, 16),
    new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.35 }),
  );
  sealPlaque.rotation.x = Math.PI / 2;
  sealPlaque.position.set(0.75, 2.25, 2.55);
  sealPlaque.visible = false;
  cargoGroup.add(sealPlaque);

  group.add(cargoGroup);

  return { group, leftDoor, rightDoor, sealPlaque, cargoGroup, meatCuts };
}

export function createScaleAndThermometer(maxAnisotropy: number): {
  group: THREE.Group;
  laserBeam: THREE.Mesh;
  readout: ReturnType<typeof createDigitalReadoutTexture>;
  crateOnScale: THREE.Mesh;
} {
  const group = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0xdbe3eb, metalness: 0.85, roughness: 0.25 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.55 });
  const yellowMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 });

  // Scale platform
  const platform = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.1, 1.0), steel);
  platform.position.set(-0.9, 0.05, 0);
  platform.castShadow = true;
  platform.receiveShadow = true;
  group.add(platform);

  // Scale post & readout
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.05, 10), steel);
  post.position.set(-1.35, 0.55, -0.4);
  group.add(post);

  const readout = createDigitalReadoutTexture(maxAnisotropy);
  readout.update('BALANÇA', '0.0 kg', '#34d399');
  const displayBox = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.3, 0.1), darkMat);
  displayBox.position.set(-1.35, 1.12, -0.4);
  group.add(displayBox);

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.46, 0.24),
    new THREE.MeshBasicMaterial({ map: readout.texture }),
  );
  screen.position.set(-1.35, 1.12, -0.345);
  group.add(screen);

  // Approved crate on scale (hidden until batch 2 approved)
  const crateOnScale = new THREE.Mesh(
    new THREE.BoxGeometry(0.65, 0.36, 0.55),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 }),
  );
  crateOnScale.position.set(-0.9, 0.28, 0);
  crateOnScale.castShadow = true;
  crateOnScale.visible = false;
  group.add(crateOnScale);

  // Pedestal with Infrared Thermometer aimed toward truck
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.14, 0.95, 12), darkMat);
  stand.position.set(0.95, 0.475, 0);
  stand.castShadow = true;
  group.add(stand);

  const irBody = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.3), yellowMat);
  irBody.position.set(0.95, 1.02, -0.05);
  irBody.rotation.x = 0.25;
  irBody.castShadow = true;
  group.add(irBody);

  // Visible red laser ray when measuring
  const laserBeam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.014, 2.6, 8),
    new THREE.MeshBasicMaterial({ color: 0xef4444 }),
  );
  laserBeam.rotation.x = Math.PI / 2 - 0.22;
  laserBeam.position.set(0.95, 1.35, -1.35);
  laserBeam.visible = false;
  group.add(laserBeam);

  return { group, laserBeam, readout, crateOnScale };
}

export function createMeatGrinder(): {
  group: THREE.Group;
  augerSpinner: THREE.Group;
} {
  const group = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0xdbe3eb, metalness: 0.88, roughness: 0.22 });
  const darkSteel = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.45 });
  const accent = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 });

  // Base pedestal
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.18, 0.65), darkSteel);
  base.position.y = 0.09;
  base.castShadow = true;
  group.add(base);

  // Motor housing
  const motor = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.56), steel);
  motor.position.set(-0.08, 0.48, 0);
  motor.castShadow = true;
  group.add(motor);

  // Feed hopper tray on top
  const tray = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.12, 0.54), steel);
  tray.position.set(-0.05, 0.88, 0);
  tray.castShadow = true;
  group.add(tray);

  // Grinder barrel
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.55, 14), steel);
  barrel.rotation.z = Math.PI / 2;
  barrel.position.set(0.42, 0.55, 0);
  barrel.castShadow = true;
  group.add(barrel);

  // Rotating die/auger assembly
  const augerSpinner = new THREE.Group();
  augerSpinner.position.set(0.71, 0.55, 0);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.06, 14), darkSteel);
  ring.rotation.z = Math.PI / 2;
  augerSpinner.add(ring);

  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.24, 0.04), accent);
  blade.position.x = 0.04;
  augerSpinner.add(blade);
  group.add(augerSpinner);

  // Control switch
  const btn = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.08), accent);
  btn.position.set(-0.1, 0.56, 0.3);
  group.add(btn);

  return { group, augerSpinner };
}

export function createSausageStuffer(): {
  group: THREE.Group;
  crankGroup: THREE.Group;
  sausageCoil: THREE.Mesh;
} {
  const group = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.88, roughness: 0.22 });
  const darkSteel = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.75, roughness: 0.4 });
  const sausageMat = new THREE.MeshStandardMaterial({ color: 0xd97757, roughness: 0.42, metalness: 0.05 });

  // Base plate
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.1, 0.62), darkSteel);
  base.position.y = 0.05;
  base.castShadow = true;
  group.add(base);

  // Vertical cylinder
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.85, 16), steel);
  cyl.position.set(0, 0.52, 0);
  cyl.castShadow = true;
  group.add(cyl);

  // Top cap
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.08, 16), darkSteel);
  cap.position.set(0, 0.96, 0);
  group.add(cap);

  // Rotating hand crank
  const crankGroup = new THREE.Group();
  crankGroup.position.set(0, 1.08, 0);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.22, 8), steel);
  rod.position.y = -0.05;
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.04, 0.04), darkSteel);
  bar.position.set(0.14, 0.04, 0);
  crankGroup.add(rod, bar);
  group.add(crankGroup);

  // Stuffing horn nozzle
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.055, 0.38, 10), steel);
  nozzle.rotation.z = -Math.PI / 2;
  nozzle.position.set(0.38, 0.24, 0);
  group.add(nozzle);

  // Sausage coil output (shown when processed)
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.55, 0.22, 0),
    new THREE.Vector3(0.75, 0.12, 0.14),
    new THREE.Vector3(0.65, 0.12, -0.16),
    new THREE.Vector3(0.88, 0.12, -0.02),
  ]);
  const sausageCoil = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.045, 10, false), sausageMat);
  sausageCoil.visible = false;
  sausageCoil.castShadow = true;
  group.add(sausageCoil);

  return { group, crankGroup, sausageCoil };
}

export function createPrepTable(): THREE.Group {
  const group = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.24 });
  const crateMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.55, metalness: 0.02 });

  const top = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.08, 1.1), steel);
  top.position.y = 0.88;
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);

  const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.05, 0.92), steel);
  shelf.position.y = 0.28;
  group.add(shelf);

  const legGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.88, 8);
  [[-1.02, -0.44], [1.02, -0.44], [-1.02, 0.44], [1.02, 0.44]].forEach(([x, z]) => {
    const leg = new THREE.Mesh(legGeo, steel);
    leg.position.set(x, 0.44, z);
    leg.castShadow = true;
    group.add(leg);
  });

  // Two white hygienic plastic crates on table
  const crate1 = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.22, 0.38), crateMat);
  crate1.position.set(-0.62, 1.03, 0.15);
  crate1.castShadow = true;
  const crate2 = crate1.clone();
  crate2.position.set(0.65, 1.03, -0.12);
  group.add(crate1, crate2);

  return group;
}

export function createAcUnit(maxAnisotropy: number): {
  group: THREE.Group;
  readout: ReturnType<typeof createDigitalReadoutTexture>;
} {
  const group = new THREE.Group();
  const casingMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35, metalness: 0.15 });
  const grilleMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6, metalness: 0.4 });

  const box = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.58, 0.42), casingMat);
  box.castShadow = true;
  group.add(box);

  // Twin fan grilles
  [-0.45, 0.45].forEach((x) => {
    const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.05, 16), grilleMat);
    fan.rotation.x = Math.PI / 2;
    fan.position.set(x, 0, 0.2);
    group.add(fan);
  });

  const readout = createDigitalReadoutTexture(maxAnisotropy);
  readout.update('SALA CLIM.', '18.4°C', '#f59e0b');
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.45, 0.24),
    new THREE.MeshBasicMaterial({ map: readout.texture }),
  );
  screen.position.set(0, 0, 0.215);
  group.add(screen);

  return { group, readout };
}

export function createCookingOven(maxAnisotropy: number): {
  group: THREE.Group;
  glowWindow: THREE.Mesh;
  readout: ReturnType<typeof createDigitalReadoutTexture>;
} {
  const group = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0xdbe3eb, metalness: 0.85, roughness: 0.26 });
  const darkSteel = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.65, roughness: 0.45 });

  // Main oven cabinet
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.3, 2.35, 1.8), steel);
  body.position.y = 1.175;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Exhaust chimney
  const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.75, 12), darkSteel);
  chimney.position.set(-0.6, 2.65, -0.3);
  chimney.castShadow = true;
  group.add(chimney);

  // Glass window showing heat glow inside
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: 0xea580c,
    emissiveIntensity: 0.25,
    roughness: 0.15,
  });
  const glowWindow = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.85, 0.05), glowMat);
  glowWindow.position.set(-0.22, 1.25, 0.9);
  group.add(glowWindow);

  // Digital temperature display panel on right side
  const readout = createDigitalReadoutTexture(maxAnisotropy);
  readout.update('CENTRO TÉRM.', '14.0°C', '#38bdf8');
  const panelBack = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.44, 0.08), darkSteel);
  panelBack.position.set(0.68, 1.55, 0.9);
  group.add(panelBack);

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.62, 0.32),
    new THREE.MeshBasicMaterial({ map: readout.texture }),
  );
  screen.position.set(0.68, 1.55, 0.945);
  group.add(screen);

  return { group, glowWindow, readout };
}

export function createCoolingTank(): THREE.Group {
  const group = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0xdbe3eb, metalness: 0.85, roughness: 0.25 });
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x7dd3fc,
    roughness: 0.12,
    metalness: 0.1,
    transparent: true,
    opacity: 0.82,
  });
  const iceMat = new THREE.MeshStandardMaterial({ color: 0xf0f9ff, roughness: 0.2 });

  // Tub walls
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.14, 1.7), steel);
  base.position.y = 0.07;
  group.add(base);

  const wallF = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.85, 0.12), steel);
  wallF.position.set(0, 0.48, 0.79);
  const wallB = wallF.clone();
  wallB.position.z = -0.79;
  const wallL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.85, 1.7), steel);
  wallL.position.set(-1.09, 0.48, 0);
  const wallR = wallL.clone();
  wallR.position.x = 1.09;
  [wallF, wallB, wallL, wallR].forEach((m) => {
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
  });

  // Cold water volume
  const water = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.55, 1.44), waterMat);
  water.position.y = 0.44;
  group.add(water);

  // Floating ice cubes
  const iceGeo = new THREE.BoxGeometry(0.22, 0.14, 0.22);
  [[-0.5, -0.3], [0.4, 0.25], [-0.2, 0.35], [0.6, -0.25]].forEach(([x, z], idx) => {
    const ice = new THREE.Mesh(iceGeo, iceMat);
    ice.position.set(x, 0.72, z);
    ice.rotation.y = idx * 0.6;
    group.add(ice);
  });

  return group;
}

export function createRackCart(): THREE.Group {
  const group = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.24 });
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
  const sausageMat = new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.45 });

  // 4 caster wheels
  const wheelGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.05, 10);
  wheelGeo.rotateZ(Math.PI / 2);
  [[-0.36, -0.32], [0.36, -0.32], [-0.36, 0.32], [0.36, 0.32]].forEach(([x, z]) => {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.position.set(x, 0.08, z);
    group.add(w);
  });

  // Frame posts
  const postGeo = new THREE.CylinderGeometry(0.025, 0.025, 1.32, 8);
  [[-0.36, -0.32], [0.36, -0.32], [-0.36, 0.32], [0.36, 0.32]].forEach(([x, z]) => {
    const p = new THREE.Mesh(postGeo, steel);
    p.position.set(x, 0.74, z);
    p.castShadow = true;
    group.add(p);
  });

  // Cross bars + hanging sausage links
  [0.95, 1.32].forEach((y) => {
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.76, 8), steel);
    bar.rotation.z = Math.PI / 2;
    bar.position.y = y;
    group.add(bar);

    for (let i = -2; i <= 2; i++) {
      const link = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.2, 4, 8), sausageMat);
      link.position.set(i * 0.14, y - 0.16, 0);
      link.castShadow = true;
      group.add(link);
    }
  });

  return group;
}

export function createPlasticPalletAndBoxes(maxAnisotropy: number): {
  palletGroup: THREE.Group;
  boxesOnPallet: THREE.Group;
  boxesOnFloor: THREE.Group;
} {
  const palletGroup = new THREE.Group();
  const palletMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.52, metalness: 0.05 });

  // Raised corner feet (15cm sanitary clearance)
  const footGeo = new THREE.BoxGeometry(0.24, 0.16, 0.24);
  [[-0.9, -0.9], [0, -0.9], [0.9, -0.9], [-0.9, 0.9], [0, 0.9], [0.9, 0.9]].forEach(([x, z]) => {
    const foot = new THREE.Mesh(footGeo, palletMat);
    foot.position.set(x, 0.08, z);
    foot.castShadow = true;
    palletGroup.add(foot);
  });

  // Slatted top deck
  for (let i = -3; i <= 3; i++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.06, 0.2), palletMat);
    slat.position.set(0, 0.19, i * 0.3);
    slat.castShadow = true;
    slat.receiveShadow = true;
    palletGroup.add(slat);
  }

  const labelTex = createBoxLabelTexture('EMBUTIDOS BPF', 'LOTE 042 · 2°C', maxAnisotropy);
  const boxMat = new THREE.MeshStandardMaterial({ map: labelTex, roughness: 0.6, metalness: 0.02 });
  const boxGeo = new THREE.BoxGeometry(0.68, 0.44, 0.58);

  const boxesOnPallet = new THREE.Group();
  [
    [-0.48, 0.44, -0.45],
    [0.48, 0.44, -0.45],
    [-0.48, 0.44, 0.45],
    [0.48, 0.44, 0.45],
    [0, 0.88, 0],
  ].forEach(([x, y, z]) => {
    const b = new THREE.Mesh(boxGeo, boxMat);
    b.position.set(x, y, z);
    b.castShadow = true;
    boxesOnPallet.add(b);
  });
  boxesOnPallet.visible = false;

  const boxesOnFloor = new THREE.Group();
  [[-0.38, 0.22, 0], [0.38, 0.22, 0]].forEach(([x, y, z]) => {
    const b = new THREE.Mesh(boxGeo, boxMat);
    b.position.set(x, y, z);
    b.castShadow = true;
    boxesOnFloor.add(b);
  });
  boxesOnFloor.visible = false;

  return { palletGroup, boxesOnPallet, boxesOnFloor };
}

export function createFloorDrain(): THREE.Group {
  const group = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8, roughness: 0.35 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });

  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.015, 0.46), frameMat);
  frame.position.y = 0.008;
  group.add(frame);

  const hole = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.018, 0.36), darkMat);
  hole.position.y = 0.009;
  group.add(hole);

  for (let i = -2; i <= 2; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.02, 0.03), frameMat);
    bar.position.set(0, 0.011, i * 0.07);
    group.add(bar);
  }
  return group;
}

export function createStationBeacon(colorHex: number): THREE.Group {
  const group = new THREE.Group();

  const cone = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.28, 0),
    new THREE.MeshStandardMaterial({
      color: colorHex,
      emissive: colorHex,
      emissiveIntensity: 0.45,
      roughness: 0.25,
      metalness: 0.2,
    }),
  );
  cone.position.y = 2.65;
  group.add(cone);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.68, 32),
    new THREE.MeshBasicMaterial({
      color: colorHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.025;
  group.add(ring);

  return group;
}

export function createFloorFeedbackRing(): {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
} {
  const material = new THREE.MeshBasicMaterial({
    color: 0x10b981,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.RingGeometry(0.65, 0.92, 36), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.03;
  return { mesh, material };
}
