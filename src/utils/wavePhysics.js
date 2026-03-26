import * as THREE from 'three';
import {
  CAMERA_Z,
  CAMERA_FOV_ABS,
  VIEW_SHIFT_X,
  VIEW_SHIFT_Y,
  SPIKE_SIZE,
  SPIKE_HANDLE_SCALE,
  SPIKE_HANDLE_MIN_SIZE,
  SPIKE_IDLE_ANCHOR,
  SPIKE_SPAWN_X,
} from '../config/waveLook';

// ══════════════════════════════════════════════════════════════
// 波浪画布物理引擎
// 纯数学函数，不依赖 React 或 DOM
// ══════════════════════════════════════════════════════════════

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

// ── 三颗液滴的轨道函数 ──
// 每颗液滴使用多个正弦/余弦叠加来产生有机、非匀速的浮动轨迹

export function setOrbitA(time, target) {
  return target.set(
    Math.sin(time * 0.17) * 1.3 + Math.sin(time * 0.41 + 1.0) * 0.4 + Math.sin(time * 0.73 + 2.7) * 0.15,
    Math.cos(time * 0.13) * 0.9 + Math.sin(time * 0.37 + 2.0) * 0.3 + Math.cos(time * 0.67 + 4.1) * 0.12,
    Math.sin(time * 0.23 + 0.7) * 0.5 + Math.cos(time * 0.53 + 1.3) * 0.2,
  );
}

export function setOrbitB(time, target) {
  return target.set(
    Math.cos(time * 0.19 + 2.1) * 1.5 + Math.sin(time * 0.31 + 3.5) * 0.35 + Math.cos(time * 0.61 + 5.2) * 0.18,
    Math.sin(time * 0.15 + 1.4) * 1.0 + Math.cos(time * 0.43 + 0.3) * 0.25 + Math.sin(time * 0.71 + 3.3) * 0.1,
    Math.cos(time * 0.29 + 1.2) * 0.55 + Math.sin(time * 0.59 + 2.8) * 0.15,
  );
}

export function setOrbitC(time, target) {
  return target.set(
    Math.sin(time * 0.21 + 4.3) * 1.4 + Math.cos(time * 0.13 + 0.8) * 0.45 + Math.sin(time * 0.79 + 1.6) * 0.2,
    Math.cos(time * 0.23 + 3.0) * 0.8 + Math.sin(time * 0.47 + 1.7) * 0.3 + Math.cos(time * 0.83 + 5.5) * 0.15,
    Math.cos(time * 0.17 + 2.5) * 0.6 + Math.sin(time * 0.57 + 3.9) * 0.25,
  );
}

export const DROP_ORBITS = [setOrbitA, setOrbitB, setOrbitC];

// ── 液滴对排斥 ──
// 当两颗液滴太近时把它们推开，防止融合

export function applyPairRepulsion(a, b, radiusA, radiusB, scratch) {
  scratch.subVectors(a, b);
  const distance = Math.max(scratch.length(), 0.001);
  const targetDistance = (radiusA + radiusB) * 0.5 + 0.03;
  const overlap = Math.max(targetDistance - distance, 0);
  if (!overlap) {
    return;
  }

  const closeness = clamp(overlap / targetDistance, 0, 1);
  const response = 0.58 + (1.15 - 0.58) * closeness * closeness;
  scratch.multiplyScalar((overlap * response * 0.5) / distance);
  a.add(scratch);
  b.sub(scratch);
}

// ── 坐标转换 ──

/** 屏幕客户端坐标 → 世界坐标 */
export function clientToWorld(clientX, clientY, depth, rect, target) {
  const minDim = Math.min(rect.width, rect.height);
  const rawX = (clientX - rect.left - rect.width * 0.5) / minDim;
  const rawY = (rect.height * 0.5 - (clientY - rect.top)) / minDim;
  const shiftedX = rawX + VIEW_SHIFT_X;
  const shiftedY = rawY + VIEW_SHIFT_Y;
  const planeDepth = CAMERA_Z - depth;

  return target.set(
    (shiftedX * planeDepth) / CAMERA_FOV_ABS,
    (shiftedY * planeDepth) / CAMERA_FOV_ABS,
    depth,
  );
}

/** 世界坐标 → 容器内局部屏幕像素坐标 */
export function worldToLocalScreen(position, rect, target) {
  const minDim = Math.min(rect.width, rect.height);
  const planeDepth = CAMERA_Z - position.z;
  const shiftedX = (position.x * CAMERA_FOV_ABS) / planeDepth;
  const shiftedY = (position.y * CAMERA_FOV_ABS) / planeDepth;
  const rawX = shiftedX - VIEW_SHIFT_X;
  const rawY = shiftedY - VIEW_SHIFT_Y;

  return target.set(
    rect.width * 0.5 + rawX * minDim,
    rect.height * 0.5 - rawY * minDim,
  );
}

/** 获取 spike（立方体）在屏幕上的可交互区域大小 */
export function getSpikeHandleSize(rect, depth) {
  const minDim = Math.min(rect.width, rect.height);
  return Math.max(((SPIKE_SIZE * CAMERA_FOV_ABS) / (CAMERA_Z - depth)) * minDim * SPIKE_HANDLE_SCALE, SPIKE_HANDLE_MIN_SIZE);
}

/** 设置 spike 在左侧重新出生的位置 */
export function setSpikeSpawnPosition(time, target) {
  return target.set(
    SPIKE_SPAWN_X,
    SPIKE_IDLE_ANCHOR.y + Math.sin(time * 0.57 + 0.9) * 0.22 + Math.sin(time * 0.19) * 0.04,
    0.34 + Math.cos(time * 0.34 + 1.6) * 0.08,
  );
}
