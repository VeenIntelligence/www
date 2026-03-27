import { useEffect, useRef, useState, useCallback } from 'react';

const LANG_OPTIONS = [
  { value: 'en', label: 'EN' },
  { value: 'zh', label: '中' },
];

const LANGUAGE_TOGGLE_FILTER_ID = 'lang-switch-goo';

const LANGUAGE_TOGGLE_TUNING = {
  // 布局尺寸
  width: 80, // 控制整个切换胶囊的总宽度，默认标准值 76px。调大后整体更舒展，调小后更紧凑。
  height: 32, // 控制整个切换胶囊的总高度，默认标准值 30px。调大后更饱满，调小后更纤细。
  padding: 2, // 控制轨道内边距，默认标准值 2px。调大后主胶囊更小且留白更多，调小后胶囊更贴边。
  travel: 39, // 控制主胶囊从左槽位移动到右槽位的水平距离，默认标准值 36px。调大后位移更远，调小后两端更靠近。

  // 液滴 / goo 连接强度
  blurStdDeviation: 5, // 控制 SVG 模糊半径，默认标准值 6。调大后液态桥更粗更软，调小后桥更细更克制。
  colorMatrixContrast: 25, // 控制 goo 对比度硬化强度，默认标准值 28。调大后桥更容易"凝结"，调小后更柔更散。
  colorMatrixThreshold: -12, // 控制 goo 成桥阈值，默认标准值 -12。数值更小会更早连桥，数值更大则要靠得更近才连。

  // 液滴缓动
  ghostCollapseDelayMs: 150, // 控制 ghost 延迟多久才开始缩小消失，默认标准值 80ms。调大后液态桥持续更久，调小后更利落。
  mainTransitionMs: 500, // 控制主胶囊位移动画时长，默认标准值 360ms。调大后更悠长，调小后更干脆。
  ghostTransitionMs: 300, // 控制 ghost 缩小消失的动画时长，默认标准值 220ms。调大后桥收尾更拖曳，调小后更迅速。
  mainEasing: 'cubic-bezier(0.34, 1.3, 0.64, 1)', // 控制主胶囊落点弹性感，默认标准值 cubic-bezier(0.34, 1.3, 0.64, 1)。前段更高会更弹，收尾更低会更稳。
  ghostEasing: 'cubic-bezier(0.22, 1, 0.36, 1)', // 控制 ghost 收缩的回收节奏，默认标准值 cubic-bezier(0.22, 1, 0.36, 1)。前段更陡会更猛，后段更平会更柔。
  ghostOpacityEasing: 'ease-out', // 控制 ghost 透明度淡出的节奏，默认标准值 ease。调成 ease-out 会更顺滑，linear 会更机械。
  optionColorTransitionMs: 300, // 控制 EN/中 两个标签颜色切换时长，默认标准值 180ms。调大后更柔，调小后更快。
  optionColorEasing: 'ease-out', // 控制 EN/中 两个标签颜色切换曲线，默认标准值 ease。可改成 ease-out 或 cubic-bezier(...)。

  // ---- 拖拽手势参数 ----
  dragDeadZone: 6, // 拖拽手势的死区距离(px)，默认标准值 6px。在按下后水平移动超过此距离才进入拖拽模式，低于此距离松手仍视为点击。调大后更不容易误触发拖拽（移动端推荐 ≥6），调小后响应更灵敏。
  dragCommitRatio: 0.35, // 拖拽完成切换的提交阈值，默认标准值 0.35（即拖到 travel 的 35%）。调大后要拖得更远才触发切换，调小后轻拖即切。
  dragSnapMs: 280, // 拖拽松手后胶囊弹回/弹到位的动画时长(ms)，默认标准值 280ms。调大后更悠缓，调小后更迅捷。
  dragSnapEasing: 'cubic-bezier(0.34, 1.3, 0.64, 1)', // 拖拽松手后弹回/弹到位的缓动曲线。默认与主切换一致，保持一致弹性感。
};

const getLanguageIndex = (language) => Math.max(
  LANG_OPTIONS.findIndex((option) => option.value === language),
  0
);

