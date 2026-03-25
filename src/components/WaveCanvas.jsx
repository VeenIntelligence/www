import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

const TIER_SCALE = { high: 0.75, medium: 0.6, low: 0.45 };
const BOOT_TIER = 'low';
const BOOT_SCALE = 0.38;
const BOOT_MIN_MS = 900;

// 顶部总配置。你后面主要就改这里，不需要往 shader 里翻。
// `spikeMaterialMode`:
//   'cut-metal'    稳定的冷金属立方体，推荐默认用这个
//   'crystal-lite' 轻量假玻璃，便宜，但真实感上限明显
//   'pearl-ceramic' 柔和珍珠陶瓷，奶白底+轻微冷暖珠光
//   'thin-film-iridescent' 暗底薄膜虹彩，边缘会有蓝绿偏色
//   'glass-real'   真正的透明玻璃，光线穿透立方体能看到背后的水滴
const WAVE_LOOK = {
  spikeMaterialMode: 'glass-real',
  background: {
    // 背景环境底亮度。大了整个背景会一起抬亮。
    // 参考: 0.10 ~ 0.24
    envBaseMix: 0.05,
    // 远焦主光的移动速度。越大移动越明显。
    // 参考: 0.02 ~ 0.07
    focusSpeed: 0.038,
    // 远焦主光的起始相位。一般只在想换节奏时改。
    // 参考: 0.0 ~ 1.0
    focusPhaseOffset: 0.0,
    // 远焦主光横向活动包围范围 [最左, 最右]。
    // 数值差越大，横向摆幅越明显。现在会用于椭圆/扰动轨迹，不再是直线扫动。
    // 参考: [0.65, -0.05] 到 [0.45, 0.18]
    focusXRange: [0.6, -0.6],
    // 远焦主光纵向活动包围范围 [最低, 最高]。
    // 参考: [-0.12, 0.18]
    focusYRange: [-0.18, 0.14],
    // 远焦主光强弱范围 [最暗, 最亮]。
    // 这是背景“呼吸感”最直接的参数之一。
    // 参考: [0.08, 0.22] ~ [0.12, 0.42]
    focusGainRange: [0.0, 0.2],
    // 远焦主光的扩散大小 [横向, 纵向]。
    // 越小越聚焦，越大越柔和。
    // 参考: [2.4, 1.6] ~ [4.2, 2.5]
    focusScale: [3.2, 2.9],
    // 远焦主光颜色。当前是克制冷蓝。
    // 每项通常保持在 0.08 ~ 0.5
    focusColor: [0.2, 0.29, 0.44],
    // 第二束背景扫光速度。
    // 参考: 0.015 ~ 0.05
    sweepSpeed: 0.1,
    // 第二束背景扫光相位。
    // 参考: 0.0 ~ 1.0
    sweepPhaseOffset: 0.84,
    // 第二束背景扫光横向活动包围范围 [最左, 最右]。
    // 现在会作为较大椭圆/弧形轨迹的边界，不再是纯直线来回扫。
    // 参考: [-0.7, 0.45] ~ [-0.45, 0.2]
    sweepXRange: [-0.99, 0.99],
    // 第二束扫光的基准 Y 位置。
    // 实际轨迹会围绕这个值做小幅上下漂移。
    // 参考: -0.3 ~ 0.0
    sweepY: -0.18,
    // 第二束扫光强弱范围 [最暗, 最亮]。
    // 想让背景动感更容易看到，就优先抬高这里。
    // 参考: [0.04, 0.12] ~ [0.08, 0.22]
    sweepGainRange: [0.01, 0.3],
    // 第二束扫光扩散大小 [横向, 纵向]。
    // 参考: [2.2, 1.6] ~ [3.6, 2.4]
    sweepScale: [2.8, 2.0],
    // 第二束扫光颜色。
    sweepColor: [0.1, 0.16, 0.29],
  },
  studio: {
    // 反射环境里几束主光整体漂移速度。
    // 改大后，球和立方体表面的反射会更明显地缓动。
    // 参考: 0.10 ~ 0.3
    driftSpeed: 0.18,
    // 反射环境灯位漂移幅度 [X, Y, Z]。
    // 想让物体表面的反射更“活”，优先改 X 和 Z。
    // 参考: [0.02, 0.01, 0.02] ~ [0.08, 0.03, 0.08]
    driftAmplitude: [0.04, 0.018, 0.04],
    // 主 key light 的强度 [软高光, 硬高光]。
    // 第二项越大，亮点越“爆”。
    // 参考: [0.7, 3.5] ~ [1.2, 6.0]
    keyStrength: [0.9, 4.5],
    // 辅助 fill light 的强度 [软高光, 硬高光]。
    // 参考: [0.2, 1.0] ~ [0.5, 2.4]
    fillStrength: [0.35, 1.8],
    // 轮廓 rim light 的强度 [软高光, 硬高光]。
    // 参考: [0.3, 2.0] ~ [0.8, 4.5]
    rimStrength: [0.6, 3.5],
    // 顶部环境光强度。抬高会让上半部更亮。
    // 参考: 0.06 ~ 0.16
    topLightStrength: 0.02,
    // 底部环境光强度。抬高会减少底部的压暗感。
    // 参考: 0.01 ~ 0.06
    bottomLightStrength: 0.02,
    bandA: {
      // 第一条明暗带的移动速度。
      // 参考: 0.12 ~ 0.3
      speed: 0.21,
      // 第一条明暗带的摆动幅度。
      // 参考: 0.02 ~ 0.06
      amplitude: 0.035,
      // 第一条明暗带的亮度。
      // 参考: 0.08 ~ 0.24
      intensity: 0.16,
    },
    bandB: {
      // 第二条明暗带速度。
      // 参考: 0.1 ~ 0.24
      speed: 0.17,
      // 第二条明暗带起始相位。
      // 参考: 0.0 ~ 3.14
      phaseOffset: 1.2,
      // 第二条明暗带摆动幅度。
      // 参考: 0.02 ~ 0.07
      amplitude: 0.045,
      // 第二条明暗带亮度。
      // 参考: 0.06 ~ 0.18
      intensity: 0.11,
    },
    sweepA: {
      // 第一束横向扫光速度。
      // 参考: 0.08 ~ 0.18
      speed: 0.12,
      // 第一束横向扫光的左右位移幅度。
      // 这个值越大，越容易看见“扫过去”。
      // 参考: 0.04 ~ 0.16
      amplitude: 0.08,
      // 第一束横向扫光的中心 X。
      // 参考: 0.1 ~ 0.35
      centerX: 0.24,
      // 第一束横向扫光的中心 Y。
      // 参考: -0.05 ~ 0.18
      centerY: 0.08,
      // 第一束横向扫光亮度。
      // 想让背景更明显，先加这个。
      // 参考: 0.06 ~ 0.16
      intensity: 0.09,
    },
    sweepB: {
      // 第二束横向扫光速度。
      // 参考: 0.06 ~ 0.16
      speed: 0.09,
      // 第二束横向扫光起始相位。
      // 参考: 0.0 ~ 3.14
      phaseOffset: 1.3,
      // 第二束横向扫光位移幅度。
      // 参考: 0.03 ~ 0.12
      amplitude: 0.06,
      // 第二束横向扫光中心 X。
      // 参考: -0.5 ~ -0.15
      centerX: -0.34,
      // 第二束横向扫光中心 Y。
      // 参考: -0.28 ~ -0.05
      centerY: -0.16,
      // 第二束横向扫光亮度。
      // 参考: 0.04 ~ 0.14
      intensity: 0.07,
    },
  },
  spike: {
    // 金属反射增益。更高会更亮、更像镜面金属。
    // 参考: 1.0 ~ 1.18
    metalReflectBoost: 1.0,
    // 金属高光增益。更高会更“透亮”，但也更容易刺眼。
    // 参考: 0.4 ~ 0.9
    metalSpecBoost: 0.2,
    // 金属边缘亮度范围 [正面, 边缘]。
    // 第二项越高，边缘越提亮。
    // 参考: [0.45, 1.0] ~ [0.6, 1.08]
    metalEdgeLift: [0.5, 1.02],
    // 假晶体折射率。真实玻璃约 1.5。
    // 参考: 1.05 ~ 1.55
    crystalIor: 1.45,
    // 假晶体反射增益。降低一点保持通透。
    crystalReflectBoost: 0.8,
    // 假晶体透射增益。
    crystalTransmissionBoost: 1.0,
    // 假晶体厚度范围 [正面, 边缘]。调薄以显得清透，减轻抗锯齿压力。
    crystalThickness: [0.05, 0.3],
    // 假晶体吸收颜色强度。非常低，保持全透，带极其微弱的冷色偏色。
    crystalAbsorption: [0.1, 0.15, 0.05],
    // 假晶体边缘染色。全透明玻璃边缘由于全反射往往有微弱环境色。
    crystalEdgeTint: [0.9, 0.95, 1.0],
    // 假晶体边缘染色强度。调弱。
    crystalEdgeTintBoost: 0.15,
    // 假晶体高光强度。玻璃高光非常锐利明亮，能极大增强质感。
    crystalSpecBoost: 1.4,
    // 假晶体整体亮度范围 [正面, 边缘]。不强加亮度。
    crystalLift: [0.95, 1.0],
    // 薄膜虹彩的基底颜色。偏冷灰银更容易稳住高级感。
    iridescentBaseTint: [0.72, 0.76, 0.84],
    // 薄膜虹彩两端色。这里先压在蓝青范围，不做夸张彩虹。
    iridescentFilmColorA: [0.16, 0.72, 0.98],
    iridescentFilmColorB: [0.38, 0.98, 0.8],
    // 正面亮度。越低中心越暗、更像镀膜金属。
    iridescentCoreLift: 0.32,
    // 边缘亮度。越高 grazing angle 的虹彩越明显。
    iridescentEdgeLift: 1.18,
    // 薄膜颜色叠加强度。
    iridescentFilmStrength: 0.82,
    // 条纹密度。越大越像薄膜干涉。
    iridescentBandScale: 20.0,
    // 反射/法线对条纹走向的影响。
    iridescentSweepScale: 6.5,
    // 薄膜高光强度。
    iridescentSpecBoost: 0.72,
    // 珍珠陶瓷主底色。偏暖白能避免死灰。
    pearlBaseColor: [0.92, 0.91, 0.88],
    // 陶瓷背光/暗部颜色。轻微偏冷，让体积更干净。
    pearlShadowTint: [0.62, 0.66, 0.72],
    // 珠光 sheen 颜色。只做很轻的蓝粉偏色。
    pearlSheenColor: [0.84, 0.9, 0.98],
    // 环境反射参与度。越高越像釉面，越低越像粉陶。
    pearlReflectMix: 0.16,
    // 正面与边缘亮度。
    pearlCoreLift: 0.92,
    pearlEdgeLift: 1.08,
    // 陶瓷高光强度。
    pearlSpecBoost: 0.88,
    // 珠光层强度。
    pearlSheenBoost: 0.18,
    // === 真透明玻璃参数 (glass-real) ===
    // 折射率。1.0=空气，1.5=标准玻璃，1.7=重玻璃。
    glassIor: 1.5,
    // 玻璃内部吸收颜色。控制光穿过后的色偏。值越大吸收越重。
    // 轻微偏冷蓝 = 真实白玻璃的典型表现。
    glassAbsorption: [0.3, 0.15, 0.05],
    // 边缘高光强度。玻璃边缘的锐利反射。
    glassSpecBoost: 1.6,
    // 反射强度缩放。越大越像镜面，越小越透明。
    glassReflectMix: 1.0,
    // 边缘 Fresnel 光辉颜色。
    glassEdgeGlow: [0.7, 0.85, 1.0],
    // 边缘 Fresnel 光辉强度。
    glassEdgeGlowBoost: 0.12,
  },
};

