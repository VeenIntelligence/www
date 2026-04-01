// ══════════════════════════════════════════════════════════════
// Consultants 卡片磨砂效果调参
// 改这里即可，不用翻 CSS。保存后 Vite HMR 自动刷新。
// ══════════════════════════════════════════════════════════════

// ── Section 整体遮罩 ──────────────────────────────────────────

// Section 背景遮罩色（让 WebGL 液态金背景透出来）。
// 默认：rgba(8,5,2,0.82)。调低 alpha → 背景更透；调高 → 更暗更遮。
export const SECTION_OVERLAY_BG = 'rgba(8, 5, 2, 0.36)';

// ── 普通卡片（Profile 卡 + Standard 卡）────────────────────────

// 卡片基底背景色。
// 默认：rgba(18,13,8,0.78)。调低 alpha → 更透明；调高 → 更不透明遮住背景。
export const PANEL_BG = 'rgba(72, 61, 39, 0.52)';

// 卡片 hover 时背景色。
// 默认：rgba(22,16,10,0.82)。比静止态稍亮稍不透明，产生悬浮感。
export const PANEL_BG_HOVER =  'rgba(138, 118, 76, 0.52)';

// 磨砂 blur 半径（backdrop-filter）。
// 默认：12px。调大 → 磨砂更强；调小 → 背景更清晰可见。
export const PANEL_BLUR = '8px';

// 磨砂饱和度倍数（backdrop-filter saturate）。
// 默认：1.1。调大 → 透出的背景色更鲜艳；调小 → 偏灰。
export const PANEL_SATURATE = 1.1;

// 卡片边框颜色。
// 默认：rgba(255,255,255,0.05)。调高最后分量 → 边框更明显。
export const PANEL_BORDER_BASE = 'rgba(255, 255, 255, 0.05)';

// 顶部内阴影高光（模拟磨砂玻璃上边缘亮线）。
// 默认：rgba(255,255,255,0.10)。调大最后分量 → 上边缘反光更亮。
export const PANEL_INSET_TOP = 'rgba(255, 255, 255, 0.10)';

// ── Premium 卡片（第三张，高亮金色）────────────────────────────

// Premium 卡片背景色（带金色调）。
// 默认：rgba(48,34,16,0.80)。调高 alpha → 更不透明；提高 RGB → 更金更亮。
export const PANEL_PREMIUM_BG = 'rgba(104, 89, 52, 0.8)';

// Premium 卡片 hover 背景色。
// 默认：rgba(58,42,18,0.85)。比静止态稍亮。
export const PANEL_PREMIUM_BG_HOVER = 'rgba(137, 117, 68, 0.8)';

// Premium 卡片环境辉光颜色（外发光）。
// 默认：rgba(200,140,40,0.10)。调大最后分量 → 金色辉光更明显。
export const PANEL_PREMIUM_GLOW = 'rgba(200, 140, 40, 0.10)';

// Premium 卡片边框（金色描边）。
// 默认：rgba(200,149,60,0.35)。调大最后分量 → 金色描边更亮更明显。
export const PANEL_BORDER_PREMIUM = 'rgba(200, 149, 60, 0.35)';

// Premium 顶部内阴影高光（暖金色亮线）。
// 默认：rgba(255,220,140,0.18)。调大最后分量 → 顶部暖金反光更亮。
export const PANEL_INSET_PREMIUM_TOP = 'rgba(255, 220, 140, 0.18)';
