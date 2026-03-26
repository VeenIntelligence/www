import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { vertexShader } from '../shaders/waveVertex';
import { buildFragmentShader, detectGPUTier, getTierScale } from '../utils/waveShaderBuilder';
import {
  clamp,
  smoothstep,
  DROP_ORBITS,
  applyPairRepulsion,
  clientToWorld,
  worldToLocalScreen,
  getSpikeHandleSize,
  setSpikeSpawnPosition,
} from '../utils/wavePhysics';
import {
  BOOT_TIER,
  BOOT_SCALE,
  BOOT_MIN_MS,
  DROP_RADII,
  DROP_RETURN_STIFFNESS,
  DROP_DAMPING,
  DROP_DRAG_CATCH_MULT,
  DROP_DRAG_STIFFNESS,
  DROP_DRAG_RELEASE_BOOST,
  DROP_SCROLL_GRAVITY,
  DROP_CUBE_SWAT_GAIN,
  DROP_MAX_OFFSET,
  SPIKE_AUTO_SPEED_X,
  SPIKE_EXIT_X,
  SPIKE_FREE_DAMPING,
  SPIKE_THROW_GAIN,
  SPIKE_MOUSE_PICK_PADDING,
} from '../config/waveLook';

/**
 * WaveCanvas — Liquid metal drops with direct-manipulated glass cube
 * Tier-adaptive quality, lightweight interaction physics.
 *
 * 本组件只负责: 初始化 Three.js、驱动渲染循环、管理交互事件。
 * 配置 → config/waveLook.js
 * 着色器 → shaders/waveFragment.js
 * 构建器 → utils/waveShaderBuilder.js
 * 物理 → utils/wavePhysics.js
 */
