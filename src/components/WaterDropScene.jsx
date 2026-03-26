import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const CUBE_VERTEX_SIGNS = [
  [-1, -1, -1],
  [1, -1, -1],
  [-1, 1, -1],
  [1, 1, -1],
  [-1, -1, 1],
  [1, -1, 1],
  [-1, 1, 1],
  [1, 1, 1],
];

const EDGE_CONNECTIONS = [
  [0, 1], [2, 3], [4, 5], [6, 7],
  [0, 2], [1, 3], [4, 6], [5, 7],
  [0, 4], [1, 5], [2, 6], [3, 7],
];

const VERTEX_CONNECTIONS = CUBE_VERTEX_SIGNS.map(() => []);
EDGE_CONNECTIONS.forEach(([from, to]) => {
  VERTEX_CONNECTIONS[from].push(to);
  VERTEX_CONNECTIONS[to].push(from);
});

const ARC_START = new THREE.Vector3();
const ARC_CURRENT = new THREE.Vector3();
const ARC_AXIS = new THREE.Vector3();
const DELTA_QUATERNION = new THREE.Quaternion();

const CUBE_LAYERS = [
  {
    size: 3.15,
    color: 0x61ff86,
    edgeColor: 0x84ff9f,
    baseRotation: [0.42, 0.76, 0.18],
    speed: [0.12, 0.2, 0.05],
    signalCount: 20,
    tailPoints: 13,
    tailSize: 0.145,
    headSize: 0.31,
    nodeSize: 0.24,
    trailSpacing: 0.058,
    speedRange: [0.62, 0.92],
    idleNodeGlow: 0.12,
    edgeOpacity: 0.22,
  },
  {
    size: 2.48,
    color: 0x33c7ff,
    edgeColor: 0x6fd7ff,
    baseRotation: [-0.58, 0.34, 0.88],
    speed: [-0.18, 0.1, -0.14],
    signalCount: 16,
    tailPoints: 12,
    tailSize: 0.135,
    headSize: 0.28,
    nodeSize: 0.22,
    trailSpacing: 0.061,
    speedRange: [0.74, 1.02],
    idleNodeGlow: 0.11,
    edgeOpacity: 0.18,
  },
  {
    size: 1.84,
    color: 0xc05cff,
    edgeColor: 0xd38cff,
    baseRotation: [0.92, -0.46, 0.28],
    speed: [0.1, -0.16, 0.18],
    signalCount: 12,
    tailPoints: 11,
    tailSize: 0.125,
    headSize: 0.25,
    nodeSize: 0.2,
    trailSpacing: 0.066,
    speedRange: [0.88, 1.18],
    idleNodeGlow: 0.1,
    edgeOpacity: 0.16,
  },
];

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function setColor(buffer, offset, color, intensity) {
  buffer[offset] = color.r * intensity;
  buffer[offset + 1] = color.g * intensity;
  buffer[offset + 2] = color.b * intensity;
}

function writeLerpPosition(buffer, offset, from, to, progress) {
  buffer[offset] = THREE.MathUtils.lerp(from.x, to.x, progress);
  buffer[offset + 1] = THREE.MathUtils.lerp(from.y, to.y, progress);
  buffer[offset + 2] = THREE.MathUtils.lerp(from.z, to.z, progress);
}

function createPulseTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;

  const context = canvas.getContext('2d');
  if (!context) return null;

  const gradient = context.createRadialGradient(64, 64, 4, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.16, 'rgba(255,255,255,0.98)');
  gradient.addColorStop(0.42, 'rgba(255,255,255,0.42)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');

  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

function createCubeVertices(size) {
  const half = size * 0.5;
  return CUBE_VERTEX_SIGNS.map(([x, y, z]) => new THREE.Vector3(x * half, y * half, z * half));
}

function pickNextVertex(vertexIndex, previousVertexIndex = -1) {
  const neighbors = VERTEX_CONNECTIONS[vertexIndex];
  const preferred = neighbors.filter((neighbor) => neighbor !== previousVertexIndex);
  const choices = preferred.length > 0 ? preferred : neighbors;
  return choices[Math.floor(Math.random() * choices.length)];
}

function createSignal(config) {
  const startIndex = Math.floor(Math.random() * CUBE_VERTEX_SIGNS.length);
  return {
    startIndex,
    endIndex: pickNextVertex(startIndex),
    progress: randomBetween(-1.05, 1),
    speed: randomBetween(config.speedRange[0], config.speedRange[1]),
    spacing: config.trailSpacing * randomBetween(0.88, 1.12),
    phase: randomBetween(0, Math.PI * 2),
  };
}

