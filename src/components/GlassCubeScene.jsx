import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { vertexShader } from '../shaders/waveVertex';
import { glassCubeFragmentBody } from '../shaders/glassCubeFragment';
import { WAVE_LOOK } from '../config/waveLook';
import useSectionFreeze from '../hooks/useSectionFreeze';
import useAdaptiveQuality from '../hooks/useAdaptiveQuality';

// ══════════════════════════════════════════════════════════════
// GlassCubeScene — About 页的 Three.js 玻璃方块
//
// 特性：
//   - SDF 光线行进渲染的玻璃质感立方体
//   - Arcball 旋转交互（鼠标/触屏拖拽旋转方块）
//   - 预录视频纹理环境映射（透镜折射 + 反射）
//   - useSectionFreeze 离屏冻结
//   - useAdaptiveQuality GPU 自适应画质
// ══════════════════════════════════════════════════════════════

// ── 方块位置（SDF 空间） ──
// Desktop: 稍微偏上居中。Mobile: 居上。
const CUBE_POS_DESKTOP = new THREE.Vector3(0, 0.35, 0);
const CUBE_POS_MOBILE  = new THREE.Vector3(0, 0.55, 0);
const MOBILE_BREAKPOINT = 768;

// ── Arcball 旋转速度 ──
// 空闲时自动旋转 [x, y, z] 弧度/秒
const IDLE_SPIN = [0.15, 0.25, 0.08];
// 鼠标拖拽时的 slerp 追随系数（越大越灵敏）
const DRAG_SLERP = 0.28;
// 自动旋转时的 slerp 系数
const IDLE_SLERP = 0.06;

// ── 视频纹理路径 ──
const DEMO_VIDEO_PATH = '/video/demo-fallback.mp4';

// ── Shader 构建 ──

function glslFloat(v) {
  const s = Number(v).toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  return s.includes('.') ? s : `${s}.0`;
}

function glslVec3(a) {
  return `vec3(${a.map(glslFloat).join(', ')})`;
}

