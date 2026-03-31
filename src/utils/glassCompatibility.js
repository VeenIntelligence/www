const GLASS_MOBILE_BREAKPOINT = 768;

function detectPlatform(win) {
  const ua = win.navigator?.userAgent || '';
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPad|iPhone|iPod/i.test(ua)
    || (win.navigator?.platform === 'MacIntel' && win.navigator?.maxTouchPoints > 1);

  if (isAndroid) return 'android';
  if (isIOS) return 'ios';
  return 'other';
}

function supportsBackdropFilter(win) {
  const supports = win.CSS?.supports;
  if (typeof supports !== 'function') return false;

  return supports('backdrop-filter: blur(1px)') || supports('-webkit-backdrop-filter: blur(1px)');
}

function supportsUrlBackdropFilter(win) {
  const testNode = win.document?.createElement?.('div');
  if (!testNode) return false;

  testNode.style.backdropFilter = 'url(#liquid-glass-compat) blur(1px)';
  testNode.style.webkitBackdropFilter = 'url(#liquid-glass-compat) blur(1px)';

  const standard = typeof testNode.style.backdropFilter === 'string'
    && testNode.style.backdropFilter.includes('url(');
  const webkit = typeof testNode.style.webkitBackdropFilter === 'string'
    && testNode.style.webkitBackdropFilter.includes('url(');

  return standard || webkit;
}

export function getGlassCompatibility(win = window) {
  const platform = detectPlatform(win);
  const isMobileViewport = win.innerWidth <= GLASS_MOBILE_BREAKPOINT;
  const backdropSupported = supportsBackdropFilter(win);
  const liquidFilterSupported = backdropSupported && supportsUrlBackdropFilter(win);

  // 兼容性优先：移动端与 Android 统一走稳定磨砂层，不启用 SVG displacement liquid。
  const liquidSupported = liquidFilterSupported && platform !== 'android' && !isMobileViewport;

  const tier = liquidSupported
    ? 'liquid'
    : (backdropSupported ? 'frost' : 'solid');

  return {
    tier,
    platform,
    isMobileViewport,
    backdropSupported,
    liquidSupported,
  };
}

export function syncGlassCompatibility(root = document.documentElement, win = window) {
  const profile = getGlassCompatibility(win);

  if (!root) return profile;

  root.dataset.glassTier = profile.tier;
  root.dataset.glassPlatform = profile.platform;
  root.dataset.glassBackdrop = profile.backdropSupported ? '1' : '0';
  root.dataset.glassLiquid = profile.liquidSupported ? '1' : '0';
  root.dataset.glassMobile = profile.isMobileViewport ? '1' : '0';

  return profile;
}

export { GLASS_MOBILE_BREAKPOINT };
