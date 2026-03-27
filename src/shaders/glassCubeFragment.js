// ═══════════════════════════════════════════════════════════════
// About 页玻璃方块 — 片段着色器
// 从 Hero 的 waveFragment 提取，仅保留玻璃立方体 + 环境照明
// 支持视频纹理环境映射：预录视频作为透镜折射 + 反射源
// ═══════════════════════════════════════════════════════════════
export const glassCubeFragmentBody = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform vec2  uResolution;
uniform vec3  uCubePos;
uniform mat3  uCubeRot;

// --- 视频纹理 ---
// uCameraTex: 预录视频纹理（通过 VideoTexture 加载）
// uCameraActive: 0.0 = 无视频（降级到程序化背景），1.0 = 视频激活
// uCameraAspect: 视频画面宽高比（用于正确裁切）
uniform sampler2D uCameraTex;
uniform float uCameraActive;
uniform float uCameraAspect;

#define MAX_DIST 16.0
#define PI 3.14159265

// --- 立方体参数 ---
// 立方体半边长。默认 0.55。调大方块更大；调小更小。
#define CUBE_SIZE   0.55
// 立方体圆角半径。默认 0.02。调大更圆润；调小更锐利。
#define CUBE_ROUND  0.02

// --- 相机 ---
// 相机 Z 位置。默认 6。调大物体更小；调小更大。
#define CAM_Z   6.0
// 镜头焦距（负值）。默认 -2.8。绝对值越大视角越窄。
#define CAM_FOV -2.8

/* ── Cube SDF ── */
float sdRoundBox(vec3 p, vec3 b, float r) {
  vec3 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
}

float mapCube(vec3 p) {
  vec3 sp = uCubeRot * (p - uCubePos);
  return sdRoundBox(sp, vec3(CUBE_SIZE), CUBE_ROUND);
}

/* ── Normal ── */
vec3 calcNormal(vec3 p) {
  vec2 e = vec2(NORMAL_EPS, -NORMAL_EPS);
  return normalize(
    e.xyy * mapCube(p + e.xyy) +
    e.yyx * mapCube(p + e.yyx) +
    e.yxy * mapCube(p + e.yxy) +
    e.xxx * mapCube(p + e.xxx)
  );
}

/* ── Raymarching ── */
float rayMarchCube(vec3 ro, vec3 rd) {
  float d = 0.0;
  for (int i = 0; i < MAX_STEPS; i++) {
    float ds = mapCube(ro + rd * d);
    d += ds;
    if (ds < SURF_DIST || d > MAX_DIST) break;
  }
  return d;
}

/* ── March inside (for glass refraction) ── */
float rayMarchInside(vec3 ro, vec3 rd) {
  float d = 0.0;
  for (int i = 0; i < GLASS_INTERIOR_STEPS; i++) {
    float ds = -mapCube(ro + rd * d);
    d += max(ds, SURF_DIST * 0.5);
    if (ds < SURF_DIST || d > 4.0) break;
  }
  return d;
}

