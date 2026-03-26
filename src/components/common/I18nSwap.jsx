import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../context/useLanguage';

const I18N_SWAP_TUNING = {
  durationMs: 260, // 控制文案换字动画总时长，默认标准值 260ms。调大后更柔和，调小后更利落。
};

export default function I18nSwap({ children, className = '', block = false }) {
  const { lang } = useLanguage();
  const previousLangRef = useRef(lang);
  const previousChildrenRef = useRef(children);
  const clearTimerRef = useRef(null);
  const [outgoingChildren, setOutgoingChildren] = useState(null);
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => () => {
    if (clearTimerRef.current !== null) {
      window.clearTimeout(clearTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (previousLangRef.current === lang) {
      previousChildrenRef.current = children;
      return;
    }

    if (clearTimerRef.current !== null) {
      window.clearTimeout(clearTimerRef.current);
    }

    setOutgoingChildren(previousChildrenRef.current);
    setAnimationKey((value) => value + 1);

    previousChildrenRef.current = children;
    previousLangRef.current = lang;

    clearTimerRef.current = window.setTimeout(() => {
      setOutgoingChildren(null);
      clearTimerRef.current = null;
    }, I18N_SWAP_TUNING.durationMs);
  }, [children, lang]);

  return (
    <span className={`i18n-swap ${block ? 'i18n-swap--block' : ''} ${className}`.trim()}>
      {outgoingChildren !== null ? (
        <span
          key={`outgoing-${animationKey}`}
          className="i18n-swap__layer i18n-swap__layer--outgoing"
          aria-hidden="true"
        >
          {outgoingChildren}
        </span>
      ) : null}

      <span
        key={`current-${animationKey}-${lang}`}
        className={`i18n-swap__layer i18n-swap__layer--current ${
          outgoingChildren !== null ? 'i18n-swap__layer--current-enter' : ''
        }`}
      >
        {children}
      </span>
    </span>
  );
}
