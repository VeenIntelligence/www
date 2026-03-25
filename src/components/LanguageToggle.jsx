const LANG_OPTIONS = [
  { value: 'en', label: 'EN' },
  { value: 'zh', label: '中' },
];

export default function LanguageToggle({ lang, onChange }) {
  const handleSelect = (nextLanguage) => {
    if (nextLanguage === lang) {
      return;
    }

    onChange(nextLanguage);
  };

  return (
    <div
      className={`lang-switch lang-switch--${lang}`}
      role="radiogroup"
      aria-label="Language"
    >
      <div className="lang-switch__thumb" aria-hidden="true" />

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
  );
}
