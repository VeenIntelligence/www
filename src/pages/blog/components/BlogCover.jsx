const BLOOM_PETALS = Array.from({ length: 6 }, (_, index) => ({
  kind: 'petal',
  x: '52%',
  y: '48%',
  width: '28%',
  height: '66%',
  rotate: index * 60,
  color: index % 2 === 0 ? 0 : 1,
  opacity: 0.9,
  blur: 0,
}));

const COVER_SCENES = {
  bloom: {
    forms: [
      ...BLOOM_PETALS,
      { kind: 'orb', x: '52%', y: '48%', size: '20%', color: 2, opacity: 0.95, blur: 8 },
      { kind: 'flare', x: '52%', y: '52%', width: '68%', height: '22%', rotate: -18, color: 1, opacity: 0.3, blur: 18 },
    ],
    glass: [
      { x: '22%', y: '18%', width: '30%', height: '120%', rotate: -18, opacity: 0.8 },
      { x: '58%', y: '-12%', width: '26%', height: '132%', rotate: 12, opacity: 0.76 },
      { x: '74%', y: '12%', width: '18%', height: '96%', rotate: 24, opacity: 0.68 },
    ],
  },
  prism: {
    forms: [
      { kind: 'flare', x: '26%', y: '72%', width: '70%', height: '24%', rotate: -28, color: 0, opacity: 0.75, blur: 10 },
      { kind: 'flare', x: '42%', y: '58%', width: '68%', height: '22%', rotate: -18, color: 1, opacity: 0.72, blur: 12 },
      { kind: 'flare', x: '58%', y: '44%', width: '56%', height: '18%', rotate: -8, color: 2, opacity: 0.7, blur: 10 },
      { kind: 'orb', x: '70%', y: '36%', size: '26%', color: 1, opacity: 0.82, blur: 18 },
      { kind: 'petal', x: '72%', y: '34%', width: '18%', height: '50%', rotate: -24, color: 2, opacity: 0.55, blur: 6 },
    ],
    glass: [
      { x: '8%', y: '2%', width: '20%', height: '128%', rotate: -26, opacity: 0.72 },
      { x: '46%', y: '-4%', width: '24%', height: '138%', rotate: -10, opacity: 0.76 },
      { x: '78%', y: '10%', width: '16%', height: '104%', rotate: 18, opacity: 0.7 },
    ],
  },
  halo: {
    forms: [
      { kind: 'orb', x: '50%', y: '48%', size: '34%', color: 0, opacity: 0.92, blur: 18 },
      { kind: 'orb', x: '38%', y: '42%', size: '20%', color: 1, opacity: 0.5, blur: 16 },
      { kind: 'orb', x: '64%', y: '56%', size: '18%', color: 2, opacity: 0.62, blur: 14 },
      { kind: 'flare', x: '50%', y: '48%', width: '80%', height: '18%', rotate: 18, color: 1, opacity: 0.32, blur: 18 },
      { kind: 'flare', x: '50%', y: '50%', width: '72%', height: '18%', rotate: -28, color: 2, opacity: 0.28, blur: 16 },
      { kind: 'petal', x: '32%', y: '64%', width: '18%', height: '44%', rotate: 28, color: 2, opacity: 0.42, blur: 6 },
      { kind: 'petal', x: '72%', y: '30%', width: '16%', height: '38%', rotate: -34, color: 1, opacity: 0.38, blur: 6 },
    ],
    glass: [
      { x: '18%', y: '-6%', width: '28%', height: '122%', rotate: -12, opacity: 0.74 },
      { x: '48%', y: '12%', width: '20%', height: '88%', rotate: 8, opacity: 0.72 },
      { x: '72%', y: '-10%', width: '24%', height: '132%', rotate: 20, opacity: 0.68 },
    ],
  },
};

function getColor(palette, index, fallback) {
  return palette[index] || fallback;
}

function getFormBackground(form, palette) {
  const color = getColor(palette, form.color, 'rgba(255, 255, 255, 0.6)');

  if (form.kind === 'flare') {
    return `linear-gradient(${(form.rotate || 0) + 90}deg, transparent 0%, ${color} 28%, rgba(255, 255, 255, 0.18) 50%, transparent 82%)`;
  }

  return `radial-gradient(circle at 32% 32%, rgba(255, 255, 255, 0.92) 0%, ${color} 42%, rgba(255, 255, 255, 0) 78%)`;
}

function getFormStyle(form, palette, featured) {
  const size = form.size || form.width;
  return {
    left: form.x,
    top: form.y,
    width: size,
    height: form.size || form.height,
    opacity: form.opacity,
    filter: `blur(${form.blur || 0}px)`,
    background: getFormBackground(form, palette),
    transform: `translate(-50%, -50%) rotate(${form.rotate || 0}deg) scale(${featured ? 1.06 : 1})`,
  };
}

function getGlassStyle(glass, tint) {
  return {
    left: glass.x,
    top: glass.y,
    width: glass.width,
    height: glass.height,
    opacity: glass.opacity,
    background: `linear-gradient(180deg, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0.08) 38%, ${tint} 100%)`,
    transform: `rotate(${glass.rotate}deg)`,
  };
}

export default function BlogCover({ cover, featured }) {
  const scene = COVER_SCENES[cover.variant] || COVER_SCENES.bloom;
  const height = featured ? 280 : 180;
  const glassTint = cover.glassTint || 'rgba(164, 206, 255, 0.16)';

  return (
    <div
      className={`blog-card__cover${featured ? ' blog-card__cover--featured' : ''}`}
      style={{ background: cover.bg, height }}
    >
      <div className="blog-cover-art" aria-hidden="true">
        <div className="blog-cover-art__ambient" />
        <div className="blog-cover-art__scene">
          {scene.forms.map((form, index) => (
            <span
              key={`${cover.variant}-form-${index}`}
              className={`blog-cover-art__form blog-cover-art__form--${form.kind}`}
              style={getFormStyle(form, cover.palette || [], featured)}
            />
          ))}
        </div>
        <div className="blog-cover-art__glass-layer">
          {scene.glass.map((glass, index) => (
            <span
              key={`${cover.variant}-glass-${index}`}
              className="blog-cover-art__glass"
              style={getGlassStyle(glass, glassTint)}
            />
          ))}
        </div>
        <div className="blog-cover-art__sheen" />
        <div className="blog-cover-art__grain" />
      </div>
    </div>
  );
}
