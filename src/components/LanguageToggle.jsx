import { useEffect, useRef, useState } from 'react';

const LANG_OPTIONS = [
  { value: 'en', label: 'EN' },
  { value: 'zh', label: '中' },
];

const LANGUAGE_TOGGLE_FILTER_ID = 'lang-switch-goo';

const LANGUAGE_TOGGLE_TUNING = {
  // 布局尺寸
  width: 76, // 控制整个切换胶囊的总宽度，默认标准值 76px。调大后整体更舒展，调小后更紧凑。
  height: 30, // 控制整个切换胶囊的总高度，默认标准值 30px。调大后更饱满，调小后更纤细。
  padding: 2, // 控制轨道内边距，默认标准值 2px。调大后主胶囊更小且留白更多，调小后胶囊更贴边。
  travel: 36, // 控制主胶囊从左槽位移动到右槽位的水平距离，默认标准值 36px。调大后位移更远，调小后两端更靠近。

  // 液滴 / goo 连接强度
  blurStdDeviation: 6, // 控制 SVG 模糊半径，默认标准值 6。调大后液态桥更粗更软，调小后桥更细更克制。
  colorMatrixContrast: 28, // 控制 goo 对比度硬化强度，默认标准值 28。调大后桥更容易“凝结”，调小后更柔更散。
  colorMatrixThreshold: -12, // 控制 goo 成桥阈值，默认标准值 -12。数值更小会更早连桥，数值更大则要靠得更近才连。

  // 液滴缓动
  ghostCollapseDelayMs: 80, // 控制 ghost 延迟多久才开始缩小消失，默认标准值 80ms。调大后液态桥持续更久，调小后更利落。
  mainTransitionMs: 360, // 控制主胶囊位移动画时长，默认标准值 360ms。调大后更悠长，调小后更干脆。
  ghostTransitionMs: 220, // 控制 ghost 缩小消失的动画时长，默认标准值 220ms。调大后桥收尾更拖曳，调小后更迅速。
  mainEasing: 'cubic-bezier(0.34, 1.3, 0.64, 1)', // 控制主胶囊落点弹性感，默认标准值 cubic-bezier(0.34, 1.3, 0.64, 1)。前段更高会更弹，收尾更低会更稳。
  ghostEasing: 'cubic-bezier(0.22, 1, 0.36, 1)', // 控制 ghost 收缩的回收节奏，默认标准值 cubic-bezier(0.22, 1, 0.36, 1)。前段更陡会更猛，后段更平会更柔。
  ghostOpacityEasing: 'ease', // 控制 ghost 透明度淡出的节奏，默认标准值 ease。调成 ease-out 会更顺滑，linear 会更机械。
  optionColorTransitionMs: 180, // 控制 EN/中 两个标签颜色切换时长，默认标准值 180ms。调大后更柔，调小后更快。
  optionColorEasing: 'ease', // 控制 EN/中 两个标签颜色切换曲线，默认标准值 ease。可改成 ease-out 或 cubic-bezier(...)。
};

const getLanguageIndex = (language) => Math.max(
  LANG_OPTIONS.findIndex((option) => option.value === language),
  0
);

export default function LanguageToggle({ lang, onChange }) {
  const ghostTimerRef = useRef(null);
  const activeIndex = getLanguageIndex(lang);
  const [ghostIndex, setGhostIndex] = useState(activeIndex);
  const [ghostPhase, setGhostPhase] = useState('idle');

  useEffect(() => () => {
    if (ghostTimerRef.current !== null) {
      window.clearTimeout(ghostTimerRef.current);
    }
  }, []);

  const handleSelect = (nextLanguage) => {
    if (nextLanguage === lang) {
      return;
    }

    if (ghostTimerRef.current !== null) {
      window.clearTimeout(ghostTimerRef.current);
    }

    setGhostIndex(activeIndex);
    setGhostPhase('frozen');
    onChange(nextLanguage);

    ghostTimerRef.current = window.setTimeout(() => {
      setGhostPhase('collapsing');
      ghostTimerRef.current = null;
    }, LANGUAGE_TOGGLE_TUNING.ghostCollapseDelayMs);
  };

  const switcherStyle = {
    '--lang-switch-width': `${LANGUAGE_TOGGLE_TUNING.width}px`,
    '--lang-switch-height': `${LANGUAGE_TOGGLE_TUNING.height}px`,
    '--lang-switch-pad': `${LANGUAGE_TOGGLE_TUNING.padding}px`,
    '--lang-switch-travel': `${LANGUAGE_TOGGLE_TUNING.travel}px`,
    '--lang-switch-main-duration': `${LANGUAGE_TOGGLE_TUNING.mainTransitionMs}ms`,
    '--lang-switch-ghost-duration': `${LANGUAGE_TOGGLE_TUNING.ghostTransitionMs}ms`,
    '--lang-switch-main-ease': LANGUAGE_TOGGLE_TUNING.mainEasing,
    '--lang-switch-ghost-ease': LANGUAGE_TOGGLE_TUNING.ghostEasing,
    '--lang-switch-ghost-opacity-ease': LANGUAGE_TOGGLE_TUNING.ghostOpacityEasing,
    '--lang-switch-option-duration': `${LANGUAGE_TOGGLE_TUNING.optionColorTransitionMs}ms`,
    '--lang-switch-option-ease': LANGUAGE_TOGGLE_TUNING.optionColorEasing,
    '--lang-switch-main-x': `${activeIndex * LANGUAGE_TOGGLE_TUNING.travel}px`,
    '--lang-switch-ghost-x': `${ghostIndex * LANGUAGE_TOGGLE_TUNING.travel}px`,
  };

  const gooFilterStyle = {
    filter: `url(#${LANGUAGE_TOGGLE_FILTER_ID})`,
  };

  return (
    <div
      className={`lang-switch lang-switch--${lang}`}
      style={switcherStyle}
      role="radiogroup"
      aria-label="Language"
    >
      <svg className="lang-switch__filter-defs" aria-hidden="true" focusable="false">
        <defs>
          <filter id={LANGUAGE_TOGGLE_FILTER_ID}>
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation={LANGUAGE_TOGGLE_TUNING.blurStdDeviation}
              result="blur"
            />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values={`1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${LANGUAGE_TOGGLE_TUNING.colorMatrixContrast} ${LANGUAGE_TOGGLE_TUNING.colorMatrixThreshold}`}
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      <div className="lang-switch__track" aria-hidden="true" />

      <div className="lang-switch__goo-wrap" aria-hidden="true" style={gooFilterStyle}>
        <div className="lang-switch__pill-layer">
          <div className="lang-switch__pill lang-switch__pill--main" />
          <div
            className={`lang-switch__pill lang-switch__pill--ghost ${
              ghostPhase === 'frozen'
                ? 'lang-switch__pill--ghost-frozen'
                : ghostPhase === 'collapsing'
                  ? 'lang-switch__pill--ghost-collapsing'
                  : ''
            }`}
          />
        </div>
      </div>

      <div className="lang-switch__btn-layer">
        {LANG_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`lang-switch__option ${lang === option.value ? 'lang-switch__option--active' : ''}`}
            onClick={() => handleSelect(option.value)}
            role="radio"
            aria-checked={lang === option.value}
          >
            <span className="lang-switch__option-label">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
