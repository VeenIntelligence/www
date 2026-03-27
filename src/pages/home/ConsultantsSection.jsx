import { COPY } from '../../config/i18n';
import { useLanguage } from '../../context/useLanguage';
import '../../styles/sections/consultants.css';

/**
 * ConsultantsSection — 咨询板块
 * TODO: 填充学术捐赠计划 + 个人技术咨询
 */
export default function ConsultantsSection() {
  const { lang } = useLanguage();

  return (
    <section id="consultants" className="consultants-section">
      <div className="consultants__inner">
        <p className="consultants__placeholder">
          {COPY.consultants[lang].placeholder}
        </p>
      </div>
    </section>
  );
}
