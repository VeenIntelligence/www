import { Link } from 'react-router-dom';
import { COPY } from '../config/i18n';
import { useLanguage } from '../context/useLanguage';
import { IconEmail, IconX, IconGitHub, IconProduct, IconBlog } from './common/SocialIcons';
import '../styles/components/footer.css';

/**
 * Footer — 全局页脚组件
 * 包含公司信息、社交链接、导航快捷入口
 */
export default function Footer() {
  const { lang } = useLanguage();
  const copy = COPY.footer[lang];
  const isChinese = lang === 'zh';
  const zhDescriptionLines = copy.description.split('，');

  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__left">
          <p className="footer__company">
            VEEN INTELLIGENCE FOUNDATION LLC
            <span className="footer__meta"> · EST. 2026 · Wyoming, USA</span>
          </p>
          <p className="footer__desc">
            {isChinese ? (
              <>
                <span className="footer__desc-line">{zhDescriptionLines[0]}，</span>
                <span className="footer__desc-line">{zhDescriptionLines.slice(1).join('，')}</span>
              </>
            ) : (
              copy.description
            )}
          </p>
        </div>

        <div className="footer__links">
          <div className="footer__social-links">
            <a href="mailto:contact@vennai.org" className="footer__link footer__link--icon">
              <IconEmail className="footer__link-icon" />
              {copy.email}
            </a>
            <a href="https://x.com/venn_foundation" target="_blank" rel="noopener noreferrer" className="footer__link footer__link--icon">
              <IconX className="footer__link-icon" />
              {copy.twitter}
            </a>
            <a href="https://github.com/VennIntelligence/" target="_blank" rel="noopener noreferrer" className="footer__link footer__link--icon">
              <IconGitHub className="footer__link-icon" />
              {copy.github}
            </a>
          </div>
          <div className="footer__nav-links">
            <a href="#product" className="footer__link footer__link--featured">
              <IconProduct className="footer__link-icon" />
              {copy.product}
            </a>
            <Link to="/blog" className="footer__link footer__link--featured">
              <IconBlog className="footer__link-icon" />
              {copy.blog}
            </Link>
          </div>
        </div>

        <div className="footer__right">
          <span className="footer__copy">{copy.copyright}</span>
        </div>
      </div>
    </footer>
  );
}