function glslFloat(value) {
  const trimmed = Number(value).toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  return trimmed.includes('.') ? trimmed : `${trimmed}.0`;
}

function glslVec3(values) {
  return `vec3(${values.map(glslFloat).join(', ')})`;
}

/* ──────────────────────────────────────────────────────────
   Fragment shader body — defines prepended per GPU tier
   ────────────────────────────────────────────────────────── */
const fragmentShaderBody = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform vec2  uResolution;
uniform vec2  uMouse;
uniform float uScrollVel;
uniform float uMouseVel;

#define MAX_DIST  16.0
#define PI 3.14159265

/* ═══════════════════════════════════════════════════════════
   🎛️  可调参数 — 改这里就行，不用翻后面的代码
   ═══════════════════════════════════════════════════════════ */

// --- 液滴形变 ---
#define VEL_STRETCH  0.05   // 速度拉伸系数（调低，消除刻意的拖尾拉伸，保持自然圆润）

// --- 液滴表面颤动（wobble）---
#define WOBBLE_BASE    0.01  // 基础颤动幅度（越大表面越不安静）
#define WOBBLE_SCROLL  0.1   // 页面滚动对颤动的影响权重
#define WOBBLE_MOUSE   0.2   // 鼠标移动对颤动的影响权重

// --- 液滴交融 ---
#define BLEND_K      0.39   // smin 混合半径，保留一点液态边缘，但不再大面积连桥
#define RIPPLE_FREQ  1.0   // 交融处涟漪频率（越大波纹越密）
#define RIPPLE_AMP   0.025  // 交融处涟漪振幅（越大波纹越明显，0=无波纹）
#define RIPPLE_SPEED 1.0    // 涟漪滚动速度

// --- 液滴斥力 ---
#define REPEL_PAD    0.5   // 最小中心距系数。1.0=刚好贴边，略高于1会留一条很细的安全缝
#define REPEL_MARGIN 0.03   // 额外安全边距，防止边缘在高光下看起来像贴住
#define REPEL_NEAR_BOOST 1.15 // 靠近时的互斥增强，越近推得越明显，但不做夸张弹开

// --- 立方体（spike）---
#define SPIKE_SIZE   0.3   // 立方体半径
#define SPIKE_ROUND  0.01  // 立方体圆角半径
#define SPIKE_SPIN   0.5   // 旋转速度
#define SPIKE_CYCLE  16.0  // spike 出现周期（加大周期，减少常驻性能消耗）
#define SPIKE_FLY    8.0   // spike 飞行时长（减小飞行时间，保证只有一半时间在屏幕上）
#define SPIKE_Y_AMP  0.4   // spike 每次飞行 Y 轴随机偏移幅度
#define SPIKE_Z_AMP  1.3   // spike 每次飞行 Z 轴随机偏移幅度

// --- spike 对液滴的推力 ---
#define SCATTER_STR  0.0    // spike 推开液滴的力度（改为0，直接贯穿不推开，防止拉成大三角）
#define SCATTER_FALL 0.2    // 推力衰减速度

// --- spike 在液面上的形变 ---
#define SPIKE_DEFORM 0.9   // spike 靠近时液面凹陷深度
#define SPIKE_DEFORM_FALL 0.8 // 凹陷衰减
#define WAKE_FREQ    1.0   // spike 尾迹波纹频率
#define WAKE_AMP     0.2    // spike 尾迹波纹振幅（改为0，无干扰）
#define WAKE_FALL    1.5    // 尾迹衰减速度

// --- 相机与鼠标 ---
#define CAM_Z        12    // 相机 Z 位置（越大越远）
#define CAM_FOV     -3.9    // 镜头焦距（负值，绝对值越大视角越窄）
#define MOUSE_CAM_X  0.25   // 鼠标对相机 X 的影响系数
#define MOUSE_CAM_Y  0.15   // 鼠标对相机 Y 的影响系数

/* ═══════════════════════════════════════════════════════════ */

/* ── Globals (set once per pixel in main()) ── */
vec3 gDropA, gDropB, gDropC;
vec3 gVelA, gVelB, gVelC;
#ifdef SPIKE_ENABLED
vec3  gSpikePos;
mat3  gSpikeRot;
float gSpikeActive;
float gSpikeFlyProgress;
#endif

/* ── Smooth min ── */
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

void applyPairRepulsion(inout vec3 a, inout vec3 b, float ra, float rb) {
  vec3 delta = a - b;
  float dist = max(length(delta), 0.001);
  float targetDist = (ra + rb) * REPEL_PAD + REPEL_MARGIN;
  float overlap = max(targetDist - dist, 0.0);
  if (overlap <= 0.0) return;

  float closeness = clamp(overlap / targetDist, 0.0, 1.0);
  float response = mix(0.58, REPEL_NEAR_BOOST, closeness * closeness);
  vec3 correction = (delta / dist) * overlap * response * 0.5;
  a += correction;
  b -= correction;
}

/* ── Rotation helpers ── */
mat3 rotY(float a) {
  float s = sin(a), c = cos(a);
  return mat3(c,0,-s, 0,1,0, s,0,c);
}
mat3 rotZ(float a) {
  float s = sin(a), c = cos(a);
  return mat3(c,-s,0, s,c,0, 0,0,1);
}

/* ── Cube SDF ── */
#ifdef SPIKE_ENABLED
float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}
float sdRoundBox(vec3 p, vec3 b, float r) {
  vec3 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
}
#endif

/* ── Wobble ── */
float getWobble() {
  return WOBBLE_BASE + uScrollVel * WOBBLE_SCROLL + uMouseVel * WOBBLE_MOUSE;
}

