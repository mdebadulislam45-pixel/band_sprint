import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Mic,
  PenTool,
  BookOpen,
  Headphones,
  Volume2,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';
import { soundManager } from '../../utils/audioEffects';

export type StudioCameraPreset = 'desk' | 'mic' | 'orb' | 'wide';

interface Sprint3DStudioProps {
  activeSpeakingPart?: 1 | 2 | 3;
  isVoiceActive?: boolean;
  onSelectSpeakingPart?: (part: 1 | 2 | 3) => void;
  onLaunchSpeakingStudio?: () => void;
  onLaunchWritingEvaluator?: () => void;
  onLaunchVocabBuilder?: () => void;
  onLaunchListeningLab?: () => void;
}

export const Sprint3DStudio: React.FC<Sprint3DStudioProps> = ({
  activeSpeakingPart = 1,
  isVoiceActive = false,
  onLaunchSpeakingStudio,
  onLaunchWritingEvaluator,
  onLaunchVocabBuilder,
  onLaunchListeningLab
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [cameraPreset, setCameraPreset] = useState<StudioCameraPreset>('desk');
  const [acousticPulse, setAcousticPulse] = useState<boolean>(false);
  const [selectedHotspot, setSelectedHotspot] = useState<{
    id: string;
    title: string;
    subtitle: string;
    actionLabel: string;
  } | null>({
    id: 'mic',
    title: 'Practice Acoustic Examination Desk',
    subtitle: 'IELTS Parts 1–3 interview environment with British RP voice assessment.',
    actionLabel: 'Enter Speaking Studio'
  });
  const [isExpanded, setIsExpanded] = useState(false);

  const cameraTargetRef = useRef<{ pos: THREE.Vector3; lookAt: THREE.Vector3 }>({
    pos: new THREE.Vector3(0, 2.35, 4.4),
    lookAt: new THREE.Vector3(0, 1.15, 0)
  });

  const pulseRef = useRef<boolean>(false);
  useEffect(() => {
    pulseRef.current = acousticPulse || isVoiceActive;
  }, [acousticPulse, isVoiceActive]);

  const applyCameraPreset = (preset: StudioCameraPreset) => {
    setCameraPreset(preset);
    soundManager.playBeep(620, 0.03);
    if (preset === 'desk') {
      cameraTargetRef.current = {
        pos: new THREE.Vector3(0, 2.35, 4.4),
        lookAt: new THREE.Vector3(0, 1.15, 0)
      };
    } else if (preset === 'mic') {
      cameraTargetRef.current = {
        pos: new THREE.Vector3(-0.65, 1.72, 1.85),
        lookAt: new THREE.Vector3(-0.45, 1.38, 0.25)
      };
    } else if (preset === 'orb') {
      cameraTargetRef.current = {
        pos: new THREE.Vector3(0.4, 2.05, 2.2),
        lookAt: new THREE.Vector3(0, 1.75, -0.3)
      };
    } else {
      cameraTargetRef.current = {
        pos: new THREE.Vector3(2.9, 3.1, 5.2),
        lookAt: new THREE.Vector3(0, 1.2, -0.2)
      };
    }
  };

  const handleTestStudioAcoustics = () => {
    if (acousticPulse) {
      stopSpeech();
      setAcousticPulse(false);
      return;
    }
    setAcousticPulse(true);
    soundManager.playBeep(680, 0.04);
    speakBritish(
      'Welcome to the Practice Set 3D Acoustic Examination Studio. Spatial audio calibration and real-time voice resonance are active for Part 1, Part 2, and Part 3.',
      {
        speakerId: 'speaker_04',
        gender: 'male',
        onEnd: () => setAcousticPulse(false),
        onError: () => setAcousticPulse(false)
      }
    );
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070d19);
    scene.fog = new THREE.FogExp2(0x070d19, 0.065);

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 440;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 2.35, 4.4);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance'
      });
    } catch {
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 2. Studio PBR Environment (RoomEnvironment + PMREMGenerator)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envMap = pmremGenerator.fromScene(roomEnv, 0.04).texture;
    scene.environment = envMap;
    roomEnv.dispose();
    pmremGenerator.dispose();

    // 3. OrbitControls with Damping
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.03;
    controls.minDistance = 1.4;
    controls.maxDistance = 8.5;
    controls.target.set(0, 1.15, 0);

    // Cancel camera preset auto-lerp when user manually drags
    let isUserInteracting = false;
    const onControlStart = () => {
      isUserInteracting = true;
    };
    controls.addEventListener('start', onControlStart);

    // 4. Three-Point Studio Lighting
    const ambientLight = new THREE.AmbientLight(0x1e293b, 0.7);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff4e6, 2.6);
    keyLight.position.set(3.5, 5.5, 4.0);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 15;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 1.15);
    fillLight.position.set(-4.0, 3.0, 2.0);
    scene.add(fillLight);

    const rimLight = new THREE.SpotLight(0xf59e0b, 3.2, 12, Math.PI / 4, 0.5, 1.2);
    rimLight.position.set(0, 4.5, -3.2);
    scene.add(rimLight);

    // Interactive Clickable Registry
    const interactableMeshes: THREE.Object3D[] = [];

    // =========================================================================
    // COMPOSITE MODEL 1: ARCHITECTURAL CAMBRIDGE ACOUSTIC BOOTH (8 parts)
    // =========================================================================
    const boothGroup = new THREE.Group();
    scene.add(boothGroup);

    // 1A. Acoustic Studio Pedestal Floor (Circular dual-tier stage)
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.35,
      metalness: 0.25
    });
    const mainStage = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 4.0, 0.16, 64), floorMat);
    mainStage.position.y = -0.08;
    mainStage.receiveShadow = true;
    boothGroup.add(mainStage);

    // Brass rim ring around stage
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.22,
      metalness: 0.88
    });
    const stageRim = new THREE.Mesh(new THREE.TorusGeometry(3.82, 0.025, 16, 96), brassMat);
    stageRim.rotation.x = Math.PI / 2;
    stageRim.position.y = 0.01;
    boothGroup.add(stageRim);

    // 1B. Curved Acoustic Slat Wall (19 Walnut Diffuser Fins)
    const slatMat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.45,
      metalness: 0.15
    });
    const backWallMat = new THREE.MeshStandardMaterial({
      color: 0x090f1d,
      roughness: 0.85,
      metalness: 0.1
    });

    const curvedBackPanel = new THREE.Mesh(
      new THREE.CylinderGeometry(3.4, 3.4, 3.4, 48, 1, true, Math.PI * 0.65, Math.PI * 0.7),
      backWallMat
    );
    curvedBackPanel.material.side = THREE.DoubleSide;
    curvedBackPanel.position.set(0, 1.7, 0);
    boothGroup.add(curvedBackPanel);

    const slatGeo = new THREE.BoxGeometry(0.08, 3.1, 0.14);
    const totalSlats = 19;
    for (let i = 0; i < totalSlats; i++) {
      const angle = Math.PI + ((i - (totalSlats - 1) / 2) / totalSlats) * (Math.PI * 0.65);
      const radius = 3.25;
      const slat = new THREE.Mesh(slatGeo, slatMat);
      slat.position.set(Math.sin(angle) * radius, 1.6, Math.cos(angle) * radius);
      slat.rotation.y = angle;
      slat.castShadow = true;
      slat.receiveShadow = true;
      boothGroup.add(slat);
    }

    // 1C. Glowing Studio Acoustic LED Header Bar
    const ledStripMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.6,
      roughness: 0.2
    });
    const ledArc = new THREE.Mesh(
      new THREE.TorusGeometry(3.22, 0.025, 12, 64, Math.PI * 0.65),
      ledStripMat
    );
    ledArc.rotation.x = Math.PI / 2;
    ledArc.rotation.z = Math.PI * 0.675;
    ledArc.position.set(0, 3.18, 0);
    boothGroup.add(ledArc);

    // =========================================================================
    // COMPOSITE MODEL 2: EXAMINER DESK & CUE CARD CONSOLE (7 parts)
    // =========================================================================
    const deskGroup = new THREE.Group();
    scene.add(deskGroup);

    const mahoganyMat = new THREE.MeshStandardMaterial({
      color: 0x3b190b,
      roughness: 0.28,
      metalness: 0.12
    });
    const darkSteelMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.3,
      metalness: 0.85
    });

    // Tabletop
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.09, 1.15), mahoganyMat);
    tableTop.position.set(0, 0.95, 0.35);
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    deskGroup.add(tableTop);

    // Brass front trim on desk
    const deskTrim = new THREE.Mesh(new THREE.BoxGeometry(2.32, 0.03, 0.02), brassMat);
    deskTrim.position.set(0, 0.95, 0.925);
    deskGroup.add(deskTrim);

    // 2 Brushed Steel Architectural Legs + Crossbar
    const legGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.92, 24);
    const leftLeg = new THREE.Mesh(legGeo, darkSteelMat);
    leftLeg.position.set(-0.92, 0.46, 0.35);
    leftLeg.castShadow = true;
    deskGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, darkSteelMat);
    rightLeg.position.set(0.92, 0.46, 0.35);
    rightLeg.castShadow = true;
    deskGroup.add(rightLeg);

    const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.84, 16), darkSteelMat);
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position.set(0, 0.28, 0.35);
    deskGroup.add(crossbar);

    // Official Cue Card Display Tablet on Desk (Interactive Hotspot)
    const cueStandGroup = new THREE.Group();
    cueStandGroup.position.set(0.52, 1.0, 0.42);
    cueStandGroup.rotation.y = -0.32;
    deskGroup.add(cueStandGroup);

    const standBase = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.03, 0.3), darkSteelMat);
    cueStandGroup.add(standBase);

    const tabletScreenMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.75,
      roughness: 0.15,
      metalness: 0.4
    });
    const tabletFrame = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.36, 0.025), brassMat);
    tabletFrame.position.set(0, 0.19, -0.02);
    tabletFrame.rotation.x = -0.35;
    tabletFrame.userData = {
      hotspotId: 'cuecard',
      title: `Official Part ${activeSpeakingPart} Cue Card & Timer Console`,
      subtitle: 'Interactive Practice rubric prompts with 1-minute prep & 2-minute monologue pacing.',
      actionLabel: 'Cycle Speaking Part (1 / 2 / 3)'
    };
    interactableMeshes.push(tabletFrame);
    cueStandGroup.add(tabletFrame);

    const tabletScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.47, 0.31), tabletScreenMat);
    tabletScreen.position.set(0, 0.19, -0.005);
    tabletScreen.rotation.x = -0.35;
    tabletScreen.userData = tabletFrame.userData;
    interactableMeshes.push(tabletScreen);
    cueStandGroup.add(tabletScreen);

    // =========================================================================
    // COMPOSITE MODEL 3: ARTICULATED STUDIO CONDENSER MICROPHONE (9 parts)
    // =========================================================================
    const micAssembly = new THREE.Group();
    micAssembly.position.set(-0.52, 0.99, 0.42);
    scene.add(micAssembly);

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.15,
      metalness: 0.92
    });

    // Weighted Base
    const micBase = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.04, 32), darkSteelMat);
    micBase.castShadow = true;
    micAssembly.add(micBase);

    const micBaseRing = new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.008, 12, 32), brassMat);
    micBaseRing.rotation.x = Math.PI / 2;
    micBaseRing.position.y = 0.02;
    micAssembly.add(micBaseRing);

    // Lower Boom Arm
    const lowerArm = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.38, 16), darkSteelMat);
    lowerArm.position.set(-0.04, 0.19, 0);
    lowerArm.rotation.z = 0.22;
    micAssembly.add(lowerArm);

    // Articulated Elbow Joint
    const elbowJoint = new THREE.Mesh(new THREE.SphereGeometry(0.032, 16, 16), brassMat);
    elbowJoint.position.set(-0.08, 0.37, 0);
    micAssembly.add(elbowJoint);

    // Upper Boom Arm
    const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.34, 16), darkSteelMat);
    upperArm.position.set(0.06, 0.46, 0);
    upperArm.rotation.z = -1.05;
    micAssembly.add(upperArm);

    // Shock Mount Ring + Condenser Body + Mesh Capsule
    const capsuleGroup = new THREE.Group();
    capsuleGroup.position.set(0.21, 0.48, 0);
    micAssembly.add(capsuleGroup);

    const shockMountOuter = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.008, 12, 32), chromeMat);
    shockMountOuter.rotation.x = Math.PI / 2;
    capsuleGroup.add(shockMountOuter);

    const micBody = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.16, 24), brassMat);
    micBody.castShadow = true;
    micBody.userData = {
      hotspotId: 'mic',
      title: 'Practice Acoustic Desk Microphone',
      subtitle: 'Calibrated for IELTS Parts 1–3 fluency, lexical resource, and pronunciation assessment.',
      actionLabel: 'Enter Speaking Studio'
    };
    interactableMeshes.push(micBody);
    capsuleGroup.add(micBody);

    const capsuleGrilleMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.35,
      metalness: 0.85,
      wireframe: false
    });
    const capsuleGrille = new THREE.Mesh(new THREE.SphereGeometry(0.043, 24, 16), capsuleGrilleMat);
    capsuleGrille.position.y = 0.095;
    capsuleGrille.scale.set(1, 1.25, 1);
    capsuleGrille.userData = micBody.userData;
    interactableMeshes.push(capsuleGrille);
    capsuleGroup.add(capsuleGrille);

    // Reactive LED Ring on Microphone
    const micLedMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 2.0
    });
    const micLedRing = new THREE.Mesh(new THREE.TorusGeometry(0.044, 0.006, 12, 32), micLedMat);
    micLedRing.rotation.x = Math.PI / 2;
    micLedRing.position.y = 0.04;
    capsuleGroup.add(micLedRing);

    // =========================================================================
    // COMPOSITE MODEL 4: BAND 9 ACOUSTIC RESONANCE CORE & FREQUENCY RINGS
    // =========================================================================
    const coreGroup = new THREE.Group();
    coreGroup.position.set(0, 1.85, -0.35);
    scene.add(coreGroup);

    const coreCrystalMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.65,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.85,
      thickness: 0.8,
      ior: 1.45
    });

    const coreSphere = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 2), coreCrystalMat);
    coreSphere.userData = {
      hotspotId: 'orb',
      title: 'Practice AI Speaking Studio Core',
      subtitle: 'Real-time British RP voice examiner with instant grammar and fluency feedback.',
      actionLabel: 'Enter Speaking Studio'
    };
    interactableMeshes.push(coreSphere);
    coreGroup.add(coreSphere);

    const gyroRing1 = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.014, 16, 64), brassMat);
    coreGroup.add(gyroRing1);

    const gyroRing2 = new THREE.Mesh(new THREE.TorusGeometry(0.54, 0.01, 16, 64), chromeMat);
    gyroRing2.rotation.x = Math.PI / 3;
    coreGroup.add(gyroRing2);

    // 24 Reactive 3D Frequency Equalizer Pillars arranged in an arc behind the desk
    const freqBars: THREE.Mesh[] = [];
    const barCount = 24;
    const barGeo = new THREE.BoxGeometry(0.045, 0.3, 0.045);
    for (let i = 0; i < barCount; i++) {
      const barMat = new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? 0x38bdf8 : 0xf59e0b,
        emissive: i % 2 === 0 ? 0x0284c7 : 0xd97706,
        emissiveIntensity: 0.8,
        roughness: 0.25,
        metalness: 0.7
      });
      const bar = new THREE.Mesh(barGeo, barMat);
      const t = (i / (barCount - 1)) * 2 - 1; // -1 to 1
      const angle = t * 0.85;
      const rad = 1.65;
      bar.position.set(Math.sin(angle) * rad, 1.15, -Math.cos(angle) * rad + 0.35);
      bar.rotation.y = -angle;
      scene.add(bar);
      freqBars.push(bar);
    }

    // =========================================================================
    // RAYCASTER INTERACTION
    // =========================================================================
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };

    const onPointerDown = (e: MouseEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: MouseEvent) => {
      const dx = Math.abs(e.clientX - pointerDownPos.x);
      const dy = Math.abs(e.clientY - pointerDownPos.y);
      if (dx > 6 || dy > 6) return; // Ignore drag movements

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(interactableMeshes, false);
      if (hits.length > 0) {
        const data = hits[0].object.userData;
        if (data && data.hotspotId) {
          isUserInteracting = false;
          soundManager.playBeep(700, 0.04);
          setSelectedHotspot({
            id: data.hotspotId,
            title: data.title,
            subtitle: data.subtitle,
            actionLabel: data.actionLabel
          });
          if (data.hotspotId === 'mic') applyCameraPreset('mic');
          if (data.hotspotId === 'orb') applyCameraPreset('orb');
          if (data.hotspotId === 'cuecard') applyCameraPreset('desk');
        }
      }
    };

    renderer.domElement.addEventListener('mousedown', onPointerDown);
    renderer.domElement.addEventListener('mouseup', onPointerUp);

    // =========================================================================
    // RESIZE OBSERVER
    // =========================================================================
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    // =========================================================================
    // ANIMATION LOOP
    // =========================================================================
    const clock = new THREE.Clock();
    let reqId = 0;

    const animate = () => {
      reqId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      const activeAudio = pulseRef.current;

      // Rotate Band 9 Acoustic Core & Gyroscope Rings
      coreSphere.rotation.y = elapsed * 0.7;
      coreSphere.rotation.x = Math.sin(elapsed * 0.5) * 0.25;
      coreSphere.position.y = Math.sin(elapsed * 1.8) * 0.04;

      gyroRing1.rotation.y = -elapsed * 0.9;
      gyroRing1.rotation.x = Math.cos(elapsed * 0.6) * 0.4;

      gyroRing2.rotation.z = elapsed * 0.65;
      gyroRing2.rotation.y = Math.sin(elapsed * 0.4) * 0.5;

      // Pulse Core & Frequency Bars when Voice is Active
      const pulseScale = activeAudio ? 1 + Math.sin(elapsed * 14) * 0.14 : 1 + Math.sin(elapsed * 2) * 0.03;
      coreSphere.scale.setScalar(pulseScale);
      coreCrystalMat.emissiveIntensity = activeAudio ? 1.4 + Math.sin(elapsed * 16) * 0.5 : 0.65;
      micLedMat.emissiveIntensity = activeAudio ? 2.5 + Math.sin(elapsed * 12) * 0.8 : 1.2;

      for (let i = 0; i < freqBars.length; i++) {
        const bar = freqBars[i];
        const wave = activeAudio
          ? 0.45 + Math.abs(Math.sin(elapsed * 10 + i * 0.55)) * 1.65
          : 0.25 + Math.abs(Math.sin(elapsed * 2.2 + i * 0.35)) * 0.35;
        bar.scale.y = wave;
      }

      // Smooth Camera Preset Interpolation when not manually dragging
      if (!isUserInteracting) {
        camera.position.lerp(cameraTargetRef.current.pos, 0.045);
        controls.target.lerp(cameraTargetRef.current.lookAt, 0.045);
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(reqId);
      resizeObserver.disconnect();
      controls.removeEventListener('start', onControlStart);
      controls.dispose();
      renderer.domElement.removeEventListener('mousedown', onPointerDown);
      renderer.domElement.removeEventListener('mouseup', onPointerUp);
      envMap.dispose();
      scene.traverse((obj) => {
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
      renderer.dispose();
    };
  }, [activeSpeakingPart]);

  return (
    <div
      className={`relative w-full rounded-3xl overflow-hidden border border-slate-800 bg-[#070d19] shadow-2xl transition-all ${
        isExpanded ? 'h-[540px] sm:h-[620px]' : 'h-[390px] sm:h-[440px]'
      }`}
    >
      {/* 3D WebGL Canvas Mount */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        aria-label="Interactive 3D Practice Speaking & Acoustic Studio"
      />

      {/* Top-Left Translucent Glass HUD: Title & Live Status */}
      <div className="pointer-events-none absolute top-3.5 left-3.5 right-3.5 flex flex-wrap items-start justify-between gap-2">
        <div className="pointer-events-auto backdrop-blur-md bg-slate-950/70 border border-white/10 rounded-2xl px-3.5 py-2.5 text-white shadow-lg max-w-md">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-sky-400">
              3D Spatial Practice Exam Studio · WebGL PBR
            </span>
          </div>
          <h3 className="text-xs sm:text-sm font-black tracking-tight mt-0.5">
            Interactive Acoustic Speaking Booth & AI Examiner Rig
          </h3>
          <p className="text-[11px] text-slate-300 mt-0.5 hidden sm:block">
            Drag to orbit 360° · Click the 3D Condenser Mic, Resonance Core, or Cue Card Tablet to inspect.
          </p>
        </div>

        {/* Top-Right Camera Preset Switcher */}
        <div className="pointer-events-auto flex items-center gap-1.5 backdrop-blur-md bg-slate-950/75 border border-white/10 rounded-2xl p-1.5 shadow-lg">
          {(
            [
              { id: 'desk', label: 'Examiner Desk' },
              { id: 'mic', label: 'Condenser Mic' },
              { id: 'orb', label: 'Live AI Core' },
              { id: 'wide', label: 'Studio Orbit' }
            ] as const
          ).map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyCameraPreset(preset.id)}
              className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition cursor-pointer ${
                cameraPreset === preset.id
                  ? 'bg-sky-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              {preset.label}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title={isExpanded ? 'Compact 3D Studio' : 'Expand 3D Studio'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Bottom Translucent Glass Action Bar */}
      <div className="pointer-events-none absolute bottom-3.5 left-3.5 right-3.5 flex flex-col sm:flex-row sm:items-end justify-between gap-2.5">
        {selectedHotspot && (
          <div className="pointer-events-auto backdrop-blur-md bg-slate-950/75 border border-white/15 rounded-2xl p-3 text-white shadow-xl max-w-md space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono font-bold uppercase text-amber-300">
                Selected 3D Instrument
              </span>
              <span className="text-[10px] font-mono text-slate-400">Part {activeSpeakingPart} Active</span>
            </div>
            <div className="text-xs sm:text-sm font-black text-white">{selectedHotspot.title}</div>
            <p className="text-[11px] text-slate-300 leading-snug">{selectedHotspot.subtitle}</p>
          </div>
        )}

        <div className="pointer-events-auto flex flex-wrap items-center gap-2 self-start sm:self-end">
          <button
            type="button"
            onClick={handleTestStudioAcoustics}
            className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer backdrop-blur-md whitespace-nowrap ${
              acousticPulse
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg'
                : 'bg-slate-900/80 hover:bg-slate-800 text-white border-white/15'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>{acousticPulse ? 'Stop Audio' : 'Test Acoustics'}</span>
          </button>

          {onLaunchSpeakingStudio && (
            <button
              type="button"
              onClick={onLaunchSpeakingStudio}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg transition cursor-pointer whitespace-nowrap"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Speaking Studio</span>
            </button>
          )}

          {onLaunchWritingEvaluator && (
            <button
              type="button"
              onClick={onLaunchWritingEvaluator}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg transition cursor-pointer whitespace-nowrap"
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Writing Evaluator</span>
            </button>
          )}

          {onLaunchVocabBuilder && (
            <button
              type="button"
              onClick={onLaunchVocabBuilder}
              className="px-3.5 py-2 rounded-xl bg-slate-800/95 hover:bg-slate-700 text-white border border-white/15 text-xs font-bold flex items-center gap-1.5 shadow-lg transition cursor-pointer whitespace-nowrap"
            >
              <BookOpen className="w-3.5 h-3.5 text-sky-400" />
              <span>Vocabulary Builder</span>
            </button>
          )}

          {onLaunchListeningLab && (
            <button
              type="button"
              onClick={onLaunchListeningLab}
              className="px-3.5 py-2 rounded-xl bg-slate-800/95 hover:bg-slate-700 text-white border border-white/15 text-xs font-bold flex items-center gap-1.5 shadow-lg transition cursor-pointer whitespace-nowrap"
            >
              <Headphones className="w-3.5 h-3.5 text-emerald-400" />
              <span>Listening Lab</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