function buildGlassCubeShader(tier) {
  const bg = WAVE_LOOK.background;
  const st = WAVE_LOOK.studio;
  const sp = WAVE_LOOK.spike;

  const tierMap = {
    high: [
      '#define MAX_STEPS 40',
      '#define SURF_DIST 0.002',
      '#define NORMAL_EPS 0.004',
      '#define GLASS_INTERIOR_STEPS 12',
      '#define QUALITY_HIGH',
    ],
    medium: [
      '#define MAX_STEPS 36',
      '#define SURF_DIST 0.003',
      '#define NORMAL_EPS 0.003',
      '#define GLASS_INTERIOR_STEPS 10',
      '#define QUALITY_MEDIUM',
    ],
    low: [
      '#define MAX_STEPS 24',
      '#define SURF_DIST 0.006',
      '#define NORMAL_EPS 0.004',
      '#define GLASS_INTERIOR_STEPS 8',
      '#define QUALITY_LOW',
    ],
  };

  const defines = [
    ...(tierMap[tier] || tierMap.medium),
    `#define BG_ENV_BASE_MIX ${glslFloat(bg.envBaseMix)}`,
    `#define BG_FOCUS_SPEED ${glslFloat(bg.focusSpeed)}`,
    `#define BG_FOCUS_PHASE_OFFSET ${glslFloat(bg.focusPhaseOffset)}`,
    `#define BG_FOCUS_X_MIN ${glslFloat(bg.focusXRange[0])}`,
    `#define BG_FOCUS_X_MAX ${glslFloat(bg.focusXRange[1])}`,
    `#define BG_FOCUS_Y_MIN ${glslFloat(bg.focusYRange[0])}`,
    `#define BG_FOCUS_Y_MAX ${glslFloat(bg.focusYRange[1])}`,
    `#define BG_FOCUS_GAIN_MIN ${glslFloat(bg.focusGainRange[0])}`,
    `#define BG_FOCUS_GAIN_MAX ${glslFloat(bg.focusGainRange[1])}`,
    `#define BG_FOCUS_SCALE_X ${glslFloat(bg.focusScale[0])}`,
    `#define BG_FOCUS_SCALE_Y ${glslFloat(bg.focusScale[1])}`,
    `#define BG_FOCUS_COLOR ${glslVec3(bg.focusColor)}`,
    `#define BG_SWEEP_SPEED ${glslFloat(bg.sweepSpeed)}`,
    `#define BG_SWEEP_PHASE_OFFSET ${glslFloat(bg.sweepPhaseOffset)}`,
    `#define BG_SWEEP_X_MIN ${glslFloat(bg.sweepXRange[0])}`,
    `#define BG_SWEEP_X_MAX ${glslFloat(bg.sweepXRange[1])}`,
    `#define BG_SWEEP_Y ${glslFloat(bg.sweepY)}`,
    `#define BG_SWEEP_GAIN_MIN ${glslFloat(bg.sweepGainRange[0])}`,
    `#define BG_SWEEP_GAIN_MAX ${glslFloat(bg.sweepGainRange[1])}`,
    `#define BG_SWEEP_SCALE_X ${glslFloat(bg.sweepScale[0])}`,
    `#define BG_SWEEP_SCALE_Y ${glslFloat(bg.sweepScale[1])}`,
    `#define BG_SWEEP_COLOR ${glslVec3(bg.sweepColor)}`,
    `#define ENV_DRIFT_SPEED ${glslFloat(st.driftSpeed)}`,
    `#define ENV_DRIFT_X_AMP ${glslFloat(st.driftAmplitude[0])}`,
    `#define ENV_DRIFT_Y_AMP ${glslFloat(st.driftAmplitude[1])}`,
    `#define ENV_DRIFT_Z_AMP ${glslFloat(st.driftAmplitude[2])}`,
    `#define ENV_KEY_SOFT_GAIN ${glslFloat(st.keyStrength[0])}`,
    `#define ENV_KEY_HARD_GAIN ${glslFloat(st.keyStrength[1])}`,
    `#define ENV_FILL_SOFT_GAIN ${glslFloat(st.fillStrength[0])}`,
    `#define ENV_FILL_HARD_GAIN ${glslFloat(st.fillStrength[1])}`,
    `#define ENV_RIM_SOFT_GAIN ${glslFloat(st.rimStrength[0])}`,
    `#define ENV_RIM_HARD_GAIN ${glslFloat(st.rimStrength[1])}`,
    `#define ENV_TOP_LIGHT_GAIN ${glslFloat(st.topLightStrength)}`,
    `#define ENV_BOTTOM_LIGHT_GAIN ${glslFloat(st.bottomLightStrength)}`,
    `#define ENV_BAND_A_SPEED ${glslFloat(st.bandA.speed)}`,
    `#define ENV_BAND_A_AMPLITUDE ${glslFloat(st.bandA.amplitude)}`,
    `#define ENV_BAND_A_INTENSITY ${glslFloat(st.bandA.intensity)}`,
    `#define ENV_BAND_B_SPEED ${glslFloat(st.bandB.speed)}`,
    `#define ENV_BAND_B_PHASE_OFFSET ${glslFloat(st.bandB.phaseOffset)}`,
    `#define ENV_BAND_B_AMPLITUDE ${glslFloat(st.bandB.amplitude)}`,
    `#define ENV_BAND_B_INTENSITY ${glslFloat(st.bandB.intensity)}`,
    `#define ENV_SWEEP_A_SPEED ${glslFloat(st.sweepA.speed)}`,
    `#define ENV_SWEEP_A_AMPLITUDE ${glslFloat(st.sweepA.amplitude)}`,
    `#define ENV_SWEEP_A_CENTER_X ${glslFloat(st.sweepA.centerX)}`,
    `#define ENV_SWEEP_A_CENTER_Y ${glslFloat(st.sweepA.centerY)}`,
    `#define ENV_SWEEP_A_INTENSITY ${glslFloat(st.sweepA.intensity)}`,
    `#define ENV_SWEEP_B_SPEED ${glslFloat(st.sweepB.speed)}`,
    `#define ENV_SWEEP_B_PHASE_OFFSET ${glslFloat(st.sweepB.phaseOffset)}`,
    `#define ENV_SWEEP_B_AMPLITUDE ${glslFloat(st.sweepB.amplitude)}`,
    `#define ENV_SWEEP_B_CENTER_X ${glslFloat(st.sweepB.centerX)}`,
    `#define ENV_SWEEP_B_CENTER_Y ${glslFloat(st.sweepB.centerY)}`,
    `#define ENV_SWEEP_B_INTENSITY ${glslFloat(st.sweepB.intensity)}`,
    `#define GLASS_IOR ${glslFloat(sp.glassIor)}`,
    `#define GLASS_ABSORPTION ${glslVec3(sp.glassAbsorption)}`,
    `#define GLASS_SPEC_BOOST ${glslFloat(sp.glassSpecBoost)}`,
    `#define GLASS_REFLECT_MIX ${glslFloat(sp.glassReflectMix)}`,
    `#define GLASS_EDGE_GLOW ${glslVec3(sp.glassEdgeGlow)}`,
    `#define GLASS_EDGE_GLOW_BOOST ${glslFloat(sp.glassEdgeGlowBoost)}`,
    `#define CAMERA_REFRACT_SCALE ${glslFloat(sp.cameraRefractScale)}`,
    `#define CAMERA_REFLECT_MIX ${glslFloat(sp.cameraReflectMix)}`,
    `#define CAMERA_TRANSMIT_DIM ${glslFloat(sp.cameraTransmitDim)}`,
  ];

  return defines.join('\n') + '\n' + glassCubeFragmentBody;
}

