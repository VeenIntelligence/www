import { useEffect } from 'react';
import HeroSection from './home/HeroSection';
import AboutSection from './home/AboutSection';
import ProductSection from './home/ProductSection';
import ConsultantsSection from './home/ConsultantsSection';
import Footer from '../components/Footer';

/**
 * HomePage — Landing Page 组装器
 * 将所有 Section 组合为一个单页滚动体验
 */
export default function HomePage() {
  useEffect(() => {
    document.documentElement.classList.add('home-page-scroll-snap');
    document.body.classList.add('home-page-scroll-snap');

    return () => {
      document.documentElement.classList.remove('home-page-scroll-snap');
      document.body.classList.remove('home-page-scroll-snap');
    };
  }, []);

  return (
    <main className="home-page">
      <HeroSection />
      <AboutSection />
      <ProductSection />
      <ConsultantsSection />
      <Footer />
    </main>
  );
}
