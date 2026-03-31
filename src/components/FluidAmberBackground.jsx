import { useEffect, useRef } from 'react';
import '../styles/components/fluid-amber-bg.css';
import useSectionFreeze from '../hooks/useSectionFreeze';

/* ================================================================
   FluidAmberBackground — Domain-warped simplex noise · WebGL
   来源：Fluid Amber (09) · 液态金属琥珀感 shader 背景
   接入：useSectionFreeze（离屏冻结 RAF）
   ================================================================ */

/* ── Shader 源码 ── */
const VERT_SRC = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG_SRC = `
precision mediump float;
uniform float u_time;
uniform vec2  u_res;
uniform float u_timeScale;   /* 时间缩放（默认 0.15，越大流动越快） */
uniform float u_ampDecay;    /* fbm 幅度衰减（默认 0.48，越小越平滑） */
uniform vec2  u_mouse;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289v2(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                     -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289v2(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x  = 2.0 * fract(p * C.www) - 1.0;
  vec3 h  = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x  = a0.x  * x0.x   + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p, float t) {
  float val = 0.0;
  float amp  = 0.5;
  float freq = 1.0;
  for (int i = 0; i < 5; i++) {
    val  += amp * snoise(p * freq + t * 0.3);
    freq *= 2.1;
    amp  *= u_ampDecay;
    p    += vec2(1.7, 9.2);
  }
  return val;
}

void main() {
  vec2 p = (gl_FragCoord.xy - u_res * 0.5) / min(u_res.x, u_res.y);
  float t = u_time * u_timeScale;

  /* 鼠标漩涡扰动 */
  if (u_mouse.x > 0.0) {
    vec2 mNorm = (u_mouse - u_res * 0.5) / min(u_res.x, u_res.y);
    vec2 diff  = p - mNorm;
    float dist = length(diff);
    float angle = exp(-dist * dist * 8.0) * 0.4 * 6.0;
    float ca = cos(angle), sa = sin(angle);
    p = mNorm + mat2(ca, -sa, sa, ca) * diff;
  }

  /* 二阶 domain warp */
  vec2 q = vec2(fbm(p + vec2(0.0, 0.0), t),
                fbm(p + vec2(5.2, 1.3), t));
  vec2 r = vec2(fbm(p + 4.0*q + vec2(1.7, 9.2), t * 1.2),
                fbm(p + 4.0*q + vec2(8.3, 2.8), t * 1.2));
  float f = fbm(p + 3.5*r, t * 0.8);

  /* 琥珀暖金调色 */
  vec3 col = mix(vec3(0.075, 0.065, 0.055), vec3(0.20, 0.14, 0.07),
                 clamp(f * f * 2.0, 0.0, 1.0));
  col = mix(col, vec3(0.78, 0.58, 0.24), clamp(length(q) * 0.5, 0.0, 1.0));
  col = mix(col, vec3(0.95, 0.75, 0.35), clamp(length(r.x) * 0.6, 0.0, 1.0));
  col += vec3(0.18, 0.12, 0.04) * smoothstep(0.5, 1.2, f*f*3.0 + length(r)*0.5);
  col  = pow(col, vec3(1.1));

  gl_FragColor = vec4(col, 1.0);
}
`;

/* ── WebGL 工具 ── */
function compileShader(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return s;
}

function buildProgram(gl) {
  const prog = gl.createProgram();
  gl.attachShader(prog, compileShader(gl, gl.VERTEX_SHADER, VERT_SRC));
  gl.attachShader(prog, compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC));
  gl.linkProgram(prog);
  return prog;
}

