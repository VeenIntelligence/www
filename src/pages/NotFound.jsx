import { Link } from 'react-router-dom';

/**
 * NotFound — 404 页面
 */
export default function NotFound() {
  return (
    <section className="not-found" style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '24px',
    }}>
      <h1 style={{
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '6rem',
        fontWeight: 900,
        color: 'rgba(79, 195, 247, 0.3)',
        margin: 0,
      }}>404</h1>
      <p style={{
        fontFamily: 'Inter, sans-serif',
        fontSize: '1rem',
        color: 'rgba(224, 224, 224, 0.5)',
      }}>Page not found</p>
      <Link to="/" style={{
        fontFamily: 'Inter, sans-serif',
        fontSize: '0.875rem',
        color: '#4fc3f7',
        textDecoration: 'none',
        border: '1px solid rgba(79, 195, 247, 0.3)',
        padding: '8px 24px',
        borderRadius: '6px',
        transition: 'all 0.3s ease',
      }}>← Back to Home</Link>
    </section>
  );
}