// ── Arcball 投影 ──
const _arcStart = new THREE.Vector3();
const _arcCurrent = new THREE.Vector3();
const _arcAxis = new THREE.Vector3();
const _deltaQuat = new THREE.Quaternion();

function projectToArcball(rect, clientX, clientY, target) {
  const x = ((clientX - rect.left) / rect.width) * 2 - 1;
  const y = -(((clientY - rect.top) / rect.height) * 2 - 1);
  const lenSq = x * x + y * y;
  if (lenSq <= 0.5) {
    target.set(x, y, Math.sqrt(1 - lenSq));
    return target;
  }
  const s = 0.5 / Math.sqrt(lenSq);
  target.set(x * s, y * s, s);
  return target.normalize();
}

// ── React 组件 ──

export default function GlassCubeScene() {
  const containerRef = useRef(null);
  const loopControlRef = useRef(null);

  // 离屏冻结
  const { shouldAnimate } = useSectionFreeze(containerRef, {
    activeThreshold: 0.15,
  });

  // 自适应画质
  const qualityRef = useAdaptiveQuality({
    bootTier: 'low',
    bootScale: 0.38,
    bootDelayMs: 900,
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const w = () => container.clientWidth;
    const h = () => container.clientHeight;

    const quality = qualityRef.current;
    const baseDPR = window.devicePixelRatio || 1;
    let activeTier = quality.tier;
    let scale = quality.scale;

    // ── Three.js 初始化 ──
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
    renderer.setPixelRatio(baseDPR * scale);
    renderer.setSize(w(), h());
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // 占位空纹理
    const placeholderTex = new THREE.DataTexture(
      new Uint8Array([0, 0, 0, 0]), 1, 1, THREE.RGBAFormat,
    );
    placeholderTex.needsUpdate = true;

    // 方块初始位置
    const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
    const cubePos = isMobile ? CUBE_POS_MOBILE.clone() : CUBE_POS_DESKTOP.clone();

    const uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(w() * baseDPR * scale, h() * baseDPR * scale) },
      uCubePos: { value: cubePos },
      uCubeRot: { value: new THREE.Matrix3() },
      uCameraTex: { value: placeholderTex },
      uCameraActive: { value: 0.0 },
      uCameraAspect: { value: 1.0 },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader: buildGlassCubeShader(activeTier),
      uniforms,
      depthTest: false,
      depthWrite: false,
    });

    const geo = new THREE.PlaneGeometry(2, 2);
    scene.add(new THREE.Mesh(geo, material));

    // ── 视频纹理 ──
    const video = document.createElement('video');
    video.playsInline = true;
    video.muted = true;
    video.loop = true;
    video.crossOrigin = 'anonymous';
    video.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;';
    document.body.appendChild(video);

    let videoTex = null;
    let videoLoaded = false;

    function applyVideoTexture() {
      const aspect = video.videoWidth / Math.max(video.videoHeight, 1);
      if (aspect <= 0) return;
      videoTex = new THREE.VideoTexture(video);
      videoTex.minFilter = THREE.LinearFilter;
      videoTex.magFilter = THREE.LinearFilter;
      videoTex.colorSpace = THREE.SRGBColorSpace;
      videoTex.generateMipmaps = false;
      uniforms.uCameraTex.value = videoTex;
      uniforms.uCameraActive.value = 1.0;
      uniforms.uCameraAspect.value = aspect;
    }

    function loadDemoVideo() {
      if (videoLoaded) return;
      videoLoaded = true;
      video.src = DEMO_VIDEO_PATH;
      video.addEventListener('canplay', () => {
        video.play().then(applyVideoTexture).catch(() => {});
      }, { once: true });
      video.load();
    }

    // ── 旋转状态 ──
    const targetRotation = new THREE.Quaternion();
    const currentRotation = new THREE.Quaternion();
    const rotMat4 = new THREE.Matrix4();
    const idleSpinEuler = new THREE.Euler();
    const idleSpinQuat = new THREE.Quaternion();

    // ── 交互（Arcball） ──
    let dragging = false;
    let dragPointerId = null;

    const onPointerDown = (e) => {
      if (e.button != null && e.button !== 0) return;
      if (dragging) return;
      dragging = true;
      dragPointerId = e.pointerId;
      const rect = container.getBoundingClientRect();
      projectToArcball(rect, e.clientX, e.clientY, _arcStart);
      container.style.cursor = 'grabbing';
      container.setPointerCapture?.(e.pointerId);
    };

    const onPointerMove = (e) => {
      if (!dragging || dragPointerId !== e.pointerId) return;
      const rect = container.getBoundingClientRect();
      projectToArcball(rect, e.clientX, e.clientY, _arcCurrent);
      _arcAxis.crossVectors(_arcStart, _arcCurrent);
      if (_arcAxis.lengthSq() > 1e-7) {
        const angle = Math.acos(THREE.MathUtils.clamp(_arcStart.dot(_arcCurrent), -1, 1));
        _deltaQuat.setFromAxisAngle(_arcAxis.normalize(), angle * 1.25);
        targetRotation.premultiply(_deltaQuat);
        _arcStart.copy(_arcCurrent);
      }
    };

    const onPointerUp = (e) => {
      if (!dragging || dragPointerId !== e.pointerId) return;
      container.releasePointerCapture?.(e.pointerId);
      container.style.cursor = 'grab';
      dragging = false;
      dragPointerId = null;
    };

    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup', onPointerUp);
    container.addEventListener('pointercancel', onPointerUp);
    container.style.cursor = 'grab';

    // ── 自适应画质回调 ──
    function applyScale() {
      renderer.setPixelRatio(baseDPR * scale);
      renderer.setSize(w(), h());
      uniforms.uResolution.value.set(w() * baseDPR * scale, h() * baseDPR * scale);
    }

    quality.onQualityChange = ({ tier: nextTier, scale: nextScale }) => {
      const needsShader = nextTier !== activeTier;
      activeTier = nextTier;
      scale = nextScale;
      if (needsShader) {
        material.fragmentShader = buildGlassCubeShader(activeTier);
        material.needsUpdate = true;
      }
      applyScale();
    };
    quality.start();

    // ── 渲染循环 ──
    let sTime = performance.now();
    let prevTime = 0;
    let animId = 0;
    let freezeStart = 0;

    function renderFrame() {
      const elapsed = (performance.now() - sTime) * 0.001;
      const dt = Math.min(0.05, Math.max(1 / 120, elapsed - prevTime));
      prevTime = elapsed;

      uniforms.uTime.value = elapsed;

      // 首次可见时加载视频
      loadDemoVideo();

      // Arcball 旋转
      idleSpinEuler.set(IDLE_SPIN[0] * dt, IDLE_SPIN[1] * dt, IDLE_SPIN[2] * dt);
      idleSpinQuat.setFromEuler(idleSpinEuler);
      if (!dragging) targetRotation.multiply(idleSpinQuat);

      const slerpFactor = dragging ? DRAG_SLERP : IDLE_SLERP;
      currentRotation.slerp(targetRotation, slerpFactor);
      rotMat4.makeRotationFromQuaternion(currentRotation);
      uniforms.uCubeRot.value.setFromMatrix4(rotMat4);

      renderer.render(scene, camera);
      quality.adaptFrame();
    }

    function tick() {
      animId = requestAnimationFrame(tick);
      renderFrame();
    }

    // shouldAnimate 变化时启停循环
    let running = false;

    function startLoop() {
      if (running) return;
      running = true;

      // 时间补偿：扣除冻结时长防止 uTime 跳变
      if (freezeStart > 0) {
        sTime += performance.now() - freezeStart;
        freezeStart = 0;
      }

      tick();
    }

    function stopLoop() {
      if (!running) return;
      running = false;
      freezeStart = performance.now();
      if (animId) {
        cancelAnimationFrame(animId);
        animId = 0;
      }
      // 释放拖拽
      if (dragging) {
        dragging = false;
        dragPointerId = null;
        container.style.cursor = 'grab';
      }
    }

    // 首次检查
    if (shouldAnimate) startLoop();

    // 暴露 start/stop 给外部 effect
    loopControlRef.current = { startLoop, stopLoop };

    // resize
    const onResize = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      const target = mobile ? CUBE_POS_MOBILE : CUBE_POS_DESKTOP;
      cubePos.copy(target);
      applyScale();
    };
    window.addEventListener('resize', onResize);

    // ── 清理 ──
    return () => {
      loopControlRef.current = null;
      stopLoop();
      quality.dispose();
      window.removeEventListener('resize', onResize);
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('pointercancel', onPointerUp);

      // 视频清理
      video.pause();
      video.removeAttribute('src');
      video.load();
      if (document.body.contains(video)) document.body.removeChild(video);
      if (videoTex) videoTex.dispose();
      placeholderTex.dispose();
      geo.dispose();
      material.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qualityRef]);

  // shouldAnimate 变化时通过 loopControlRef 控制渲染循环
  useEffect(() => {
    const ctrl = loopControlRef.current;
    if (!ctrl) return;
    if (shouldAnimate) {
      ctrl.startLoop();
    } else {
      ctrl.stopLoop();
    }
  }, [shouldAnimate]);

  return (
    <div
      ref={containerRef}
      className="about-glass-cube"
      aria-hidden="true"
      style={{ pointerEvents: 'auto' }}
    />
  );
}