/* ── Environment Lighting ── */
vec3 animateDir(vec3 dir, float seed) {
  float t = uTime * ENV_DRIFT_SPEED + seed;
  vec3 drift = vec3(
    sin(t * 0.91) * ENV_DRIFT_X_AMP,
    cos(t * 0.63) * ENV_DRIFT_Y_AMP,
    sin(t * 0.58 + seed * 1.4) * ENV_DRIFT_Z_AMP
  );
  return normalize(dir + drift);
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

  col += vec3(0.95, 0.95, 0.97) * exp(-pow((rd.y-0.15-bandShiftA)*5.0, 2.0)) * ENV_BAND_A_INTENSITY;
  #ifndef QUALITY_LOW
  col += vec3(0.55, 0.65, 0.85) * exp(-pow((rd.y+0.3-bandShiftB)*4.0, 2.0)) * ENV_BAND_B_INTENSITY;
  #endif
  #ifdef QUALITY_HIGH
  col += vec3(0.9, 0.91, 0.93) * exp(-pow((rd.y-0.6+bandShiftA*0.6)*6.0, 2.0)) * 0.09;
  col += vec3(0.88, 0.9, 0.95) * exp(-pow((rd.x-0.1+bandShiftB*0.5)*8.0, 2.0)) * 0.06;
  #endif

  float driftX = sin(t * ENV_SWEEP_A_SPEED) * ENV_SWEEP_A_AMPLITUDE;
  float driftX2 = cos(t * ENV_SWEEP_B_SPEED + ENV_SWEEP_B_PHASE_OFFSET) * ENV_SWEEP_B_AMPLITUDE;

  col += vec3(0.72, 0.82, 1.0) * exp(-pow((rd.x - ENV_SWEEP_A_CENTER_X - driftX) * 6.0, 2.0) - pow((rd.y - ENV_SWEEP_A_CENTER_Y) * 3.2, 2.0)) * ENV_SWEEP_A_INTENSITY;
  #ifndef QUALITY_LOW
  col += vec3(0.46, 0.6, 0.88) * exp(-pow((rd.x - ENV_SWEEP_B_CENTER_X + driftX2) * 5.2, 2.0) - pow((rd.y - ENV_SWEEP_B_CENTER_Y) * 2.8, 2.0)) * ENV_SWEEP_B_INTENSITY;
  #endif

  return col;
}

/* ── Background glow ── */
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

/* ── Specular lobe ── */
float specularLobe(vec3 n, vec3 v, vec3 l, float alphaSq) {
  vec3 h = normalize(l + v);
  float NdH = max(dot(n, h), 0.0);
  float NdL = max(dot(n, l), 0.0);
  float denom = PI * pow(NdH*NdH*(alphaSq-1.0)+1.0, 2.0);
  return (alphaSq / max(denom, 0.0001)) * NdL;
}

/* ════════════════════════════════════════════════════
   视频纹理采样工具
   ════════════════════════════════════════════════════ */

/**
 * 将屏幕空间 UV 适配到视频画面的 cover 裁切 UV。
 * 类似 CSS "object-fit: cover" — 保持视频宽高比，居中裁切。
 * screenUV: 归一化屏幕坐标 [0,1]²
 */
vec2 screenToCameraUV(vec2 screenUV) {
  float viewAspect = uResolution.x / uResolution.y;
  vec2 camUV = screenUV;

  // 水平镜像（保持与原摄像头映射一致的朝向）
  camUV.x = 1.0 - camUV.x;

  // Cover-fit: 让视频画面填满渲染区域，多余部分裁掉
  if (uCameraAspect > viewAspect) {
    // 视频比渲染区更宽 → 左右裁切
    float ratio = viewAspect / uCameraAspect;
    camUV.x = camUV.x * ratio + (1.0 - ratio) * 0.5;
  } else {
    // 视频比渲染区更高 → 上下裁切
    float ratio = uCameraAspect / viewAspect;
    camUV.y = camUV.y * ratio + (1.0 - ratio) * 0.5;
  }

  return camUV;
}

/**
 * 从视频纹理采样。对屏幕 UV 施加偏移量以模拟折射。
 * offset: 折射产生的 UV 偏移（归一化坐标系）
 */
vec3 sampleCamera(vec2 screenUV, vec2 offset) {
  vec2 uv = screenToCameraUV(screenUV + offset);
  uv = clamp(uv, 0.0, 1.0);
  return texture2D(uCameraTex, uv).rgb;
}

/**
 * 从视频采样用于反射的颜色。
 * 将 3D 反射方向映射为 UV 偏移。
 */
