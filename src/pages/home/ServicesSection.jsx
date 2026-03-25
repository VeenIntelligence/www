import { COPY } from '../../config/i18n';
import { useLanguage } from '../../context/useLanguage';
import '../../styles/sections/services.css';

/**
 * ServicesSection — 服务板块
 * TODO: 填充学术捐赠计划 + 个人技术咨询
 */
export default function ServicesSection() {
  const { lang } = useLanguage();

  return (
    <section id="services" className="services-section">
      <div className="services__inner">
        <p className="services__placeholder">
          {COPY.services[lang].placeholder}
        </p>
      </div>
    </section>
  );
}