/* ── Velocity-based ellipsoidal SDF for a single drop ── */
float sdVelDrop(vec3 p, vec3 center, float radius, vec3 vel) {
  vec3 d = p - center;
  float speed = length(vel);
  float stretchAmt = 1.0 + speed * VEL_STRETCH;
  if (speed > 0.001) {
    vec3 vn = vel / speed;
    float proj = dot(d, vn);
    d = d - vn * proj * (1.0 - 1.0/stretchAmt);
  }
  return length(d) - radius;
}

float getSurfaceDeform(vec3 p) {
  float wobble = getWobble();
  float t = uTime;

  #ifdef QUALITY_HIGH
  float da = 0.03 + wobble;
  float deform = sin(p.x*1.5+t*0.3)*sin(p.y*1.8+t*0.25)*da
               + sin(p.z*2.0+p.x*1.2+t*0.4)*da*0.4;
  #elif defined(QUALITY_MEDIUM)
  float da = 0.025 + wobble;
  float deform = sin(p.x*1.5+t*0.3)*sin(p.y*1.8+t*0.25)*da;
  #else
  float deform = 0.0;
  #endif

  #ifdef SPIKE_ENABLED
  if (gSpikeActive > 0.5) {
    float spikeDist = length(p - gSpikePos);
    deform -= exp(-spikeDist * SPIKE_DEFORM_FALL) * SPIKE_DEFORM;
    float wake = sin(spikeDist * WAKE_FREQ - t * 4.0) * exp(-spikeDist * WAKE_FALL) * WAKE_AMP;
    deform += wake;
  }
  #endif

  return deform;
}

float mapDrops(vec3 p, float deform) {
  float t = uTime;

  float dropA = sdVelDrop(p, gDropA, 0.85, gVelA) + deform;
  float dropB = sdVelDrop(p, gDropB, 0.58, gVelB) + deform;
  float dropC = sdVelDrop(p, gDropC, 0.40, gVelC) + deform;

  #ifndef QUALITY_LOW
  float abDist = length(gDropA - gDropB);
  float abProximity = smoothstep(2.5, 0.8, abDist);
  float rippleAB = sin(length(p - (gDropA+gDropB)*0.5)*RIPPLE_FREQ - t*RIPPLE_SPEED) * RIPPLE_AMP * abProximity;

  float acDist = length(gDropA - gDropC);
  float acProximity = smoothstep(2.0, 0.6, acDist);
  float rippleAC = sin(length(p - (gDropA+gDropC)*0.5)*(RIPPLE_FREQ+2.0) - t*(RIPPLE_SPEED-0.5)) * (RIPPLE_AMP*0.8) * acProximity;

  float bcDist = length(gDropB - gDropC);
  float bcProximity = smoothstep(1.8, 0.5, bcDist);
  float rippleBC = sin(length(p - (gDropB+gDropC)*0.5)*(RIPPLE_FREQ+4.0) - t*(RIPPLE_SPEED+0.5)) * (RIPPLE_AMP*0.72) * bcProximity;
  #else
  float rippleAB = 0.0, rippleAC = 0.0, rippleBC = 0.0;
  #endif

  float d = smin(dropA + rippleAB, dropB + rippleAB, BLEND_K);
  d = smin(d + rippleAC + rippleBC, dropC + rippleAC + rippleBC, BLEND_K);
  return d;
}

float mapSpike(vec3 p) {
  float spikeD = 1e5;
  #ifdef SPIKE_ENABLED
  if (gSpikeActive > 0.5) {
    vec3 sp = gSpikeRot * (p - gSpikePos);
    spikeD = sdRoundBox(sp, vec3(SPIKE_SIZE), SPIKE_ROUND);
  }
  #endif
  return spikeD;
}

/* ── Scene SDF (drops only, used for glass pass-through) ── */
float mapDropsOnly(vec3 p) {
  float deform = getSurfaceDeform(p);
  return mapDrops(p, deform);
}

void getSceneDistances(vec3 p, out float dropD, out float spikeD) {
  float deform = getSurfaceDeform(p);
  dropD = mapDrops(p, deform);
  spikeD = mapSpike(p);
}

/* ── Scene SDF ── */
#ifdef SPIKE_MATERIAL_GLASS
/* Glass mode: spike is NOT part of opaque scene SDF.
   We march drops only; spike is handled separately in main() */
float map(vec3 p) {
  return mapDropsOnly(p);
}
#else
float map(vec3 p) {
  float dropD;
  float spikeD;
  getSceneDistances(p, dropD, spikeD);
  return min(dropD, spikeD);
}
#endif

/* ── Normal for arbitrary SDF function ── */
vec3 calcNormal(vec3 p) {
  vec2 e = vec2(NORMAL_EPS, -NORMAL_EPS);
  return normalize(
    e.xyy * map(p + e.xyy) +
    e.yyx * map(p + e.yyx) +
    e.yxy * map(p + e.yxy) +
    e.xxx * map(p + e.xxx)
  );
}

#ifdef SPIKE_MATERIAL_GLASS
/* ── Normal for spike only ── */
vec3 calcSpikeNormal(vec3 p) {
  vec2 e = vec2(NORMAL_EPS, -NORMAL_EPS);
  return normalize(
    e.xyy * mapSpike(p + e.xyy) +
    e.yyx * mapSpike(p + e.yyx) +
    e.yxy * mapSpike(p + e.yxy) +
    e.xxx * mapSpike(p + e.xxx)
  );
}
#endif

/* ── Raymarching ── */
float rayMarch(vec3 ro, vec3 rd) {
  float d = 0.0;
  for (int i = 0; i < MAX_STEPS; i++) {
    float ds = map(ro + rd * d);
    d += ds;
    if (ds < SURF_DIST || d > MAX_DIST) break;
  }
  return d;
}

#ifdef SPIKE_MATERIAL_GLASS
/* ── March inside the glass cube (SDF is negative inside, so we negate) ── */
float rayMarchInsideSpike(vec3 ro, vec3 rd) {
  float d = 0.0;
  for (int i = 0; i < GLASS_INTERIOR_STEPS; i++) {
    float ds = -mapSpike(ro + rd * d); // negate: inside SDF is negative
    d += max(ds, SURF_DIST * 0.5); // clamp to avoid getting stuck
    if (ds < SURF_DIST || d > 4.0) break; // 4.0 is max cube diagonal
  }
  return d;
}

/* ── March the spike from outside to find entry point ── */
float rayMarchSpike(vec3 ro, vec3 rd) {
  float d = 0.0;
  for (int i = 0; i < MAX_STEPS; i++) {
    float ds = mapSpike(ro + rd * d);
    d += ds;
    if (ds < SURF_DIST || d > MAX_DIST) break;
  }
  return d;
}
#endif

/* ── Cold Studio HDRI Environment ── */
vec3 animateDir(vec3 dir, float seed) {
  float t = uTime * ENV_DRIFT_SPEED + seed;
  vec3 drift = vec3(
    sin(t * 0.91) * ENV_DRIFT_X_AMP,
    cos(t * 0.63) * ENV_DRIFT_Y_AMP,
    sin(t * 0.58 + seed * 1.4) * ENV_DRIFT_Z_AMP
  );
  return normalize(dir + drift);
}

float softBox(vec3 rd, vec3 dir, vec2 size, float focus) {
  vec3 z = normalize(dir);
  vec3 up = abs(z.y) > 0.96 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
  vec3 x = normalize(cross(up, z));
  vec3 y = normalize(cross(z, x));
  vec2 q = vec2(dot(rd, x), dot(rd, y));
  float shape = exp(-(q.x*q.x)/(size.x*size.x) - (q.y*q.y)/(size.y*size.y));
  float facing = pow(max(dot(rd, z), 0.0), focus);
  return shape * facing;
}