vec3 sampleCameraReflection(vec2 screenUV, vec3 reflDir) {
  // 将反射方向投影为屏幕偏移
  vec2 offset = reflDir.xy * 0.3;
  return sampleCamera(screenUV, offset);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5*uResolution) / min(uResolution.x, uResolution.y);
  // 屏幕归一化坐标 [0,1]²，用于摄像头采样
  vec2 screenUV = gl_FragCoord.xy / uResolution;
  bool camOn = uCameraActive > 0.5;

  vec3 ro = vec3(0.0, 0.0, CAM_Z);
  vec3 rd = normalize(vec3(uv, CAM_FOV));

  vec3 color;

  // 找到与玻璃方块的交点
  float dCube = rayMarchCube(ro, rd);

  if (dCube < MAX_DIST) {
    // ─── 打到了玻璃方块 ───
    vec3 hitFront = ro + rd * dCube;
    vec3 nFront = calcNormal(hitFront);
    vec3 v = -rd;
    float cosTheta = max(dot(nFront, v), 0.0);

    // Fresnel 反射/透射分配
    float F0val = pow((1.0 - GLASS_IOR) / (1.0 + GLASS_IOR), 2.0);
    float fresnel = F0val + (1.0 - F0val) * pow(1.0 - cosTheta, 5.0);

    // ── 反射分量 ──
    vec3 reflDir = reflect(rd, nFront);
    vec3 reflProcedural = envMap(reflDir) * GLASS_REFLECT_MIX;
    vec3 reflColor;
    if (camOn) {
      // 混合: 程序化高光 + 视频倒影
      vec3 reflCamera = sampleCameraReflection(screenUV, reflDir);
      reflColor = mix(reflProcedural, reflCamera * GLASS_REFLECT_MIX, CAMERA_REFLECT_MIX);
    } else {
      reflColor = reflProcedural;
    }

    // ── 折射：进入玻璃 ──
    vec3 refractDir = refract(rd, nFront, 1.0 / GLASS_IOR);
    if (length(refractDir) < 0.001) refractDir = reflDir;

    // 内部行进：找到出射面
    vec3 interiorStart = hitFront + refractDir * SURF_DIST * 3.0;
    float dBack = rayMarchInside(interiorStart, refractDir);
    vec3 hitBack = interiorStart + refractDir * dBack;

    // 出射面法线（翻转）
    vec3 nBack = -calcNormal(hitBack);

    // 再次折射：离开玻璃
    vec3 exitDir = refract(refractDir, nBack, GLASS_IOR);
    if (length(exitDir) < 0.001) exitDir = reflect(refractDir, nBack);

    // ── 透射分量 ──
    vec3 transmitted;
    if (camOn) {
      // 核心透镜效果：
      // 入射方向 rd 与出射方向 exitDir 之差 = 折射偏移
      // 把这个偏移映射到屏幕 UV 空间，产生真实的棱镜畸变
      vec2 refractOffset = (exitDir.xy - rd.xy) * CAMERA_REFRACT_SCALE;
      transmitted = sampleCamera(screenUV, refractOffset) * CAMERA_TRANSMIT_DIM;
      // 叠加微弱的程序化光照，保持玻璃的"高级感"光泽
      transmitted += (envMap(exitDir) * BG_ENV_BASE_MIX) * 0.12;
    } else {
      transmitted = envMap(exitDir) * BG_ENV_BASE_MIX + backgroundGlow(exitDir);
    }

    // Beer's law 吸收
    float pathLen = dBack;
    vec3 absorption = exp(-GLASS_ABSORPTION * pathLen);
    transmitted *= absorption;

    // 前表面高光（保持锐利的程序化高光，不受摄像头影响）
    vec3 keyL = animateDir(vec3(0.8, 0.9, 0.5), 0.0);
    float spec = specularLobe(nFront, v, keyL, 0.000006) * GLASS_SPEC_BOOST;
    vec3 specColor = vec3(1.0, 1.0, 0.98) * spec;

    // 边缘光辉
    vec3 edgeGlow = GLASS_EDGE_GLOW * pow(1.0 - cosTheta, 3.0) * GLASS_EDGE_GLOW_BOOST;

    // 最终合成
    color = mix(transmitted, reflColor, fresnel) + specColor + edgeGlow;

  } else {
    // ─── 未命中方块 → 始终用程序化背景（视频纹理只在方块内部可见）───
    color = envMap(rd) * BG_ENV_BASE_MIX + backgroundGlow(rd);
  }

  // ACES 色调映射
  color = clamp((color*(2.51*color+0.03))/(color*(2.43*color+0.59)+0.14), 0.0, 1.0);
  color = pow(color, vec3(1.0/2.2));

  vec2 vig = vUv - 0.5;
  color *= 1.0 - dot(vig, vig) * 0.35;

  gl_FragColor = vec4(color, 1.0);
}
`;