export default function WaveCanvas() {
  const containerRef = useRef(null);
  const dragHandleRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const dragHandle = dragHandleRef.current;
    if (!container || !dragHandle) return;

    const w = () => container.clientWidth;
    const h = () => container.clientHeight;

    // ── 自适应画质 ──
    const tier = detectGPUTier();
    const baseDPR = window.devicePixelRatio || 1;
    const targetTier = tier;
    const targetScale = getTierScale(targetTier);
    let activeTier = BOOT_TIER;
    let scale = Math.min(BOOT_SCALE, targetScale);
    let upgraded = targetTier === BOOT_TIER && scale === targetScale;

    // ── Three.js 初始化 ──
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.inset = '0';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.pointerEvents = 'none';
    renderer.domElement.style.zIndex = '0';
    renderer.setPixelRatio(baseDPR * scale);
    renderer.setSize(w(), h());
    container.insertBefore(renderer.domElement, dragHandle);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const initialSpikePosition = setSpikeSpawnPosition(0, new THREE.Vector3());

    const uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(w() * baseDPR * scale, h() * baseDPR * scale) },
      uPointerEnergy: { value: 0 },
      uScrollEnergy: { value: 0 },
      uDropA: { value: new THREE.Vector3() },
      uDropB: { value: new THREE.Vector3() },
      uDropC: { value: new THREE.Vector3() },
      uDropVelA: { value: new THREE.Vector3() },
      uDropVelB: { value: new THREE.Vector3() },
      uDropVelC: { value: new THREE.Vector3() },
      uSpikePos: { value: initialSpikePosition.clone() },
      uSpikeRot: { value: new THREE.Matrix3() },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader: buildFragmentShader(activeTier),
      uniforms,
      depthTest: false,
      depthWrite: false,
    });

    const geo = new THREE.PlaneGeometry(2, 2);
    scene.add(new THREE.Mesh(geo, material));

    // ── 液滴物理状态 ──
    const drops = DROP_RADII.map((radius, index) => {
      const position = DROP_ORBITS[index](0, new THREE.Vector3());
      return {
        radius,
        mass: 1 + radius * 1.6,
        orbit: DROP_ORBITS[index],
        base: position.clone(),
        position,
        previousPosition: position.clone(),
        velocity: new THREE.Vector3(),
        renderVelocity: new THREE.Vector3(),
      };
    });

    // ── Spike（立方体）状态 ──
    const spike = {
      dragging: false,
      pointerId: null,
      captureTarget: null,
      position: initialSpikePosition.clone(),
      velocity: new THREE.Vector3(SPIKE_AUTO_SPEED_X, 0, 0),
      dragOffset: new THREE.Vector3(),
      dragVelocity: new THREE.Vector2(),
      lastDragAt: 0,
    };

    // ── 交互状态 ──
    const interaction = {
      pointerActive: false,
      pointerWorld: new THREE.Vector3(),
      pointerEnergy: 0,
      scrollEnergy: 0,
      scrollGravity: 0,
      lastPointerAt: performance.now(),
      lastScrollY: window.scrollY,
      // 液滴拖拽状态：哪颗液滴正在被拖拽（-1 = 无）
      draggedDropIndex: -1,
      dragPointerId: null,
      // 拖拽目标位置（指针在世界空间的位置，液滴会迟滞地追上去）
      dropDragTarget: new THREE.Vector3(),
    };

    // ── 预分配临时向量（避免 GC 压力）──
    const pointerWorldScratch = new THREE.Vector3();
    const dragWorldScratch = new THREE.Vector3();
    const spikeSpawnScratch = new THREE.Vector3();
    const dropToBase = new THREE.Vector3();
    const dropLimitOffset = new THREE.Vector3();
    const spikeToDrop = new THREE.Vector3();
    const repulsionScratch = new THREE.Vector3();
    const handleScreen = new THREE.Vector2();
    const hitTestScreen = new THREE.Vector2();
    const dropToPointer = new THREE.Vector3();
    const spikeEuler = new THREE.Euler();
    const spikeRotationMatrix4 = new THREE.Matrix4();

    // ── 内部帮助函数 ──

    function updateDropUniforms() {
      uniforms.uDropA.value.copy(drops[0].position);
      uniforms.uDropB.value.copy(drops[1].position);
      uniforms.uDropC.value.copy(drops[2].position);
      uniforms.uDropVelA.value.copy(drops[0].renderVelocity);
      uniforms.uDropVelB.value.copy(drops[1].renderVelocity);
      uniforms.uDropVelC.value.copy(drops[2].renderVelocity);
    }

    function clampSpikeDragPosition(target) {
      target.x = clamp(target.x, -1.95, 2.85);
      target.y = clamp(target.y, -1.45, 1.35);
      target.z = clamp(target.z, -0.1, 1.4);
      return target;
    }

    function clampSpikeFreePosition(target) {
      target.y = clamp(target.y, -1.45, 1.35);
      target.z = clamp(target.z, -0.1, 1.4);
      return target;
    }

    function respawnSpike(time) {
      setSpikeSpawnPosition(time, spikeSpawnScratch);
      spike.position.copy(spikeSpawnScratch);
      spike.velocity.set(
        SPIKE_AUTO_SPEED_X,
        Math.cos(time * 0.47 + 0.2) * 0.05,
        0,
      );
    }

    function isPointerNearSpike(clientX, clientY, rect, extraPadding = 0) {
      worldToLocalScreen(spike.position, rect, hitTestScreen);
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      const halfSize = getSpikeHandleSize(rect, spike.position.z) * 0.5 + extraPadding;
      return Math.abs(localX - hitTestScreen.x) <= halfSize && Math.abs(localY - hitTestScreen.y) <= halfSize;
    }

    function releaseDrag(pointerId) {
      // 释放立方体
      if (spike.dragging && (pointerId == null || spike.pointerId === pointerId)) {
        if (spike.captureTarget?.hasPointerCapture?.(spike.pointerId)) {
          spike.captureTarget.releasePointerCapture(spike.pointerId);
        }
        spike.dragging = false;
        spike.pointerId = null;
        spike.captureTarget = null;
        spike.velocity.x = Math.max(spike.velocity.x * SPIKE_THROW_GAIN + SPIKE_AUTO_SPEED_X, SPIKE_AUTO_SPEED_X);
        spike.velocity.y *= SPIKE_THROW_GAIN;
        spike.velocity.z *= SPIKE_THROW_GAIN;
        spike.dragVelocity.set(0, 0);
      }

      // 释放液滴
      if (interaction.draggedDropIndex >= 0 && (pointerId == null || interaction.dragPointerId === pointerId)) {
        if (container.hasPointerCapture?.(interaction.dragPointerId)) {
          container.releasePointerCapture(interaction.dragPointerId);
        }
        const drop = drops[interaction.draggedDropIndex];
        drop.velocity.multiplyScalar(DROP_DRAG_RELEASE_BOOST);
        interaction.draggedDropIndex = -1;
        interaction.dragPointerId = null;
      }
      
      container.style.cursor = '';
      dragHandle.style.cursor = 'grab';
    }

    // ── 事件处理 ──

    const onPointerDown = (event) => {
      // 仅响应鼠标左键或触摸等主输入
      if (event.button != null && event.button !== 0) return;
      if (spike.dragging || interaction.draggedDropIndex >= 0) return;

      const rect = container.getBoundingClientRect();
      const isMouse = event.pointerType === 'mouse';
      const spikePad = isMouse ? SPIKE_MOUSE_PICK_PADDING : 0;
      
      // 1. 优先判定捕获立方体
      if (event.currentTarget === dragHandle || isPointerNearSpike(event.clientX, event.clientY, rect, spikePad)) {
        clientToWorld(event.clientX, event.clientY, spike.position.z, rect, dragWorldScratch);
        spike.dragging = true;
        spike.pointerId = event.pointerId;
        spike.captureTarget = dragHandle; 
        spike.dragOffset.subVectors(spike.position, dragWorldScratch);
        spike.dragVelocity.set(0, 0);
        spike.lastDragAt = performance.now();
        
        interaction.pointerActive = false;
        interaction.pointerEnergy = 0;
        
        dragHandle.setPointerCapture?.(event.pointerId);
        dragHandle.style.cursor = 'grabbing';
        
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      // 2. 检测并捕获液滴
      clientToWorld(event.clientX, event.clientY, 0, rect, pointerWorldScratch);
      let bestIdx = -1;
      let bestDist = Infinity;
      for (let i = 0; i < drops.length; i++) {
        const catchR = drops[i].radius * DROP_DRAG_CATCH_MULT;
        const dx = drops[i].position.x - pointerWorldScratch.x;
        const dy = drops[i].position.y - pointerWorldScratch.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        // 共用一套判定，谁离得近抓谁，但大液滴捕获圈会更大
        if (dist < catchR && dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      }

      if (bestIdx >= 0) {
        interaction.draggedDropIndex = bestIdx;
        interaction.dragPointerId = event.pointerId;
        interaction.dropDragTarget.copy(pointerWorldScratch);
        interaction.pointerActive = true;
        interaction.pointerWorld.copy(pointerWorldScratch);
        interaction.lastPointerAt = performance.now();
        
        container.setPointerCapture?.(event.pointerId);
        container.style.cursor = 'grabbing';
        
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const onPointerMove = (event) => {
      const rect = container.getBoundingClientRect();
      const now = performance.now();

      // 1. 处理立方体拖动
      if (spike.dragging && spike.pointerId === event.pointerId) {
        const dt = Math.max((now - spike.lastDragAt) * 0.001, 1 / 240);
        clientToWorld(event.clientX, event.clientY, spike.position.z, rect, dragWorldScratch);
        dragWorldScratch.add(spike.dragOffset);
        dragWorldScratch.z = spike.position.z;
        clampSpikeDragPosition(dragWorldScratch);

        spike.dragVelocity.set(
          (dragWorldScratch.x - spike.position.x) / dt,
          (dragWorldScratch.y - spike.position.y) / dt,
        );
        spike.velocity.set(spike.dragVelocity.x, spike.dragVelocity.y, 0);
        spike.position.copy(dragWorldScratch);
        spike.lastDragAt = now;

        dragHandle.style.cursor = 'grabbing';
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      // 2. 处理液滴拖动
      if (interaction.draggedDropIndex >= 0 && interaction.dragPointerId === event.pointerId) {
        clientToWorld(event.clientX, event.clientY, 0, rect, pointerWorldScratch);
        interaction.dropDragTarget.copy(pointerWorldScratch);
        interaction.pointerActive = true;
        interaction.pointerWorld.copy(pointerWorldScratch);
        interaction.lastPointerAt = now;
        
        container.style.cursor = 'grabbing';
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      // 3. 全局悬停更新（没有拖动物体时）
      // 避免跨元素触发影响
      if (event.target !== container && event.target !== dragHandle) return;

      clientToWorld(event.clientX, event.clientY, 0, rect, pointerWorldScratch);
      interaction.pointerActive = true;
      interaction.pointerWorld.copy(pointerWorldScratch);
      interaction.lastPointerAt = now;

      // 更新悬停光标状态
      const isMouse = event.pointerType === 'mouse';
      const spikePad = isMouse ? SPIKE_MOUSE_PICK_PADDING : 0;
      if (isPointerNearSpike(event.clientX, event.clientY, rect, spikePad)) {
        container.style.cursor = 'grab';
      } else {
        let hovering = false;
        for (let i = 0; i < drops.length; i++) {
          const catchR = drops[i].radius * DROP_DRAG_CATCH_MULT;
          const dx = drops[i].position.x - pointerWorldScratch.x;
          const dy = drops[i].position.y - pointerWorldScratch.y;
          if (Math.sqrt(dx * dx + dy * dy) < catchR) {
            hovering = true;
            break;
          }
        }
        container.style.cursor = hovering ? 'grab' : '';
      }
    };

    const onPointerUp = (event) => {
      releaseDrag(event.pointerId);
    };

    const onPointerLeave = (event) => {
      // 仅在完全没有拖拽的 hover 的鼠标离开时清理
      if (event.pointerType === 'mouse' && !spike.dragging && interaction.draggedDropIndex < 0) {
        interaction.pointerActive = false;
        container.style.cursor = '';
      }
    };

    const onScroll = () => {
      const nextScrollY = window.scrollY;
      const deltaY = nextScrollY - interaction.lastScrollY;
      interaction.lastScrollY = nextScrollY;

      const intensity = Math.min(Math.abs(deltaY), 120);
      interaction.scrollGravity = clamp(interaction.scrollGravity + intensity * 0.006, 0, 1.6);
      interaction.scrollEnergy = clamp(interaction.scrollEnergy + intensity * 0.008, 0, 1.25);
    };

    // 移动端核心：如果触碰点在液滴上，阻止 touchstart 的默认系统外滑操作
    // 因为对于 pointerdown 事件 preventDefault 是不吃掉滚动行为的
    const onTouchStart = (event) => {
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      const rect = container.getBoundingClientRect();
      clientToWorld(touch.clientX, touch.clientY, 0, rect, pointerWorldScratch);
      
      for (let i = 0; i < drops.length; i++) {
        const catchR = drops[i].radius * DROP_DRAG_CATCH_MULT;
        const dx = drops[i].position.x - pointerWorldScratch.x;
        const dy = drops[i].position.y - pointerWorldScratch.y;
        if (Math.sqrt(dx * dx + dy * dy) < catchR) {
          event.preventDefault(); // 抓准了液滴，不让浏览器卷屏！
          break;
        }
      }
    };

    // ── 注册事件 ──
    // Container 主响应
    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup', onPointerUp);
    container.addEventListener('pointercancel', onPointerUp);
    container.addEventListener('pointerleave', onPointerLeave);
    container.addEventListener('lostpointercapture', onPointerUp);
    container.addEventListener('touchstart', onTouchStart, { passive: false });
    
    // 全局滚动补偿
    window.addEventListener('scroll', onScroll, { passive: true });

    // Drag Handle 捕获
    dragHandle.addEventListener('pointerdown', onPointerDown);
    dragHandle.addEventListener('pointermove', onPointerMove);
    dragHandle.addEventListener('pointerup', onPointerUp);
    dragHandle.addEventListener('pointercancel', onPointerUp);
    dragHandle.addEventListener('lostpointercapture', onPointerUp);

    // ── 自适应画质 ──
    const frameTimes = new Float32Array(30);
    let fIdx = 0, lastT = performance.now();

    function applyScale() {
      renderer.setPixelRatio(baseDPR * scale);
      renderer.setSize(w(), h());
      uniforms.uResolution.value.set(w() * baseDPR * scale, h() * baseDPR * scale);
    }

    function setQuality(nextTier, nextScale) {
      const needsShader = nextTier !== activeTier;
      const needsScale = Math.abs(nextScale - scale) > 0.001;
      activeTier = nextTier;
      scale = nextScale;
      if (needsShader) {
        material.fragmentShader = buildFragmentShader(activeTier);
        material.needsUpdate = true;
      }
      if (needsScale) applyScale();
    }

    function upgradeQuality() {
      if (upgraded) return;
      upgraded = true;
      setQuality(targetTier, targetScale);
      lastT = performance.now();
      fIdx = 0;
    }

    function adaptQuality() {
      if (!upgraded) return;
      const now = performance.now();
      frameTimes[fIdx] = now - lastT;
      lastT = now;
      fIdx = (fIdx + 1) % 30;
      if (fIdx !== 0) return;
      let sum = 0;
      for (let i = 0; i < 30; i++) sum += frameTimes[i];
      const avg = sum / 30;
      if (avg > 40 && scale > 0.3) { scale = Math.max(scale - 0.05, 0.3); applyScale(); }
      else if (avg < 20 && scale < targetScale) { scale = Math.min(scale + 0.02, targetScale); applyScale(); }
    }

    const scheduleUpgrade = () => {
      if (upgraded) return () => {};
      if ('requestIdleCallback' in window) {
        const id = window.requestIdleCallback(upgradeQuality, { timeout: BOOT_MIN_MS });
        return () => window.cancelIdleCallback(id);
      }
      const id = window.setTimeout(upgradeQuality, BOOT_MIN_MS);
      return () => window.clearTimeout(id);
    };

    const cancelUpgrade = scheduleUpgrade();

    // ── 渲染循环 ──
    const startTime = performance.now();
    let lastFrameAt = startTime;
    let animId;

    function tick() {
      animId = requestAnimationFrame(tick);
      const now = performance.now();
      const time = (now - startTime) * 0.001;
      const dt = clamp((now - lastFrameAt) * 0.001, 1 / 240, 1 / 24);
      lastFrameAt = now;

      uniforms.uTime.value = time;

      // 衰减交互能量
      const pointerDecay = Math.exp(-dt * 5.2);
      const scrollDecay = Math.exp(-dt * 3.9);

      // 拖拽液滴时驱动 pointerEnergy（shader wobble），否则衰减
      if (interaction.draggedDropIndex >= 0 && interaction.pointerActive) {
        interaction.pointerEnergy = clamp(interaction.pointerEnergy + dt * 2.0, 0, 0.8);
      } else {
        interaction.pointerEnergy *= pointerDecay;
      }
      interaction.scrollEnergy *= scrollDecay;
      interaction.scrollGravity *= scrollDecay;

      // Spike 自动飞行
      if (!spike.dragging) {
        spike.velocity.x += (SPIKE_AUTO_SPEED_X - spike.velocity.x) * Math.min(1, dt * 3.4);
        spike.velocity.y *= Math.exp(-dt * SPIKE_FREE_DAMPING);
        spike.velocity.z *= Math.exp(-dt * SPIKE_FREE_DAMPING);
        spike.position.addScaledVector(spike.velocity, dt);
        clampSpikeFreePosition(spike.position);

        if (spike.position.x > SPIKE_EXIT_X) {
          respawnSpike(time);
        }
      }

      // 液滴物理
      for (let i = 0; i < drops.length; i++) {
        const drop = drops[i];
        drop.orbit(time, drop.base);

        // 被拖拽的液滴：弹簧拉向指针位置
        if (i === interaction.draggedDropIndex && interaction.pointerActive) {
          dropToPointer.subVectors(interaction.dropDragTarget, drop.position);
          drop.velocity.addScaledVector(dropToPointer, DROP_DRAG_STIFFNESS * dt);
        } else {
          // 未拖拽：弹簧回到轨道基准位
          dropToBase.subVectors(drop.base, drop.position);
          drop.velocity.addScaledVector(dropToBase, DROP_RETURN_STIFFNESS * dt);
        }

        // 滚动重力
        drop.velocity.y -= interaction.scrollGravity * DROP_SCROLL_GRAVITY * dt / drop.mass;

        // Spike 推力
        spikeToDrop.subVectors(drop.position, spike.position);
        const spikeDistance = Math.max(spikeToDrop.length(), 0.001);
        const spikeInfluence = 1 - smoothstep(0.55, 1.9, spikeDistance);
        if (spikeInfluence > 0) {
          spikeToDrop.multiplyScalar(1 / spikeDistance);
          const spikeForce = clamp(spike.velocity.length() * 0.35, 0, 1.4) * spikeInfluence * DROP_CUBE_SWAT_GAIN * dt / drop.mass;
          drop.velocity.addScaledVector(spikeToDrop, spikeForce);
        }

        drop.velocity.multiplyScalar(Math.exp(-dt * DROP_DAMPING));
        drop.position.addScaledVector(drop.velocity, dt);

        // 偏移限制（拖拽中的液滴不限制，允许自由跟随指针）
        if (i !== interaction.draggedDropIndex) {
          dropLimitOffset.subVectors(drop.position, drop.base);
          if (dropLimitOffset.length() > DROP_MAX_OFFSET) {
            dropLimitOffset.setLength(DROP_MAX_OFFSET);
            drop.position.copy(drop.base).add(dropLimitOffset);
            drop.velocity.multiplyScalar(0.84);
          }
        }
      }

      // 液滴对排斥（双遍）
      applyPairRepulsion(drops[0].position, drops[1].position, drops[0].radius, drops[1].radius, repulsionScratch);
      applyPairRepulsion(drops[0].position, drops[2].position, drops[0].radius, drops[2].radius, repulsionScratch);
      applyPairRepulsion(drops[1].position, drops[2].position, drops[1].radius, drops[2].radius, repulsionScratch);
      applyPairRepulsion(drops[0].position, drops[1].position, drops[0].radius, drops[1].radius, repulsionScratch);
      applyPairRepulsion(drops[0].position, drops[2].position, drops[0].radius, drops[2].radius, repulsionScratch);
      applyPairRepulsion(drops[1].position, drops[2].position, drops[1].radius, drops[2].radius, repulsionScratch);

      // 渲染速度
      for (const drop of drops) {
        drop.renderVelocity
          .subVectors(drop.position, drop.previousPosition)
          .multiplyScalar(1 / dt);
        drop.previousPosition.copy(drop.position);
      }

      // Spike 旋转
      spikeEuler.set(
        time * 0.28 + Math.sin(time * 0.21) * 0.18,
        time * 0.43,
        Math.cos(time * 0.17 + 0.8) * 0.14,
      );
      spikeRotationMatrix4.makeRotationFromEuler(spikeEuler);

      // 更新 uniforms
      uniforms.uPointerEnergy.value = Math.min(interaction.pointerEnergy, 1);
      uniforms.uScrollEnergy.value = Math.min(interaction.scrollEnergy, 1);
      uniforms.uSpikePos.value.copy(spike.position);
      uniforms.uSpikeRot.value.setFromMatrix4(spikeRotationMatrix4);
      updateDropUniforms();

      // 更新拖拽手柄位置
      const rect = container.getBoundingClientRect();
      worldToLocalScreen(spike.position, rect, handleScreen);
      const handleSize = getSpikeHandleSize(rect, spike.position.z);
      dragHandle.style.left = `${handleScreen.x}px`;
      dragHandle.style.top = `${handleScreen.y}px`;
      dragHandle.style.width = `${handleSize}px`;
      dragHandle.style.height = `${handleSize}px`;
      dragHandle.style.cursor = spike.dragging ? 'grabbing' : 'grab';

      renderer.render(scene, camera);
      adaptQuality();
    }
    tick();

    const onResize = () => applyScale();
    window.addEventListener('resize', onResize);

    // ── 清理 ──
    return () => {
      cancelAnimationFrame(animId);
      cancelUpgrade();
      releaseDrag();
      container.style.cursor = '';
      
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll);
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('pointercancel', onPointerUp);
      container.removeEventListener('pointerleave', onPointerLeave);
      container.removeEventListener('lostpointercapture', onPointerUp);
      container.removeEventListener('touchstart', onTouchStart);

      dragHandle.removeEventListener('pointerdown', onPointerDown);
      dragHandle.removeEventListener('pointermove', onPointerMove);
      dragHandle.removeEventListener('pointerup', onPointerUp);
      dragHandle.removeEventListener('pointercancel', onPointerUp);
      dragHandle.removeEventListener('lostpointercapture', onPointerUp);
      geo.dispose();
      material.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'auto', touchAction: 'pan-y' }}
    >
      <div
        ref={dragHandleRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 0,
          height: 0,
          zIndex: 1,
          transform: 'translate(-50%, -50%)',
          touchAction: 'none',
          background: 'transparent',
        }}
      />
    </div>
  );
}
