export default function Loading() {
  return (
    <div className="container section" aria-busy="true" aria-label="Loading">
      <div className="skeleton" style={{ height: 44, width: '40%', marginBottom: 28 }} />
      <div className="grid">{[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 300 }} />)}</div>
    </div>
  );
}
