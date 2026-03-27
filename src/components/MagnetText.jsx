import { forwardRef } from 'react';

/**
 * MagnetText — 将文本拆分为逐字符 <span> 元素，
 * 配合 useCharMagnet hook 实现鼠标磁吸交互。
 *
 * Props:
 *   children  — 要拆分的文本字符串
 *   tag       — 外层 HTML 标签名（默认 'span'）
 *   className — 外层元素的 CSS 类名
 *   charClassName — 每个字符的额外 CSS 类名（默认无）
 *
 * 每个字符会被渲染为 <span class="magnet-char {charClassName}">
 * useCharMagnet hook 会查找 .magnet-char 元素并施加动画。
 *
 * 示例：
 *   <MagnetText tag="h2" className="my-title">Hello World</MagnetText>
 *   // 渲染: <h2><span class="magnet-char">H</span><span class="magnet-char">e</span>...</h2>
 */
const MagnetText = forwardRef(function MagnetText(
  { children, tag: Tag = 'span', className = '', charClassName = '', ...rest },
  ref
) {
  const text = typeof children === 'string' ? children : String(children ?? '');

  return (
    <Tag ref={ref} className={className} {...rest}>
      {[...text].map((char, i) => (
        <span
          key={i}
          className={`magnet-char ${charClassName}`.trim()}
          style={{ display: 'inline-block', willChange: 'transform' }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </Tag>
  );
});

export default MagnetText;
