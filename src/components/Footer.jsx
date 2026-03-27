import { Link } from 'react-router-dom';
import { COPY } from '../config/i18n';
import { useLanguage } from '../context/useLanguage';
import '../styles/components/footer.css';

/**
 * Footer — 全局页脚组件
 * 包含公司信息、社交链接、导航快捷入口
 */
export default function Footer() {
  const { lang } = useLanguage();
  const copy = COPY.footer[lang];

  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__left">
          <p className="footer__company">
            VEEN INTELLIGENCE FOUNDATION LLC
            <span className="footer__meta"> · EST. 2026 · Wyoming, USA</span>
          </p>
          <p className="footer__desc">
            {copy.description}
          </p>
        </div>

        <div className="footer__links">
          <a href="mailto:contact@veenai.org" className="footer__link">{copy.email}</a>
          <a href="https://x.com/veen_foundation" target="_blank" rel="noopener noreferrer" className="footer__link">{copy.twitter}</a>
          <a href="https://github.com/VeenIntelligence/" target="_blank" rel="noopener noreferrer" className="footer__link">{copy.github}</a>
          <a href="#product" className="footer__link">{copy.product}</a>
          <Link to="/blog" className="footer__link">{copy.blog}</Link>
        </div>

        <div className="footer__right">
          <span className="footer__copy">{copy.copyright}</span>
        </div>
      </div>
    </footer>
  );
}
