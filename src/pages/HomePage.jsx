import HeroSection from './home/HeroSection';
import AboutSection from './home/AboutSection';
import ProductSection from './home/ProductSection';
import ServicesSection from './home/ServicesSection';
import Footer from '../components/Footer';

/**
 * HomePage — Landing Page 组装器
 * 将所有 Section 组合为一个单页滚动体验
 */
export default function HomePage() {
  return (
    <>
      <HeroSection />
      <AboutSection />
      <ProductSection />
      <ServicesSection />
      <Footer />
    </>
  );
}
