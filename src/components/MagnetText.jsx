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

  /*
   * 按空格拆分成单词，每个单词内部的字符用 inline-block span 包裹，
   * 整个单词再用 inline-flex span 包裹（防止单词内部断行）。
   * 单词之间插入普通空格字符（允许浏览器在此处换行）。
   */
  const words = text.split(' ');

  return (
    <Tag ref={ref} className={className} {...rest}>
      {words.map((word, wi) => (
        <span key={wi}>
          {/* 单词容器：inline-flex 确保内部字符不会被拆散到不同行 */}
          <span style={{ display: 'inline-flex' }}>
            {[...word].map((char, ci) => (
              <span
                key={ci}
                className={`magnet-char ${charClassName}`.trim()}
                style={{ display: 'inline-block', willChange: 'transform' }}
              >
                {char}
              </span>
            ))}
          </span>
          {/* 单词之间插入普通空格，允许浏览器在此处自然换行 */}
          {wi < words.length - 1 ? ' ' : null}
        </span>
      ))}
    </Tag>
  );
});

export default MagnetText;