vec3 envMap(vec3 rd) {
  float t = uTime;
  vec3 col = vec3(0.003, 0.004, 0.01);

  vec3 keyDir = animateDir(vec3(0.8, 0.9, 0.5), 0.0);
  float kd = max(dot(rd, keyDir), 0.0);
  col += vec3(1.0, 0.99, 0.97) * (pow(kd, 6.0) * ENV_KEY_SOFT_GAIN + pow(kd, 200.0) * ENV_KEY_HARD_GAIN);

  vec3 fillDir = animateDir(vec3(-0.9, 0.3, -0.4), 1.7);
  float fd = max(dot(rd, fillDir), 0.0);
  col += vec3(0.65, 0.78, 1.0) * (pow(fd, 4.0) * ENV_FILL_SOFT_GAIN + pow(fd, 120.0) * ENV_FILL_HARD_GAIN);

  vec3 rimDir = animateDir(vec3(-0.3, -0.7, -0.9), 3.2);
  float rmd = max(dot(rd, rimDir), 0.0);
  col += vec3(0.55, 0.72, 1.0) * (pow(rmd, 7.0) * ENV_RIM_SOFT_GAIN + pow(rmd, 280.0) * ENV_RIM_HARD_GAIN);

  float topDot = max(rd.y, 0.0);
  col += vec3(0.1, 0.1, 0.12) * pow(topDot, 3.0) * ENV_TOP_LIGHT_GAIN;
  col += vec3(0.02, 0.025, 0.04) * pow(max(-rd.y, 0.0), 2.0) * ENV_BOTTOM_LIGHT_GAIN;

  float bandShiftA = sin(t * ENV_BAND_A_SPEED) * ENV_BAND_A_AMPLITUDE;
  float bandShiftB = cos(t * ENV_BAND_B_SPEED + ENV_BAND_B_PHASE_OFFSET) * ENV_BAND_B_AMPLITUDE;
  float driftX = sin(t * ENV_SWEEP_A_SPEED) * ENV_SWEEP_A_AMPLITUDE;
  float driftX2 = cos(t * ENV_SWEEP_B_SPEED + ENV_SWEEP_B_PHASE_OFFSET) * ENV_SWEEP_B_AMPLITUDE;

  // Gradient bands — tier-gated
  col += vec3(0.95, 0.95, 0.97) * exp(-pow((rd.y-0.15-bandShiftA)*5.0, 2.0)) * ENV_BAND_A_INTENSITY;
  #ifndef QUALITY_LOW
  col += vec3(0.55, 0.65, 0.85) * exp(-pow((rd.y+0.3-bandShiftB)*4.0, 2.0)) * ENV_BAND_B_INTENSITY;
  #endif
  #ifdef QUALITY_HIGH
  col += vec3(0.9, 0.91, 0.93) * exp(-pow((rd.y-0.6+bandShiftA*0.6)*6.0, 2.0)) * 0.09;
  col += vec3(0.88, 0.9, 0.95) * exp(-pow((rd.x-0.1+bandShiftB*0.5)*8.0, 2.0)) * 0.06;
  #endif

  col += vec3(0.72, 0.82, 1.0) * exp(-pow((rd.x - ENV_SWEEP_A_CENTER_X - driftX) * 6.0, 2.0) - pow((rd.y - ENV_SWEEP_A_CENTER_Y) * 3.2, 2.0)) * ENV_SWEEP_A_INTENSITY;
  #ifndef QUALITY_LOW
  col += vec3(0.46, 0.6, 0.88) * exp(-pow((rd.x - ENV_SWEEP_B_CENTER_X + driftX2) * 5.2, 2.0) - pow((rd.y - ENV_SWEEP_B_CENTER_Y) * 2.8, 2.0)) * ENV_SWEEP_B_INTENSITY;
  #endif

  return col;
}

vec3 backgroundGlow(vec3 rd) {
  float focusAngle = uTime * BG_FOCUS_SPEED * PI * 2.0 + BG_FOCUS_PHASE_OFFSET * PI * 2.0;
  vec2 focusCenter = vec2(
    (BG_FOCUS_X_MIN + BG_FOCUS_X_MAX) * 0.5,
    (BG_FOCUS_Y_MIN + BG_FOCUS_Y_MAX) * 0.5
  );
  vec2 focusAmp = vec2(
    abs(BG_FOCUS_X_MAX - BG_FOCUS_X_MIN) * 0.5,
    abs(BG_FOCUS_Y_MAX - BG_FOCUS_Y_MIN) * 0.5
  );
  float focusXPhase = focusAngle
    + sin(focusAngle * 0.37 + 0.8) * 0.32
    + cos(focusAngle * 0.11 + 1.7) * 0.14;
  float focusYPhase = focusAngle * 0.81 + 1.3
    + cos(focusAngle * 0.29 + 2.1) * 0.26;
  float focusX = focusCenter.x + cos(focusXPhase) * focusAmp.x;
  float focusY = focusCenter.y + sin(focusYPhase) * focusAmp.y;
  float focusGainWave = 0.5 + 0.5 * sin(
    focusAngle * 0.92 + 0.4 + sin(focusAngle * 0.18 + 2.6) * 0.35
  );
  float focusGain = mix(BG_FOCUS_GAIN_MIN, BG_FOCUS_GAIN_MAX, focusGainWave);

  float sweepAngle = uTime * BG_SWEEP_SPEED * PI * 2.0 + BG_SWEEP_PHASE_OFFSET * PI * 2.0;
  float sweepCenterX = (BG_SWEEP_X_MIN + BG_SWEEP_X_MAX) * 0.5;
  float sweepAmpX = abs(BG_SWEEP_X_MAX - BG_SWEEP_X_MIN) * 0.5;
  float sweepAmpY = sweepAmpX * 0.16;
  float sweepXPhase = sweepAngle
    + sin(sweepAngle * 0.41 + 2.4) * 0.24
    + cos(sweepAngle * 0.17 + 0.5) * 0.10;
  float sweepYPhase = sweepAngle * 0.63 + 0.9
    + sin(sweepAngle * 0.21 + 1.8) * 0.22;
  float sweepX = sweepCenterX + cos(sweepXPhase) * sweepAmpX;
  float sweepY = BG_SWEEP_Y + sin(sweepYPhase) * sweepAmpY;
  float sweepGainWave = 0.5 + 0.5 * sin(
    sweepAngle * 0.73 + 1.2 + cos(sweepAngle * 0.16 + 0.9) * 0.28
  );
  float sweepGain = mix(BG_SWEEP_GAIN_MIN, BG_SWEEP_GAIN_MAX, sweepGainWave);
  vec3 col = vec3(0.0);
  col += BG_FOCUS_COLOR * exp(-pow((rd.x - focusX) * BG_FOCUS_SCALE_X, 2.0) - pow((rd.y - focusY) * BG_FOCUS_SCALE_Y, 2.0)) * focusGain;
  col += BG_SWEEP_COLOR * exp(-pow((rd.x - sweepX) * BG_SWEEP_SCALE_X, 2.0) - pow((rd.y - sweepY) * BG_SWEEP_SCALE_Y, 2.0)) * sweepGain;
  return col;
}

/* ── Shading ── */
float specularLobe(vec3 n, vec3 v, vec3 l, float alphaSq) {
  vec3 h = normalize(l + v);
  float NdH = max(dot(n, h), 0.0);
  float NdL = max(dot(n, l), 0.0);
  float denom = PI * pow(NdH*NdH*(alphaSq-1.0)+1.0, 2.0);
  return (alphaSq / max(denom, 0.0001)) * NdL;
}

vec3 shadeDrops(vec3 n, vec3 v, vec3 reflected, float cosTheta) {
  vec3 F0 = vec3(0.972, 0.960, 0.915);
  vec3 fresnel = F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
  vec3 color = reflected * fresnel;

  #ifndef QUALITY_LOW
  vec3 keyL = animateDir(vec3(0.8, 0.9, 0.5), 0.0);
  #ifdef QUALITY_HIGH
  float alphaSq = 0.000004;
  #else
  float alphaSq = 0.00004;
  #endif
  color += vec3(1.0, 0.99, 0.96) * specularLobe(n, v, keyL, alphaSq) * fresnel * 0.5;
  #endif

  color *= mix(0.4, 1.0, smoothstep(0.0, 0.2, cosTheta));
  return color;
}

vec3 shadeMetalSpike(vec3 n, vec3 v, vec3 reflected, float cosTheta) {
  vec3 F0 = vec3(0.982, 0.982, 0.975);
  vec3 fresnel = F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
  vec3 color = reflected * fresnel * SPIKE_METAL_REFLECT_BOOST;

  #ifndef QUALITY_LOW
  vec3 keyL = animateDir(vec3(0.8, 0.9, 0.5), 0.0);
  #ifdef QUALITY_HIGH
  float alphaSq = 0.000002;
  #else
  float alphaSq = 0.00001;
  #endif
  color += vec3(1.0, 0.99, 0.96) * specularLobe(n, v, keyL, alphaSq) * fresnel * SPIKE_METAL_SPEC_BOOST;
  #endif

  color *= mix(SPIKE_METAL_LIFT_MIN, SPIKE_METAL_LIFT_MAX, smoothstep(0.0, 0.2, cosTheta));
  return color;
}