export default function LanguageToggle({ lang, onChange }) {
  const ghostTimerRef = useRef(null);
  const snapTimerRef = useRef(null);
  const activeIndex = getLanguageIndex(lang);
  const [ghostIndex, setGhostIndex] = useState(activeIndex);
  const [ghostPhase, setGhostPhase] = useState('idle');

  // 交互阶段: 'idle' | 'dragging' | 'snapping'
  // 用 React 状态代替 ref，确保渲染时的 transition 参数与阶段同步
  const [interactionPhase, setInteractionPhase] = useState('idle');

  // 拖拽中 pill 的像素位置。null 表示非拖拽（使用 CSS transition 定位）
  const [dragX, setDragX] = useState(null);

  // 拖拽过程中的瞬时数据，不触发渲染
  const dragRef = useRef({
    pointerDown: false,  // 指针是否按下
    isDrag: false,       // 是否已进入拖拽模式（超过死区）
    startX: 0,           // 按下时 clientX
    startPillX: 0,       // 按下时 pill 的 translateX
    currentX: 0,         // 当前 pill 的 translateX
    pointerId: null,     // 用于 pointer capture
  });

  const containerRef = useRef(null);

  // 统一清理
  useEffect(() => () => {
    if (ghostTimerRef.current !== null) clearTimeout(ghostTimerRef.current);
    if (snapTimerRef.current !== null) clearTimeout(snapTimerRef.current);
  }, []);

  // ---- 切换逻辑 ----
  // fromDrag: 是否由拖拽触发。拖拽触发时跳过 ghost 动画（因用户已手动移看到 pill 移位）
  const commitSwitch = useCallback((nextLanguage, fromDrag = false) => {
    if (nextLanguage === lang) return;

    if (ghostTimerRef.current !== null) {
      clearTimeout(ghostTimerRef.current);
      ghostTimerRef.current = null;
    }

    if (!fromDrag) {
      // 点击切换：显示 ghost 液滴桥接动画
      setGhostIndex(activeIndex);
      setGhostPhase('frozen');

      ghostTimerRef.current = setTimeout(() => {
        setGhostPhase('collapsing');
        ghostTimerRef.current = null;
      }, LANGUAGE_TOGGLE_TUNING.ghostCollapseDelayMs);
    } else {
      // 拖拽切换：不需要 ghost，直接重置
      setGhostPhase('idle');
    }

    onChange(nextLanguage);
  }, [lang, activeIndex, onChange]);

  // ---- Pointer 事件 ----
  // 所有点击和拖拽都通过 pointer events 统一处理
  // 不依赖按钮的 onClick（移动端 touch-action: none 下 click 可能不触发或延迟）

  const handlePointerDown = useCallback((e) => {
    if (e.button !== 0) return;

    const d = dragRef.current;
    d.pointerDown = true;
    d.isDrag = false;
    d.startX = e.clientX;
    d.startPillX = activeIndex * LANGUAGE_TOGGLE_TUNING.travel;
    d.currentX = d.startPillX;
    d.pointerId = e.pointerId;
  }, [activeIndex]);

  const handlePointerMove = useCallback((e) => {
    const d = dragRef.current;
    if (!d.pointerDown) return;

    const deltaX = e.clientX - d.startX;
    const { travel, dragDeadZone } = LANGUAGE_TOGGLE_TUNING;

    if (!d.isDrag) {
      if (Math.abs(deltaX) < dragDeadZone) return;
      // 超过死区 → 进入拖拽模式
      d.isDrag = true;
      setInteractionPhase('dragging');

      // 捕获指针，确保移出组件区域仍能跟踪
      if (containerRef.current && d.pointerId !== null) {
        try { containerRef.current.setPointerCapture(d.pointerId); } catch { /* ignore */ }
      }
    }

    const rawX = d.startPillX + deltaX;
    d.currentX = Math.max(0, Math.min(travel, rawX));
    setDragX(d.currentX);
  }, []);

  const handlePointerUp = useCallback((e) => {
    const d = dragRef.current;
    if (!d.pointerDown) return;
    d.pointerDown = false;

    // 释放 pointer capture
    if (containerRef.current && d.pointerId !== null) {
      try { containerRef.current.releasePointerCapture(d.pointerId); } catch { /* ignore */ }
    }
    d.pointerId = null;

    // ---- 点击路径 ----
    if (!d.isDrag) {
      // 未拖拽 → 视为点击
      // 基于指针位置判断点击了哪一半（不依赖 onClick）
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const relX = e.clientX - rect.left;
        const tappedIndex = relX < rect.width / 2 ? 0 : 1;
        commitSwitch(LANG_OPTIONS[tappedIndex].value, false);
      }
      return;
    }

    // ---- 拖拽释放路径 ----
    const { travel, dragCommitRatio, dragSnapMs } = LANGUAGE_TOGGLE_TUNING;
    const finalX = d.currentX;
    const commitThreshold = travel * dragCommitRatio;

    let targetIndex;
    if (activeIndex === 0) {
      targetIndex = finalX > commitThreshold ? 1 : 0;
    } else {
      targetIndex = finalX < (travel - commitThreshold) ? 0 : 1;
    }

    // 结束拖拽，进入 snap 弹回/弹到阶段
    d.isDrag = false;
    setDragX(null);
    setInteractionPhase('snapping');

    // snap 动画完成后恢复 idle
    if (snapTimerRef.current !== null) clearTimeout(snapTimerRef.current);
    snapTimerRef.current = setTimeout(() => {
      setInteractionPhase('idle');
      snapTimerRef.current = null;
    }, dragSnapMs);

    if (targetIndex !== activeIndex) {
      commitSwitch(LANG_OPTIONS[targetIndex].value, true);
    }
  }, [activeIndex, commitSwitch]);

  const handlePointerCancel = useCallback(() => {
    const d = dragRef.current;
    d.pointerDown = false;
    d.isDrag = false;
    d.pointerId = null;
    setDragX(null);
    setInteractionPhase('idle');
  }, []);

  // 键盘无障碍（按钮的 onClick 仅作为键盘 Enter/Space 的备用通道）
  const handleKeySelect = useCallback((nextLanguage) => {
    commitSwitch(nextLanguage, false);
  }, [commitSwitch]);

  // ---- 计算样式 ----
  const isDragging = interactionPhase === 'dragging';
  const isSnapping = interactionPhase === 'snapping';
  const pillX = isDragging
    ? (dragX ?? activeIndex * LANGUAGE_TOGGLE_TUNING.travel)
    : activeIndex * LANGUAGE_TOGGLE_TUNING.travel;

  // 根据交互阶段决定 transition 参数
  let mainDuration, mainEasing;
  if (isDragging) {
    // 拖拽中：零延迟跟手
    mainDuration = '0ms';
    mainEasing = 'linear';
  } else if (isSnapping) {
    // 拖拽松手：snap 弹回/弹到
    mainDuration = `${LANGUAGE_TOGGLE_TUNING.dragSnapMs}ms`;
    mainEasing = LANGUAGE_TOGGLE_TUNING.dragSnapEasing;
  } else {
    // 常态：点击切换用主缓动
    mainDuration = `${LANGUAGE_TOGGLE_TUNING.mainTransitionMs}ms`;
    mainEasing = LANGUAGE_TOGGLE_TUNING.mainEasing;
  }

  const switcherStyle = {
    '--lang-switch-width': `${LANGUAGE_TOGGLE_TUNING.width}px`,
    '--lang-switch-height': `${LANGUAGE_TOGGLE_TUNING.height}px`,
    '--lang-switch-pad': `${LANGUAGE_TOGGLE_TUNING.padding}px`,
    '--lang-switch-travel': `${LANGUAGE_TOGGLE_TUNING.travel}px`,
    '--lang-switch-main-duration': mainDuration,
    '--lang-switch-ghost-duration': `${LANGUAGE_TOGGLE_TUNING.ghostTransitionMs}ms`,
    '--lang-switch-main-ease': mainEasing,
    '--lang-switch-ghost-ease': LANGUAGE_TOGGLE_TUNING.ghostEasing,
    '--lang-switch-ghost-opacity-ease': LANGUAGE_TOGGLE_TUNING.ghostOpacityEasing,
    '--lang-switch-option-duration': `${LANGUAGE_TOGGLE_TUNING.optionColorTransitionMs}ms`,
    '--lang-switch-option-ease': LANGUAGE_TOGGLE_TUNING.optionColorEasing,
    '--lang-switch-main-x': `${pillX}px`,
    '--lang-switch-ghost-x': `${ghostIndex * LANGUAGE_TOGGLE_TUNING.travel}px`,
  };

  const gooFilterStyle = {
    filter: `url(#${LANGUAGE_TOGGLE_FILTER_ID})`,
  };

  return (
    <div
      ref={containerRef}
      className={`lang-switch lang-switch--${lang}${isDragging ? ' lang-switch--dragging' : ''}`}
      style={switcherStyle}
      role="radiogroup"
      aria-label="Language"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
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
            onClick={() => handleKeySelect(option.value)}
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
