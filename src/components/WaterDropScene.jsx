import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const CUBE_LAYERS = [
  {
    size: 3.15,
    color: 0x7fd6ff,
    lineColor: 0xbfeaff,
    baseRotation: [0.42, 0.76, 0.18],
    speed: [0.12, 0.2, 0.05],
  },
  {
    size: 2.48,
    color: 0x6aa8ff,
    lineColor: 0x9dc9ff,
    baseRotation: [-0.58, 0.34, 0.88],
    speed: [-0.18, 0.1, -0.14],
  },
  {
    size: 1.84,
    color: 0x8b82ff,
    lineColor: 0xb8b0ff,
    baseRotation: [0.92, -0.46, 0.28],
    speed: [0.1, -0.16, 0.18],
  },
];

export default function WaterDropScene() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = () => container.clientWidth;
    const height = () => container.clientHeight;
    const isMobile = () => width() < 768;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(width(), height());
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, width() / height(), 0.1, 100);
    camera.position.set(0, 0, 10);

    const rig = new THREE.Group();
    scene.add(rig);

    const layers = CUBE_LAYERS.map((config) => {
      const group = new THREE.Group();

      const edgeGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(config.size, config.size, config.size));
      const edgeMaterial = new THREE.LineBasicMaterial({
        color: config.lineColor,
        transparent: true,
        opacity: 0.72,
      });
      const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);

      group.add(edges);
      rig.add(group);

      return { group, edgeGeometry, edgeMaterial, config };
    });

    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

    const onPointerMove = (event) => {
      pointer.tx = (event.clientX / window.innerWidth - 0.5) * 0.42;
      pointer.ty = (event.clientY / window.innerHeight - 0.5) * -0.32;
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });

    const startTime = performance.now();
    let frameId = 0;

    const tick = () => {
      frameId = window.requestAnimationFrame(tick);
      const t = (performance.now() - startTime) * 0.001;

      pointer.x += (pointer.tx - pointer.x) * 0.04;
      pointer.y += (pointer.ty - pointer.y) * 0.04;

      rig.position.x += ((isMobile() ? 0 : 1.08) - rig.position.x) * 0.06;
      rig.position.y += ((isMobile() ? -0.05 : 0.28) - rig.position.y) * 0.06;

      layers.forEach(({ group, config }, index) => {
        const [baseX, baseY, baseZ] = config.baseRotation;
        const [speedX, speedY, speedZ] = config.speed;
        const pointerScale = 0.12 + index * 0.04;

        group.rotation.x = baseX + t * speedX + pointer.y * pointerScale;
        group.rotation.y = baseY + t * speedY + pointer.x * (pointerScale + 0.02);
        group.rotation.z = baseZ + t * speedZ + Math.sin(t * (0.3 + index * 0.14)) * 0.05;
      });

      renderer.render(scene, camera);
    };

    tick();

    const onResize = () => {
      camera.aspect = width() / height();
      camera.updateProjectionMatrix();
      renderer.setSize(width(), height());
    };

    window.addEventListener('resize', onResize);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointerMove);

      layers.forEach(({ edgeGeometry, edgeMaterial }) => {
        edgeGeometry.dispose();
        edgeMaterial.dispose();
      });

      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={containerRef} className="about-glass-cube" aria-hidden="true" />;
}