vec3 shadeCrystalSpike(vec3 rd, vec3 n, vec3 v, vec3 reflected, float cosTheta) {
  vec3 refracted = envMap(refract(rd, n, 1.0 / SPIKE_CRYSTAL_IOR));
  vec3 F0 = vec3(0.028, 0.03, 0.034);
  vec3 fresnel = F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
  float thickness = mix(SPIKE_CRYSTAL_THICKNESS_MIN, SPIKE_CRYSTAL_THICKNESS_MAX, 1.0 - cosTheta);
  vec3 absorption = exp(-SPIKE_CRYSTAL_ABSORPTION * thickness);
  vec3 transmission = refracted * absorption * SPIKE_CRYSTAL_TRANSMISSION_BOOST;
  vec3 color = mix(transmission, reflected * SPIKE_CRYSTAL_REFLECT_BOOST, fresnel);
  color += SPIKE_CRYSTAL_EDGE_TINT * pow(1.0 - cosTheta, 3.0) * SPIKE_CRYSTAL_EDGE_TINT_BOOST;

  #ifndef QUALITY_LOW
  vec3 keyL = animateDir(vec3(0.8, 0.9, 0.5), 0.0);
  #ifdef QUALITY_HIGH
  float alphaSq = 0.000003;
  #else
  float alphaSq = 0.000015;
  #endif
  color += vec3(1.0, 1.0, 0.99) * specularLobe(n, v, keyL, alphaSq) * SPIKE_CRYSTAL_SPEC_BOOST;
  #endif

  color *= mix(SPIKE_CRYSTAL_LIFT_MIN, SPIKE_CRYSTAL_LIFT_MAX, smoothstep(0.0, 0.22, cosTheta));
  return color;
}

vec3 shadeIridescentSpike(vec3 n, vec3 v, vec3 reflected, float cosTheta) {
  float edge = pow(1.0 - cosTheta, 1.35);
  float sweep = dot(n, normalize(vec3(0.58, 0.72, -0.37))) * SPIKE_IRIDESCENT_SWEEP_SCALE
    + dot(reflected, normalize(vec3(-0.44, 0.22, 0.87))) * (SPIKE_IRIDESCENT_SWEEP_SCALE * 0.72);
  float band = 0.5 + 0.5 * sin((1.0 - cosTheta) * SPIKE_IRIDESCENT_BAND_SCALE + sweep);
  vec3 filmTint = mix(SPIKE_IRIDESCENT_FILM_A, SPIKE_IRIDESCENT_FILM_B, band);

  vec3 base = reflected * SPIKE_IRIDESCENT_BASE_TINT;
  vec3 color = base * mix(SPIKE_IRIDESCENT_CORE_LIFT, SPIKE_IRIDESCENT_EDGE_LIFT, edge);
  color += reflected * filmTint * (0.16 + edge * SPIKE_IRIDESCENT_FILM_STRENGTH);
  color += filmTint * edge * 0.08;

  #ifndef QUALITY_LOW
  vec3 keyL = animateDir(vec3(0.8, 0.9, 0.5), 0.0);
  #ifdef QUALITY_HIGH
  float alphaSq = 0.000004;
  #else
  float alphaSq = 0.00002;
  #endif
  vec3 specTint = mix(vec3(1.0, 0.99, 0.98), filmTint, 0.35);
  color += specTint * specularLobe(n, v, keyL, alphaSq) * SPIKE_IRIDESCENT_SPEC_BOOST;
  #endif

  return color;
}

vec3 shadePearlSpike(vec3 n, vec3 v, vec3 reflected, float cosTheta) {
  float edge = pow(1.0 - cosTheta, 1.8);
  float facing = smoothstep(0.0, 0.85, cosTheta);
  float sheenBand = 0.5 + 0.5 * dot(n, normalize(vec3(-0.28, 0.9, 0.34)));

  vec3 base = mix(SPIKE_PEARL_SHADOW_TINT, SPIKE_PEARL_BASE_COLOR, facing);
  vec3 color = base * mix(SPIKE_PEARL_CORE_LIFT, SPIKE_PEARL_EDGE_LIFT, edge);
  color += reflected * SPIKE_PEARL_REFLECT_MIX;
  color += SPIKE_PEARL_SHEEN_COLOR * pow(sheenBand, 2.8) * (SPIKE_PEARL_SHEEN_BOOST + edge * 0.08);

  #ifndef QUALITY_LOW
  vec3 keyL = animateDir(vec3(0.8, 0.9, 0.5), 0.0);
  vec3 fillL = animateDir(vec3(-0.9, 0.3, -0.4), 1.7);
  #ifdef QUALITY_HIGH
  float glossAlphaSq = 0.006;
  float softAlphaSq = 0.04;
  #else
  float glossAlphaSq = 0.012;
  float softAlphaSq = 0.055;
  #endif
  color += vec3(1.0, 0.985, 0.965) * specularLobe(n, v, keyL, glossAlphaSq) * SPIKE_PEARL_SPEC_BOOST;
  color += SPIKE_PEARL_SHEEN_COLOR * specularLobe(n, v, fillL, softAlphaSq) * (SPIKE_PEARL_SPEC_BOOST * 0.34);
  #endif

  return color;
}

