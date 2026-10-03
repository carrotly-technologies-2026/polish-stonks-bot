/** Horizontal bar list rendered as a real table: every value is visible as text. */
export function BarList({ title, rows, format = String, emptyText }: {
  title: string; rows: { label: string; value: number }[]; format?: (n: number) => string; emptyText: string;
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="panel">
      <div className="panel-head"><h3 className="title">{title}</h3></div>
      <table className="mb-2 w-full border-collapse">
        <caption className="sr-only">{title}</caption>
        <tbody>
          {rows.length === 0 && <tr><td className="muted px-5 py-3">{emptyText}</td></tr>}
          {rows.map((r) => (
            <tr key={r.label}>
              <th scope="row" className="w-2/5 pt-2 pb-1 pr-3 pl-5 text-left font-normal">{r.label}</th>
              <td className="pt-2 pb-1" aria-hidden>
                <div className="h-2 rounded-full bg-surface-2">
                  <div className="h-2 rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: 'var(--chart-1)' }} />
                </div>
              </td>
              <td className="tnum w-16 pt-2 pb-1 pr-5 pl-3 text-right">{format(r.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
