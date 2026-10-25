/**
 * src/pages/admin/ComingSoon.jsx
 * --------------------------------
 * Generic placeholder rendered for every admin route not yet implemented.
 * Receives the page name as a prop so each placeholder is distinct.
 */
export default function ComingSoon({ page = 'This page' }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '60vh', gap: '12px', textAlign: 'center',
    }}>
      <div style={{ fontSize: '48px' }}>🚧</div>
      <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text)' }}>
        {page}
      </h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '340px' }}>
        This section is coming in a future phase. The navigation link is visible
        so you can see the full admin shell, but the feature is not yet built.
      </p>
      <span style={{
        display: 'inline-block', marginTop: '8px',
        background: 'var(--gold-glow)', border: '1px solid var(--gold-dark)',
        color: 'var(--gold)', borderRadius: '20px', padding: '5px 18px',
        fontSize: '12px', fontWeight: '600',
      }}>
        Coming soon
      </span>
    </div>
  );
}
