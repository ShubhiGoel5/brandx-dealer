'use client';
export default function Error({ reset }) {
  return (
    <div className="container section stack" style={{ textAlign: 'center', paddingTop: 80 }}>
      <h1 style={{ fontSize: '2rem' }}>Something went wrong</h1>
      <p className="muted">Please try again in a moment.</p>
      <p><button className="btn primary" onClick={reset}>Try again</button></p>
    </div>
  );
}