vec3 shade(vec3 p, vec3 rd, vec3 n) {
  vec3 v = -rd;
  vec3 r = reflect(rd, n);
  float cosTheta = max(dot(n, v), 0.0);
  vec3 reflected = envMap(r);

  #ifdef SPIKE_MATERIAL_GLASS
  // In glass mode, shade() is only called for drops (spike handled in main)
  return shadeDrops(n, v, reflected, cosTheta);
  #else
  float dropD;
  float spikeD;
  getSceneDistances(p, dropD, spikeD);
  float spikeMask = smoothstep(0.02, -0.02, spikeD - dropD);
  vec3 dropColor = shadeDrops(n, v, reflected, cosTheta);
  vec3 spikeColor;
  #ifdef SPIKE_MATERIAL_CRYSTAL
  spikeColor = shadeCrystalSpike(rd, n, v, reflected, cosTheta);
  #elif defined(SPIKE_MATERIAL_PEARL)
  spikeColor = shadePearlSpike(n, v, reflected, cosTheta);
  #elif defined(SPIKE_MATERIAL_IRIDESCENT)
  spikeColor = shadeIridescentSpike(n, v, reflected, cosTheta);
  #else
  spikeColor = shadeMetalSpike(n, v, reflected, cosTheta);
  #endif
  return mix(dropColor, spikeColor, spikeMask);
  #endif
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5*uResolution) / min(uResolution.x, uResolution.y);
  uv.x -= 0.22;
  uv.y += 0.02;

  float t = uTime;

  /* ── Drop positions — multi-layer chaotic orbits ── */
  float dt = 0.01;  // small delta for velocity estimation

  // Position function evaluated at t and t-dt for velocity
  vec3 rawA = vec3(
    sin(t*0.17)*1.3 + sin(t*0.41+1.0)*0.4 + sin(t*0.73+2.7)*0.15,
    cos(t*0.13)*0.9 + sin(t*0.37+2.0)*0.3 + cos(t*0.67+4.1)*0.12,
    sin(t*0.23+0.7)*0.5 + cos(t*0.53+1.3)*0.2
  );
  vec3 prevA = vec3(
    sin((t-dt)*0.17)*1.3 + sin((t-dt)*0.41+1.0)*0.4 + sin((t-dt)*0.73+2.7)*0.15,
    cos((t-dt)*0.13)*0.9 + sin((t-dt)*0.37+2.0)*0.3 + cos((t-dt)*0.67+4.1)*0.12,
    sin((t-dt)*0.23+0.7)*0.5 + cos((t-dt)*0.53+1.3)*0.2
  );

  vec3 rawB = vec3(
    cos(t*0.19+2.1)*1.5 + sin(t*0.31+3.5)*0.35 + cos(t*0.61+5.2)*0.18,
    sin(t*0.15+1.4)*1.0 + cos(t*0.43+0.3)*0.25 + sin(t*0.71+3.3)*0.1,
    cos(t*0.29+1.2)*0.55 + sin(t*0.59+2.8)*0.15
  );
  vec3 prevB = vec3(
    cos((t-dt)*0.19+2.1)*1.5 + sin((t-dt)*0.31+3.5)*0.35 + cos((t-dt)*0.61+5.2)*0.18,
    sin((t-dt)*0.15+1.4)*1.0 + cos((t-dt)*0.43+0.3)*0.25 + sin((t-dt)*0.71+3.3)*0.1,
    cos((t-dt)*0.29+1.2)*0.55 + sin((t-dt)*0.59+2.8)*0.15
  );

  vec3 rawC = vec3(
    sin(t*0.21+4.3)*1.4 + cos(t*0.13+0.8)*0.45 + sin(t*0.79+1.6)*0.2,
    cos(t*0.23+3.0)*0.8 + sin(t*0.47+1.7)*0.3 + cos(t*0.83+5.5)*0.15,
    cos(t*0.17+2.5)*0.6 + sin(t*0.57+3.9)*0.25
  );
  vec3 prevC = vec3(
    sin((t-dt)*0.21+4.3)*1.4 + cos((t-dt)*0.13+0.8)*0.45 + sin((t-dt)*0.79+1.6)*0.2,
    cos((t-dt)*0.23+3.0)*0.8 + sin((t-dt)*0.47+1.7)*0.3 + cos((t-dt)*0.83+5.5)*0.15,
    cos((t-dt)*0.17+2.5)*0.6 + sin((t-dt)*0.57+3.9)*0.25
  );

  /* ── Repulsion — edges graze, centers never overlap ── */
  float rA = 0.85, rB = 0.58, rC = 0.40;
  applyPairRepulsion(rawA, rawB, rA, rB);
  applyPairRepulsion(rawA, rawC, rA, rC);
  applyPairRepulsion(rawB, rawC, rB, rC);

  // 第二次斥力校准（防止三个球互相推挤时产生二次叠加，让斥力更坚固稳定）
  applyPairRepulsion(rawA, rawB, rA, rB);
  applyPairRepulsion(rawA, rawC, rA, rC);
  applyPairRepulsion(rawB, rawC, rB, rC);

  /* ── Spike scatter — push drops outward when spike is near ── */
  #ifdef SPIKE_ENABLED
  float spikeCycle = SPIKE_CYCLE;
  float flyTime = SPIKE_FLY;
  float phase = mod(t, spikeCycle);
  gSpikeActive = step(phase, flyTime);
  gSpikeFlyProgress = 0.0;

  if (gSpikeActive > 0.5) {
    float progress = phase / flyTime;
    gSpikeFlyProgress = progress;
    float eased = progress * progress * (3.0 - 2.0 * progress);
    float seed = floor(t / spikeCycle);
    float yOff = sin(seed * 2.37 + 1.5) * SPIKE_Y_AMP;
    float zOff = cos(seed * 3.14 + 0.7) * SPIKE_Z_AMP;

    gSpikePos = vec3(
      mix(-4.5, 4.5, eased),
      yOff + sin(progress * PI) * 0.3,
      zOff + cos(progress * PI * 0.7) * 0.2
    );
    float spin = t * SPIKE_SPIN;
    gSpikeRot = rotY(spin) * rotZ(spin * 0.618) * rotY(spin * 0.4137);

    // Push each drop away from the spike
    vec3 pushA = rawA - gSpikePos;
    float dA = max(length(pushA), 0.01);
    rawA += (pushA/dA) * SCATTER_STR * exp(-dA * SCATTER_FALL);

    vec3 pushB = rawB - gSpikePos;
    float dB = max(length(pushB), 0.01);
    rawB += (pushB/dB) * SCATTER_STR * exp(-dB * SCATTER_FALL);

    vec3 pushC = rawC - gSpikePos;
    float dC = max(length(pushC), 0.01);
    rawC += (pushC/dC) * SCATTER_STR * exp(-dC * SCATTER_FALL);
  }
  #endif

  gDropA = rawA;
  gDropB = rawB;
  gDropC = rawC;

  /* ── Velocity vectors for ellipsoidal deformation ── */
  /* 用斥力修正前的纯轨道位置差来算速度，这样斥力只影响位置不影响形态 */
  /* prevA/B/C 是纯轨道上的上一帧位置，rawA/B/C 经过了斥力修正，
     所以这里用纯轨道当前位置与上一帧的差值来还原真实的轨道速度 */
  vec3 orbitA = vec3(
    sin(t*0.17)*1.3 + sin(t*0.41+1.0)*0.4 + sin(t*0.73+2.7)*0.15,
    cos(t*0.13)*0.9 + sin(t*0.37+2.0)*0.3 + cos(t*0.67+4.1)*0.12,
    sin(t*0.23+0.7)*0.5 + cos(t*0.53+1.3)*0.2
  );
  vec3 orbitB = vec3(
    cos(t*0.19+2.1)*1.5 + sin(t*0.31+3.5)*0.35 + cos(t*0.61+5.2)*0.18,
    sin(t*0.15+1.4)*1.0 + cos(t*0.43+0.3)*0.25 + sin(t*0.71+3.3)*0.1,
    cos(t*0.29+1.2)*0.55 + sin(t*0.59+2.8)*0.15
  );
  vec3 orbitC = vec3(
    sin(t*0.21+4.3)*1.4 + cos(t*0.13+0.8)*0.45 + sin(t*0.79+1.6)*0.2,
    cos(t*0.23+3.0)*0.8 + sin(t*0.47+1.7)*0.3 + cos(t*0.83+5.5)*0.15,
    cos(t*0.17+2.5)*0.6 + sin(t*0.57+3.9)*0.25
  );
  gVelA = (orbitA - prevA) / dt;
  gVelB = (orbitB - prevB) / dt;
  gVelC = (orbitC - prevC) / dt;

  /* ── Raymarch ── */
  vec3 ro = vec3(uMouse.x * MOUSE_CAM_X, uMouse.y * MOUSE_CAM_Y, CAM_Z);
  vec3 rd = normalize(vec3(uv, CAM_FOV));

  vec3 color;

  #ifdef SPIKE_MATERIAL_GLASS
  /* ── Glass cube: true see-through refraction ── */
  // Step 1: Find if we hit the glass cube first
  float dSpike = (gSpikeActive > 0.5) ? rayMarchSpike(ro, rd) : MAX_DIST + 1.0;
  float dScene = rayMarch(ro, rd);

  if (dSpike < dScene && dSpike < MAX_DIST) {
    // We hit the glass cube first
    vec3 hitFront = ro + rd * dSpike;
    vec3 nFront = calcSpikeNormal(hitFront);
    vec3 v = -rd;
    float cosTheta = max(dot(nFront, v), 0.0);

    // Fresnel: how much light reflects vs refracts
    float F0val = pow((1.0 - GLASS_IOR) / (1.0 + GLASS_IOR), 2.0);
    float fresnel = F0val + (1.0 - F0val) * pow(1.0 - cosTheta, 5.0);

    // Reflection component
    vec3 reflDir = reflect(rd, nFront);
    vec3 reflColor = envMap(reflDir) * GLASS_REFLECT_MIX;

    // Refraction: bend ray entering the glass
    vec3 refractDir = refract(rd, nFront, 1.0 / GLASS_IOR);
    // Total internal reflection fallback
    if (length(refractDir) < 0.001) refractDir = reflDir;

    // Step 2: March INSIDE the cube to find the back face
    vec3 interiorStart = hitFront + refractDir * SURF_DIST * 3.0; // nudge inside
    float dBack = rayMarchInsideSpike(interiorStart, refractDir);
    vec3 hitBack = interiorStart + refractDir * dBack;

    // Normal at back face (flip for interior)
    vec3 nBack = -calcSpikeNormal(hitBack);

    // Step 3: Refract again exiting the glass
    vec3 exitDir = refract(refractDir, nBack, GLASS_IOR); // glass -> air
    if (length(exitDir) < 0.001) exitDir = reflect(refractDir, nBack); // TIR

    // Step 4: Continue marching through the scene with the exit ray
    vec3 exitStart = hitBack + exitDir * SURF_DIST * 3.0; // nudge outside
    float dAfter = rayMarch(exitStart, exitDir);
    vec3 transmitted;
    if (dAfter < MAX_DIST) {
      vec3 pAfter = exitStart + exitDir * dAfter;
      transmitted = shade(pAfter, exitDir, calcNormal(pAfter));
    } else {
      transmitted = envMap(exitDir) * BG_ENV_BASE_MIX + backgroundGlow(exitDir);
    }

    // Beer's law absorption based on path length through glass
    float pathLen = dBack;
    vec3 absorption = exp(-GLASS_ABSORPTION * pathLen);
    transmitted *= absorption;

    // Specular highlight on front face
    vec3 keyL = animateDir(vec3(0.8, 0.9, 0.5), 0.0);
    float spec = specularLobe(nFront, v, keyL, 0.000006) * GLASS_SPEC_BOOST;
    vec3 specColor = vec3(1.0, 1.0, 0.98) * spec;

    // Edge glow (Fresnel rim)
    vec3 edgeGlow = GLASS_EDGE_GLOW * pow(1.0 - cosTheta, 3.0) * GLASS_EDGE_GLOW_BOOST;

    // Final composite: Fresnel blend of reflection and transmission
    color = mix(transmitted, reflColor, fresnel) + specColor + edgeGlow;
  } else if (dScene < MAX_DIST) {
    vec3 p = ro + rd * dScene;
    color = shade(p, rd, calcNormal(p));
  } else {
    color = envMap(rd) * BG_ENV_BASE_MIX + backgroundGlow(rd);
  }

  #else
  /* ── Standard path (non-glass materials) ── */
  float d = rayMarch(ro, rd);
  if (d < MAX_DIST) {
    vec3 p = ro + rd * d;
    color = shade(p, rd, calcNormal(p));
  } else {
    color = envMap(rd) * BG_ENV_BASE_MIX + backgroundGlow(rd);
  }
  #endif

  // ACES filmic
  color = clamp((color*(2.51*color+0.03))/(color*(2.43*color+0.59)+0.14), 0.0, 1.0);
  color = pow(color, vec3(1.0/2.2));

  vec2 vig = vUv - 0.5;
  color *= 1.0 - dot(vig, vig) * 0.35;

  gl_FragColor = vec4(color, 1.0);
}
`;

/* ── Build fragment shader with tier-specific defines ── */
function buildFragmentShader(tier) {
  const spikeMaterialDefine = WAVE_LOOK.spikeMaterialMode === 'glass-real'
    ? '#define SPIKE_MATERIAL_GLASS'
    : WAVE_LOOK.spikeMaterialMode === 'crystal-lite'
    ? '#define SPIKE_MATERIAL_CRYSTAL'
    : WAVE_LOOK.spikeMaterialMode === 'pearl-ceramic'
      ? '#define SPIKE_MATERIAL_PEARL'
    : WAVE_LOOK.spikeMaterialMode === 'thin-film-iridescent'
      ? '#define SPIKE_MATERIAL_IRIDESCENT'
      : '#define SPIKE_MATERIAL_METAL';
  const lookDefines = [
    `#define BG_ENV_BASE_MIX ${glslFloat(WAVE_LOOK.background.envBaseMix)}`,
    `#define BG_FOCUS_SPEED ${glslFloat(WAVE_LOOK.background.focusSpeed)}`,
    `#define BG_FOCUS_PHASE_OFFSET ${glslFloat(WAVE_LOOK.background.focusPhaseOffset)}`,
    `#define BG_FOCUS_X_MIN ${glslFloat(WAVE_LOOK.background.focusXRange[0])}`,
    `#define BG_FOCUS_X_MAX ${glslFloat(WAVE_LOOK.background.focusXRange[1])}`,
    `#define BG_FOCUS_Y_MIN ${glslFloat(WAVE_LOOK.background.focusYRange[0])}`,
    `#define BG_FOCUS_Y_MAX ${glslFloat(WAVE_LOOK.background.focusYRange[1])}`,
    `#define BG_FOCUS_GAIN_MIN ${glslFloat(WAVE_LOOK.background.focusGainRange[0])}`,
    `#define BG_FOCUS_GAIN_MAX ${glslFloat(WAVE_LOOK.background.focusGainRange[1])}`,
    `#define BG_FOCUS_SCALE_X ${glslFloat(WAVE_LOOK.background.focusScale[0])}`,
    `#define BG_FOCUS_SCALE_Y ${glslFloat(WAVE_LOOK.background.focusScale[1])}`,
    `#define BG_FOCUS_COLOR ${glslVec3(WAVE_LOOK.background.focusColor)}`,
    `#define BG_SWEEP_SPEED ${glslFloat(WAVE_LOOK.background.sweepSpeed)}`,
    `#define BG_SWEEP_PHASE_OFFSET ${glslFloat(WAVE_LOOK.background.sweepPhaseOffset)}`,
    `#define BG_SWEEP_X_MIN ${glslFloat(WAVE_LOOK.background.sweepXRange[0])}`,
    `#define BG_SWEEP_X_MAX ${glslFloat(WAVE_LOOK.background.sweepXRange[1])}`,
    `#define BG_SWEEP_Y ${glslFloat(WAVE_LOOK.background.sweepY)}`,
    `#define BG_SWEEP_GAIN_MIN ${glslFloat(WAVE_LOOK.background.sweepGainRange[0])}`,
    `#define BG_SWEEP_GAIN_MAX ${glslFloat(WAVE_LOOK.background.sweepGainRange[1])}`,
    `#define BG_SWEEP_SCALE_X ${glslFloat(WAVE_LOOK.background.sweepScale[0])}`,
    `#define BG_SWEEP_SCALE_Y ${glslFloat(WAVE_LOOK.background.sweepScale[1])}`,
    `#define BG_SWEEP_COLOR ${glslVec3(WAVE_LOOK.background.sweepColor)}`,
    `#define ENV_DRIFT_SPEED ${glslFloat(WAVE_LOOK.studio.driftSpeed)}`,
    `#define ENV_DRIFT_X_AMP ${glslFloat(WAVE_LOOK.studio.driftAmplitude[0])}`,
    `#define ENV_DRIFT_Y_AMP ${glslFloat(WAVE_LOOK.studio.driftAmplitude[1])}`,
    `#define ENV_DRIFT_Z_AMP ${glslFloat(WAVE_LOOK.studio.driftAmplitude[2])}`,
    `#define ENV_KEY_SOFT_GAIN ${glslFloat(WAVE_LOOK.studio.keyStrength[0])}`,
    `#define ENV_KEY_HARD_GAIN ${glslFloat(WAVE_LOOK.studio.keyStrength[1])}`,
    `#define ENV_FILL_SOFT_GAIN ${glslFloat(WAVE_LOOK.studio.fillStrength[0])}`,
    `#define ENV_FILL_HARD_GAIN ${glslFloat(WAVE_LOOK.studio.fillStrength[1])}`,
    `#define ENV_RIM_SOFT_GAIN ${glslFloat(WAVE_LOOK.studio.rimStrength[0])}`,
    `#define ENV_RIM_HARD_GAIN ${glslFloat(WAVE_LOOK.studio.rimStrength[1])}`,
    `#define ENV_TOP_LIGHT_GAIN ${glslFloat(WAVE_LOOK.studio.topLightStrength)}`,
    `#define ENV_BOTTOM_LIGHT_GAIN ${glslFloat(WAVE_LOOK.studio.bottomLightStrength)}`,
    `#define ENV_BAND_A_SPEED ${glslFloat(WAVE_LOOK.studio.bandA.speed)}`,
    `#define ENV_BAND_A_AMPLITUDE ${glslFloat(WAVE_LOOK.studio.bandA.amplitude)}`,
    `#define ENV_BAND_A_INTENSITY ${glslFloat(WAVE_LOOK.studio.bandA.intensity)}`,
    `#define ENV_BAND_B_SPEED ${glslFloat(WAVE_LOOK.studio.bandB.speed)}`,
    `#define ENV_BAND_B_PHASE_OFFSET ${glslFloat(WAVE_LOOK.studio.bandB.phaseOffset)}`,
    `#define ENV_BAND_B_AMPLITUDE ${glslFloat(WAVE_LOOK.studio.bandB.amplitude)}`,
    `#define ENV_BAND_B_INTENSITY ${glslFloat(WAVE_LOOK.studio.bandB.intensity)}`,
    `#define ENV_SWEEP_A_SPEED ${glslFloat(WAVE_LOOK.studio.sweepA.speed)}`,
    `#define ENV_SWEEP_A_AMPLITUDE ${glslFloat(WAVE_LOOK.studio.sweepA.amplitude)}`,
    `#define ENV_SWEEP_A_CENTER_X ${glslFloat(WAVE_LOOK.studio.sweepA.centerX)}`,
    `#define ENV_SWEEP_A_CENTER_Y ${glslFloat(WAVE_LOOK.studio.sweepA.centerY)}`,
    `#define ENV_SWEEP_A_INTENSITY ${glslFloat(WAVE_LOOK.studio.sweepA.intensity)}`,
    `#define ENV_SWEEP_B_SPEED ${glslFloat(WAVE_LOOK.studio.sweepB.speed)}`,
    `#define ENV_SWEEP_B_PHASE_OFFSET ${glslFloat(WAVE_LOOK.studio.sweepB.phaseOffset)}`,
    `#define ENV_SWEEP_B_AMPLITUDE ${glslFloat(WAVE_LOOK.studio.sweepB.amplitude)}`,
    `#define ENV_SWEEP_B_CENTER_X ${glslFloat(WAVE_LOOK.studio.sweepB.centerX)}`,
    `#define ENV_SWEEP_B_CENTER_Y ${glslFloat(WAVE_LOOK.studio.sweepB.centerY)}`,
    `#define ENV_SWEEP_B_INTENSITY ${glslFloat(WAVE_LOOK.studio.sweepB.intensity)}`,
    `#define SPIKE_METAL_REFLECT_BOOST ${glslFloat(WAVE_LOOK.spike.metalReflectBoost)}`,
    `#define SPIKE_METAL_SPEC_BOOST ${glslFloat(WAVE_LOOK.spike.metalSpecBoost)}`,
    `#define SPIKE_METAL_LIFT_MIN ${glslFloat(WAVE_LOOK.spike.metalEdgeLift[0])}`,
    `#define SPIKE_METAL_LIFT_MAX ${glslFloat(WAVE_LOOK.spike.metalEdgeLift[1])}`,
    `#define SPIKE_CRYSTAL_IOR ${glslFloat(WAVE_LOOK.spike.crystalIor)}`,
    `#define SPIKE_CRYSTAL_REFLECT_BOOST ${glslFloat(WAVE_LOOK.spike.crystalReflectBoost)}`,
    `#define SPIKE_CRYSTAL_TRANSMISSION_BOOST ${glslFloat(WAVE_LOOK.spike.crystalTransmissionBoost)}`,
    `#define SPIKE_CRYSTAL_THICKNESS_MIN ${glslFloat(WAVE_LOOK.spike.crystalThickness[0])}`,
    `#define SPIKE_CRYSTAL_THICKNESS_MAX ${glslFloat(WAVE_LOOK.spike.crystalThickness[1])}`,
    `#define SPIKE_CRYSTAL_ABSORPTION ${glslVec3(WAVE_LOOK.spike.crystalAbsorption)}`,
    `#define SPIKE_CRYSTAL_EDGE_TINT ${glslVec3(WAVE_LOOK.spike.crystalEdgeTint)}`,
    `#define SPIKE_CRYSTAL_EDGE_TINT_BOOST ${glslFloat(WAVE_LOOK.spike.crystalEdgeTintBoost)}`,
    `#define SPIKE_CRYSTAL_SPEC_BOOST ${glslFloat(WAVE_LOOK.spike.crystalSpecBoost)}`,
    `#define SPIKE_CRYSTAL_LIFT_MIN ${glslFloat(WAVE_LOOK.spike.crystalLift[0])}`,
    `#define SPIKE_CRYSTAL_LIFT_MAX ${glslFloat(WAVE_LOOK.spike.crystalLift[1])}`,
    `#define SPIKE_IRIDESCENT_BASE_TINT ${glslVec3(WAVE_LOOK.spike.iridescentBaseTint)}`,
    `#define SPIKE_IRIDESCENT_FILM_A ${glslVec3(WAVE_LOOK.spike.iridescentFilmColorA)}`,
    `#define SPIKE_IRIDESCENT_FILM_B ${glslVec3(WAVE_LOOK.spike.iridescentFilmColorB)}`,
    `#define SPIKE_IRIDESCENT_CORE_LIFT ${glslFloat(WAVE_LOOK.spike.iridescentCoreLift)}`,
    `#define SPIKE_IRIDESCENT_EDGE_LIFT ${glslFloat(WAVE_LOOK.spike.iridescentEdgeLift)}`,
    `#define SPIKE_IRIDESCENT_FILM_STRENGTH ${glslFloat(WAVE_LOOK.spike.iridescentFilmStrength)}`,
    `#define SPIKE_IRIDESCENT_BAND_SCALE ${glslFloat(WAVE_LOOK.spike.iridescentBandScale)}`,
    `#define SPIKE_IRIDESCENT_SWEEP_SCALE ${glslFloat(WAVE_LOOK.spike.iridescentSweepScale)}`,
    `#define SPIKE_IRIDESCENT_SPEC_BOOST ${glslFloat(WAVE_LOOK.spike.iridescentSpecBoost)}`,
    `#define SPIKE_PEARL_BASE_COLOR ${glslVec3(WAVE_LOOK.spike.pearlBaseColor)}`,
    `#define SPIKE_PEARL_SHADOW_TINT ${glslVec3(WAVE_LOOK.spike.pearlShadowTint)}`,
    `#define SPIKE_PEARL_SHEEN_COLOR ${glslVec3(WAVE_LOOK.spike.pearlSheenColor)}`,
    `#define SPIKE_PEARL_REFLECT_MIX ${glslFloat(WAVE_LOOK.spike.pearlReflectMix)}`,
    `#define SPIKE_PEARL_CORE_LIFT ${glslFloat(WAVE_LOOK.spike.pearlCoreLift)}`,
    `#define SPIKE_PEARL_EDGE_LIFT ${glslFloat(WAVE_LOOK.spike.pearlEdgeLift)}`,
    `#define SPIKE_PEARL_SPEC_BOOST ${glslFloat(WAVE_LOOK.spike.pearlSpecBoost)}`,
    `#define SPIKE_PEARL_SHEEN_BOOST ${glslFloat(WAVE_LOOK.spike.pearlSheenBoost)}`,
    // Glass-real defines
    `#define GLASS_IOR ${glslFloat(WAVE_LOOK.spike.glassIor)}`,
    `#define GLASS_ABSORPTION ${glslVec3(WAVE_LOOK.spike.glassAbsorption)}`,
    `#define GLASS_SPEC_BOOST ${glslFloat(WAVE_LOOK.spike.glassSpecBoost)}`,
    `#define GLASS_REFLECT_MIX ${glslFloat(WAVE_LOOK.spike.glassReflectMix)}`,
    `#define GLASS_EDGE_GLOW ${glslVec3(WAVE_LOOK.spike.glassEdgeGlow)}`,
    `#define GLASS_EDGE_GLOW_BOOST ${glslFloat(WAVE_LOOK.spike.glassEdgeGlowBoost)}`,
  ];
  const defines = {
    high: [
      '#define MAX_STEPS 40',
      '#define SURF_DIST 0.002',
      '#define NORMAL_EPS 0.004',
      '#define GLASS_INTERIOR_STEPS 12',
      '#define QUALITY_HIGH',
      '#define SPIKE_ENABLED',
      spikeMaterialDefine,
      ...lookDefines,
    ],
    medium: [
      '#define MAX_STEPS 36',
      '#define SURF_DIST 0.003',
      '#define NORMAL_EPS 0.003',
      '#define GLASS_INTERIOR_STEPS 10',
      '#define QUALITY_MEDIUM',
      '#define SPIKE_ENABLED',
      spikeMaterialDefine,
      ...lookDefines,
    ],
    low: [
      '#define MAX_STEPS 24',
      '#define SURF_DIST 0.006',
      '#define NORMAL_EPS 0.004',
      '#define GLASS_INTERIOR_STEPS 8',
      '#define QUALITY_LOW',
      '#define SPIKE_ENABLED', // glass mode also enables spike on low tier
      spikeMaterialDefine,
      ...lookDefines,
    ],
  };
  return (defines[tier] || defines.medium).join('\n') + '\n' + fragmentShaderBody;
}