function rerouteSignal(signal, config, carry = 0) {
  const previousStartIndex = signal.startIndex;
  signal.startIndex = signal.endIndex;
  signal.endIndex = pickNextVertex(signal.startIndex, previousStartIndex);
  signal.progress = Math.min(carry, 0.14) - randomBetween(0.02, 0.16);
  signal.speed = randomBetween(config.speedRange[0], config.speedRange[1]);
  signal.spacing = config.trailSpacing * randomBetween(0.88, 1.12);
  signal.phase = randomBetween(0, Math.PI * 2);
}

function projectToArcball(container, clientX, clientY, target) {
  const rect = container.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * 2 - 1;
  const y = -(((clientY - rect.top) / rect.height) * 2 - 1);
  const lengthSquared = x * x + y * y;

  if (lengthSquared <= 0.5) {
    target.set(x, y, Math.sqrt(1 - lengthSquared));
    return target;
  }

  const scale = 0.5 / Math.sqrt(lengthSquared);
  target.set(x * scale, y * scale, scale);
  return target.normalize();
}

function createLayer(config, pulseTexture) {
  const group = new THREE.Group();
  const baseColor = new THREE.Color(config.color);
  const vertices = createCubeVertices(config.size);

  group.rotation.set(...config.baseRotation);

  const edgeGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(config.size, config.size, config.size));
  const edgeMaterial = new THREE.LineBasicMaterial({
    color: config.edgeColor,
    transparent: true,
    opacity: config.edgeOpacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
  group.add(edges);

  const signals = Array.from({ length: config.signalCount }, () => createSignal(config));

  const tailParticleCount = config.signalCount * config.tailPoints;
  const tailPositions = new Float32Array(tailParticleCount * 3);
  const tailColors = new Float32Array(tailParticleCount * 3);

  const tailsGeometry = new THREE.BufferGeometry();
  tailsGeometry.setAttribute('position', new THREE.BufferAttribute(tailPositions, 3));
  tailsGeometry.setAttribute('color', new THREE.BufferAttribute(tailColors, 3));

  const tailsMaterial = new THREE.PointsMaterial({
    map: pulseTexture ?? undefined,
    size: config.tailSize,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    sizeAttenuation: true,
  });

  group.add(new THREE.Points(tailsGeometry, tailsMaterial));

  const headPositions = new Float32Array(config.signalCount * 3);
  const headColors = new Float32Array(config.signalCount * 3);

  const headsGeometry = new THREE.BufferGeometry();
  headsGeometry.setAttribute('position', new THREE.BufferAttribute(headPositions, 3));
  headsGeometry.setAttribute('color', new THREE.BufferAttribute(headColors, 3));

  const headsMaterial = new THREE.PointsMaterial({
    map: pulseTexture ?? undefined,
    size: config.headSize,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    sizeAttenuation: true,
  });

  group.add(new THREE.Points(headsGeometry, headsMaterial));

  const nodePositions = new Float32Array(vertices.length * 3);
  const nodeColors = new Float32Array(vertices.length * 3);
  const nodePhases = new Float32Array(vertices.length);
  const nodeEnergy = new Float32Array(vertices.length);

  vertices.forEach((vertex, index) => {
    const offset = index * 3;
    nodePositions[offset] = vertex.x;
    nodePositions[offset + 1] = vertex.y;
    nodePositions[offset + 2] = vertex.z;
    nodePhases[index] = randomBetween(0, Math.PI * 2);
  });

  const nodesGeometry = new THREE.BufferGeometry();
  nodesGeometry.setAttribute('position', new THREE.BufferAttribute(nodePositions, 3));
  nodesGeometry.setAttribute('color', new THREE.BufferAttribute(nodeColors, 3));

  const nodesMaterial = new THREE.PointsMaterial({
    map: pulseTexture ?? undefined,
    size: config.nodeSize,
    transparent: true,
    opacity: 0.86,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    sizeAttenuation: true,
  });

  group.add(new THREE.Points(nodesGeometry, nodesMaterial));

  return {
    group,
    config,
    baseColor,
    signals,
    vertices,
    edgeGeometry,
    edgeMaterial,
    tailPositions,
    tailColors,
    tailsGeometry,
    tailsMaterial,
    headPositions,
    headColors,
    headsGeometry,
    headsMaterial,
    nodeColors,
    nodeEnergy,
    nodePhases,
    nodesGeometry,
    nodesMaterial,
  };
}

function updateLayerVisuals(layer, deltaTime, time) {
  const {
    config,
    baseColor,
    vertices,
    signals,
    tailPositions,
    tailColors,
    tailsGeometry,
    headPositions,
    headColors,
    headsGeometry,
    nodeColors,
    nodeEnergy,
    nodePhases,
    nodesGeometry,
  } = layer;

  for (let nodeIndex = 0; nodeIndex < nodeEnergy.length; nodeIndex += 1) {
    nodeEnergy[nodeIndex] = config.idleNodeGlow + 0.05 * (1 + Math.sin(time * 2.5 + nodePhases[nodeIndex]));
  }

  signals.forEach((signal, signalIndex) => {
    const tailSpan = signal.spacing * (config.tailPoints - 1);
    const resetThreshold = 1 + tailSpan + 0.1;

    signal.progress += deltaTime * signal.speed;
    if (signal.progress > resetThreshold) {
      rerouteSignal(signal, config, signal.progress - resetThreshold);
    }

    const from = vertices[signal.startIndex];
    const to = vertices[signal.endIndex];
    const headOffset = signalIndex * 3;

    if (signal.progress >= 0 && signal.progress <= 1) {
      writeLerpPosition(headPositions, headOffset, from, to, signal.progress);
      const flicker = 1 + 0.22 * Math.sin(time * 10 + signal.phase);
      setColor(headColors, headOffset, baseColor, flicker);
    } else {
      writeLerpPosition(headPositions, headOffset, from, to, THREE.MathUtils.clamp(signal.progress, 0, 1));
      setColor(headColors, headOffset, baseColor, 0);
    }

    if (signal.progress > -0.06 && signal.progress < 0.18) {
      const startBoost = 0.34 + (0.2 - Math.abs(signal.progress - 0.04)) * 1.5;
      nodeEnergy[signal.startIndex] = Math.max(nodeEnergy[signal.startIndex], startBoost);
    }

    if (signal.progress > 0.8 && signal.progress < 1.08) {
      const endBoost = 0.48 + (0.3 - Math.abs(signal.progress - 1)) * 1.3;
      nodeEnergy[signal.endIndex] = Math.max(nodeEnergy[signal.endIndex], endBoost);
    }

    for (let tailIndex = 0; tailIndex < config.tailPoints; tailIndex += 1) {
      const particleIndex = signalIndex * config.tailPoints + tailIndex;
      const offset = particleIndex * 3;
      const progress = signal.progress - tailIndex * signal.spacing;

      if (progress < 0 || progress > 1) {
        writeLerpPosition(tailPositions, offset, from, to, THREE.MathUtils.clamp(progress, 0, 1));
        setColor(tailColors, offset, baseColor, 0);
        continue;
      }

      writeLerpPosition(tailPositions, offset, from, to, progress);

      const falloff = 1 - tailIndex / config.tailPoints;
      const shimmer = 0.7 + 0.3 * Math.sin(time * 7.5 + signal.phase - tailIndex * 0.38);
      const intensity = Math.max(0, falloff * falloff * 1.22 * shimmer);
      setColor(tailColors, offset, baseColor, intensity);
    }
  });

  for (let nodeIndex = 0; nodeIndex < nodeEnergy.length; nodeIndex += 1) {
    const offset = nodeIndex * 3;
    setColor(nodeColors, offset, baseColor, nodeEnergy[nodeIndex]);
  }

  tailsGeometry.attributes.position.needsUpdate = true;
  tailsGeometry.attributes.color.needsUpdate = true;
  headsGeometry.attributes.position.needsUpdate = true;
  headsGeometry.attributes.color.needsUpdate = true;
  nodesGeometry.attributes.color.needsUpdate = true;
}

export default function WaterDropScene() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const interactionSurface = container.parentElement;
    const width = () => container.clientWidth;
    const height = () => container.clientHeight;
    const isMobile = () => width() < 768;
    const isFinePointer = window.matchMedia('(pointer: fine)').matches;
    const getPixelRatio = () => Math.min(window.devicePixelRatio, isMobile() ? 1.1 : 1.5);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(getPixelRatio());
    renderer.setSize(width(), height());
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, width() / height(), 0.1, 100);
    camera.position.set(0, 0, 10);

    const rig = new THREE.Group();
    scene.add(rig);

    const pulseTexture = createPulseTexture();
    const layers = CUBE_LAYERS.map((config) => {
      const layer = createLayer(config, pulseTexture);
      rig.add(layer.group);
      return layer;
    });

    const targetRotation = new THREE.Quaternion();
    const dragState = {
      active: false,
      pointerId: null,
    };

    const syncRigPosition = () => {
      rig.position.set(isMobile() ? 0 : 1.08, isMobile() ? -0.05 : 0.28, 0);
    };

    const onPointerDown = (event) => {
      if (!interactionSurface || event.pointerType !== 'mouse' || event.button !== 0) return;
      dragState.active = true;
      dragState.pointerId = event.pointerId;
      projectToArcball(interactionSurface, event.clientX, event.clientY, ARC_START);
      interactionSurface.classList.add('is-rotating');
      interactionSurface.setPointerCapture?.(event.pointerId);
    };

    const onPointerMove = (event) => {
      if (!interactionSurface || !dragState.active || dragState.pointerId !== event.pointerId) return;

      projectToArcball(interactionSurface, event.clientX, event.clientY, ARC_CURRENT);
      ARC_AXIS.crossVectors(ARC_START, ARC_CURRENT);

      if (ARC_AXIS.lengthSq() > 1e-7) {
        const angle = Math.acos(THREE.MathUtils.clamp(ARC_START.dot(ARC_CURRENT), -1, 1));
        DELTA_QUATERNION.setFromAxisAngle(ARC_AXIS.normalize(), angle * 1.25);
        targetRotation.premultiply(DELTA_QUATERNION);
        ARC_START.copy(ARC_CURRENT);
      }
    };

    const stopDragging = (event) => {
      if (!interactionSurface || !dragState.active) return;
      if (event && dragState.pointerId !== event.pointerId) return;

      interactionSurface.classList.remove('is-rotating');
      interactionSurface.releasePointerCapture?.(dragState.pointerId);
      dragState.active = false;
      dragState.pointerId = null;
    };

    syncRigPosition();

    if (isFinePointer) {
      interactionSurface?.addEventListener('pointerdown', onPointerDown);
      interactionSurface?.addEventListener('pointermove', onPointerMove);
      interactionSurface?.addEventListener('pointerup', stopDragging);
      interactionSurface?.addEventListener('pointercancel', stopDragging);
      interactionSurface?.addEventListener('pointerleave', stopDragging);
    }

    const startTime = performance.now();
    let previousTime = 0;
    let frameId = 0;
    let sceneVisible = false;
    let pageVisible = document.visibilityState === 'visible';
    let animationRunning = false;

    const renderFrame = () => {
      const elapsed = (performance.now() - startTime) * 0.001;
      const deltaTime = Math.min(0.05, Math.max(1 / 120, elapsed - previousTime));
      previousTime = elapsed;

      rig.quaternion.slerp(targetRotation, dragState.active ? 0.32 : 0.14);

      layers.forEach((layer, index) => {
        const { group, config } = layer;
        const [baseX, baseY, baseZ] = config.baseRotation;
        const [speedX, speedY, speedZ] = config.speed;

        group.rotation.x = baseX + elapsed * speedX;
        group.rotation.y = baseY + elapsed * speedY;
        group.rotation.z = baseZ + elapsed * speedZ + Math.sin(elapsed * (0.32 + index * 0.14)) * 0.05;

        updateLayerVisuals(layer, deltaTime, elapsed);
      });

      renderer.render(scene, camera);
    };

    const tick = () => {
      if (!animationRunning) {
        return;
      }

      frameId = window.requestAnimationFrame(tick);
      renderFrame();
    };

    const startLoop = () => {
      if (animationRunning || !sceneVisible || !pageVisible) {
        return;
      }

      previousTime = (performance.now() - startTime) * 0.001;
      animationRunning = true;
      tick();
    };

    const stopLoop = () => {
      animationRunning = false;

      if (frameId) {
        window.cancelAnimationFrame(frameId);
        frameId = 0;
      }
    };

    const syncLoopState = () => {
      if (sceneVisible && pageVisible) {
        startLoop();
      } else {
        stopLoop();
      }
    };

    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        sceneVisible = entry.isIntersecting && entry.intersectionRatio >= 0.35;
        syncLoopState();

        if (!animationRunning && entry.isIntersecting) {
          renderFrame();
        }
      },
      { threshold: [0, 0.16, 0.35, 0.6] }
    );
    visibilityObserver.observe(container);

    const onVisibilityChange = () => {
      pageVisible = document.visibilityState === 'visible';
      syncLoopState();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    const onResize = () => {
      camera.aspect = width() / height();
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(getPixelRatio());
      renderer.setSize(width(), height());
      syncRigPosition();

      if (!animationRunning && sceneVisible) {
        renderFrame();
      }
    };

    window.addEventListener('resize', onResize);

    return () => {
      stopLoop();
      visibilityObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('resize', onResize);

      if (isFinePointer) {
        interactionSurface?.removeEventListener('pointerdown', onPointerDown);
        interactionSurface?.removeEventListener('pointermove', onPointerMove);
        interactionSurface?.removeEventListener('pointerup', stopDragging);
        interactionSurface?.removeEventListener('pointercancel', stopDragging);
        interactionSurface?.removeEventListener('pointerleave', stopDragging);
      }
      interactionSurface?.classList.remove('is-rotating');

      layers.forEach(({ edgeGeometry, edgeMaterial, tailsGeometry, tailsMaterial, headsGeometry, headsMaterial, nodesGeometry, nodesMaterial }) => {
        edgeGeometry.dispose();
        edgeMaterial.dispose();
        tailsGeometry.dispose();
        tailsMaterial.dispose();
        headsGeometry.dispose();
        headsMaterial.dispose();
        nodesGeometry.dispose();
        nodesMaterial.dispose();
      });

      pulseTexture?.dispose();
      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={containerRef} className="about-glass-cube" aria-hidden="true" />;
}
