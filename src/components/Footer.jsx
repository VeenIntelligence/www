import { COPY } from '../config/i18n';
import { useLanguage } from '../context/useLanguage';
import '../styles/components/footer.css';

/**
 * Footer — 全局页脚组件
 * 内容从 Hero 的 info strip 提取而来，放在页面最底部
 */
export default function Footer() {
  const { lang } = useLanguage();
  const copy = COPY.footer[lang];

  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__left">
          <p className="footer__company">
            VENN INTELLIGENCE FOUNDATION LLC
            <span className="footer__meta"> · EST. 2026 · Wyoming, USA</span>
          </p>
          <p className="footer__desc">
            {copy.description}
          </p>
        </div>

        <div className="footer__links">
          <a href="mailto:contact@vennai.org" className="footer__link">{copy.email}</a>
          <a href="#product" className="footer__link">{copy.product}</a>
          <a href="#services" className="footer__link">{copy.services}</a>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="footer__link">GitHub</a>
        </div>

        <div className="footer__right">
          <span className="footer__copy">{copy.copyright}</span>
        </div>
      </div>
    </footer>
  );
}