/* ── React 组件 ── */
export default function FluidAmberBackground() {
  const containerRef = useRef(null);
  const canvasRef    = useRef(null);
  const glRef        = useRef(null);
  const uniformsRef  = useRef(null);
  const animIdRef    = useRef(null);
  const freezeStart  = useRef(0);
  const startTime    = useRef(performance.now());
  const mouseRef     = useRef({ x: -1, y: -1 });

  const { shouldAnimate } = useSectionFreeze(containerRef, { activeThreshold: 0 });

  /* ── WebGL 初始化（仅一次）── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: false,
    });
    if (!gl) return;
    glRef.current = gl;

    const prog = buildProgram(gl);
    gl.useProgram(prog);

    /* 全屏三角形 */
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    uniformsRef.current = {
      uTime:      gl.getUniformLocation(prog, 'u_time'),
      uRes:       gl.getUniformLocation(prog, 'u_res'),
      uTimeScale: gl.getUniformLocation(prog, 'u_timeScale'),
      uAmpDecay:  gl.getUniformLocation(prog, 'u_ampDecay'),
      uMouse:     gl.getUniformLocation(prog, 'u_mouse'),
      prefersReduced,
    };

    /* 初始 uniform 默认值
     * u_timeScale: 0.15（默认标准值），越大流动越快
     * u_ampDecay:  0.48（默认标准值），越小 fbm 越平滑 */
    gl.uniform1f(uniformsRef.current.uTimeScale, 0.15);
    gl.uniform1f(uniformsRef.current.uAmpDecay,  0.48);

    /* 初始 resize */
    handleResize(canvas, gl, uniformsRef.current.uRes);

    return () => {
      cancelAnimationFrame(animIdRef.current);
      gl.deleteProgram(prog);
      gl.deleteBuffer(buf);
      glRef.current = null;
    };
  }, []);

  /* ── resize 处理 ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = glRef.current;
    if (!canvas || !gl) return;

    const onResize = () => handleResize(canvas, gl, uniformsRef.current?.uRes);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /* ── 鼠标/触控 ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const onMove = (e) => {
      mouseRef.current = {
        x: e.clientX * dpr,
        y: (canvas.clientHeight - e.clientY) * dpr,
      };
    };
    const onLeave = () => { mouseRef.current = { x: -1, y: -1 }; };

    const onTouchStart = (e) => {
      e.preventDefault();
      const t = e.touches[0];
      mouseRef.current = { x: t.clientX * dpr, y: (canvas.clientHeight - t.clientY) * dpr };
    };
    const onTouchMove = (e) => {
      e.preventDefault();
      const t = e.touches[0];
      mouseRef.current = { x: t.clientX * dpr, y: (canvas.clientHeight - t.clientY) * dpr };
    };
    const onTouchEnd = () => { mouseRef.current = { x: -1, y: -1 }; };

    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);

    return () => {
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseleave', onLeave);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  /* ── RAF 动画循环（受 shouldAnimate 控制）── */
  useEffect(() => {
    const gl = glRef.current;
    const u  = uniformsRef.current;
    if (!gl || !u) return;

    if (!shouldAnimate) {
      freezeStart.current = performance.now();
      cancelAnimationFrame(animIdRef.current);
      return;
    }

    /* 时间补偿，避免 uTime 跳变 */
    if (freezeStart.current > 0) {
      startTime.current += performance.now() - freezeStart.current;
      freezeStart.current = 0;
    }

    const tick = () => {
      animIdRef.current = requestAnimationFrame(tick);

      const now = u.prefersReduced ? 0 : (performance.now() - startTime.current) * 0.001;
      gl.uniform1f(u.uTime, now);
      gl.uniform2f(u.uMouse, mouseRef.current.x, mouseRef.current.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      /* GPU Debug Panel 上报 */
      const db = window.__GPU_DEBUG__;
      if (db) { db.reportFrame(); db.reportMetrics('fluid-amber', 1); }
    };

    tick();
    return () => cancelAnimationFrame(animIdRef.current);
  }, [shouldAnimate]);

  return (
    <div ref={containerRef} className="fluid-amber-bg">
      <canvas ref={canvasRef} className="fluid-amber-bg__canvas" />
    </div>
  );
}

/* ── resize 工具函数 ── */
function handleResize(canvas, gl, uRes) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w   = Math.round(canvas.clientWidth  * dpr);
  const h   = Math.round(canvas.clientHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width  = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
    if (uRes) gl.uniform2f(uRes, w, h);
  }
}