/* ── GPU tier detection ── */
function detectGPUTier() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) return 'low';
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  if (ext) {
    const r = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL).toLowerCase();
    if (r.includes('intel') || r.includes('swiftshader') || r.includes('llvmpipe')) return 'low';
    if (r.includes('apple') || r.includes('nvidia') || r.includes('radeon')) return 'high';
  }
  return 'medium';
}

function getTierScale(tier) {
  return TIER_SCALE[tier] || TIER_SCALE.medium;
}

/**
 * WaveCanvas — Liquid Metal Drops with Spike Flythrough
 * Tier-adaptive quality, chaotic orbits, center repulsion.
 */
export default function WaveCanvas() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const w = () => container.clientWidth;
    const h = () => container.clientHeight;

    const tier = detectGPUTier();
    const baseDPR = window.devicePixelRatio || 1;
    const targetTier = tier;
    const targetScale = getTierScale(targetTier);
    let activeTier = BOOT_TIER;
    let scale = Math.min(BOOT_SCALE, targetScale);
    let upgraded = targetTier === BOOT_TIER && scale === targetScale;

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    renderer.setPixelRatio(baseDPR * scale);
    renderer.setSize(w(), h());
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(w() * baseDPR * scale, h() * baseDPR * scale) },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uScrollVel: { value: 0 },
      uMouseVel: { value: 0 },
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

    /* ── Interaction ── */
    const mouse = { x: 0, y: 0, tx: 0, ty: 0, px: 0, py: 0 };
    let scrollVel = 0, mouseVel = 0, lastScrollY = window.scrollY;

    const onMove = (e) => {
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    const onScroll = () => {
      scrollVel = Math.min(Math.abs(window.scrollY - lastScrollY) * 0.01, 1.0);
      lastScrollY = window.scrollY;
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });

    /* ── Adaptive quality ── */
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

    /* ── Loop ── */
    const startTime = performance.now();
    let animId;
    function tick() {
      animId = requestAnimationFrame(tick);
      uniforms.uTime.value = (performance.now() - startTime) * 0.001;

      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;
      const dx = mouse.x - mouse.px, dy = mouse.y - mouse.py;
      mouseVel += (Math.sqrt(dx * dx + dy * dy) * 8 - mouseVel) * 0.1;
      mouseVel *= 0.97;
      mouse.px = mouse.x; mouse.py = mouse.y;
      scrollVel *= 0.95;

      uniforms.uMouse.value.set(mouse.x, mouse.y);
      uniforms.uScrollVel.value = scrollVel;
      uniforms.uMouseVel.value = Math.min(mouseVel, 1.0);

      renderer.render(scene, camera);
      adaptQuality();
    }
    tick();

    const onResize = () => applyScale();
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      cancelUpgrade();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('scroll', onScroll);
      geo.dispose();
      material.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }} />
  );
}
