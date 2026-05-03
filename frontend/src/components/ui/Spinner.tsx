export function Spinner({ large = false }: { large?: boolean }) {
  return <span className={`spinner${large ? ' spinner-lg' : ''}`} />;
}

export function LoadingRow() {
  return (
    <div className="loading-row">
      <Spinner />
      <span>Loading…</span>
    </div>
  );
}
