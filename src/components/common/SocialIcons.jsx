/**
 * SocialIcons — 全站统一社交平台 SVG 图标
 *
 * 所有图标路径与 Hero Section 保持一致。
 * 使用 fill/stroke 继承 currentColor，方便外部通过 CSS 控制颜色。
 *
 * 提供以下图标：
 *   IconX       — X (Twitter)   24×24 filled
 *   IconGitHub  — GitHub         24×24 filled
 *   IconEmail   — Email envelope 24×24 stroked
 *   IconProduct — 产品图标（菱形）24×24 stroked
 *   IconBlog    — 博客图标（书本）24×24 stroked
 */

const DEFAULTS = { width: 24, height: 24, className: '' };

export function IconX({ width = DEFAULTS.width, height = DEFAULTS.height, className = DEFAULTS.className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width={width} height={height} className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function IconGitHub({ width = DEFAULTS.width, height = DEFAULTS.height, className = DEFAULTS.className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width={width} height={height} className={className} aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

export function IconEmail({ width = DEFAULTS.width, height = DEFAULTS.height, className = DEFAULTS.className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width={width} height={height} className={className} aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 7l-10 7L2 7" />
    </svg>
  );
}

export function IconProduct({ width = DEFAULTS.width, height = DEFAULTS.height, className = DEFAULTS.className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width={width} height={height} className={className} aria-hidden="true">
      <path d="M12 2l8 4.5v9L12 22l-8-6.5v-9L12 2z" />
      <path d="M12 22V11" />
      <path d="M20 6.5l-8 4.5-8-4.5" />
    </svg>
  );
}

export function IconBlog({ width = DEFAULTS.width, height = DEFAULTS.height, className = DEFAULTS.className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width={width} height={height} className={className} aria-hidden="true">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      <path d="M8 7h8M8 11h8M8 15h5" />
    </svg>
  );
}
