import { useState } from 'react';
import { adminService, type ReportResult } from '../../services/adminService';
import { Button } from '../ui/Button';
import { control, Field, Failure, useAdminLoad } from './shared';

export function AdminReports() {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ kind: 'submissions', from: `${today.slice(0, 7)}-01`, to: new Date(Date.now() + 86400000).toISOString().slice(0, 10) });
  const [query, setQuery] = useState(form);
  const [cursor, setCursor] = useState<ReportResult['nextCursor']>(null);
  const [history, setHistory] = useState<ReportResult['nextCursor'][]>([]);
  const [error, setError] = useState('');
  const report = useAdminLoad(signal => adminService.report(query.kind, new URLSearchParams({
    from: `${query.from}T00:00:00Z`, to: `${query.to}T00:00:00Z`, limit: '50', ...(cursor ?? {}),
  }), signal), [query, cursor]);
  const columns = report.data?.data.length ? Object.keys(report.data.data[0]) : [];
  return <section><h2 className="text-2xl font-bold">Reports</h2><p className="my-2 text-slate-600">UTC date range: start inclusive, end exclusive. Maximum 366 days. Activity reports contain recorded API audit events.</p>
    <form className="my-5 grid gap-3 sm:grid-cols-4" onSubmit={event => {
      event.preventDefault(); const days = (Date.parse(form.to) - Date.parse(form.from)) / 86400000;
      if (!Number.isFinite(days) || days <= 0 || days > 366) { setError('Choose an end date after the start date, no more than 366 days apart.'); return; }
      setError(''); setCursor(null); setHistory([]); setQuery({ ...form });
    }}><Field label="Report type"><select className={control} value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value })}>{['submissions', 'payments', 'user-activity'].map(value => <option key={value}>{value}</option>)}</select></Field>
      <Field label="From (UTC)"><input className={control} type="date" required value={form.from} onChange={e => setForm({ ...form, from: e.target.value })} /></Field>
      <Field label="To (UTC, exclusive)"><input className={control} type="date" required value={form.to} onChange={e => setForm({ ...form, to: e.target.value })} /></Field><Button type="submit" className="self-end">Apply filters</Button></form>
    <Failure message={error || report.error} />{report.error && <Button onClick={report.reload}>Retry report</Button>}
    {report.loading && <p role="status">Loading report…</p>}
    {report.data && <><p className="mb-3">{query.kind} · {query.from} to {query.to} (UTC) · Page {history.length + 1}</p>
      {columns.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Filtered {query.kind} report</caption><thead><tr>{columns.map(key => <th scope="col" key={key} className="whitespace-nowrap p-3">{key.replaceAll('_', ' ')}</th>)}</tr></thead><tbody>{report.data.data.map((row, index) => <tr key={String(row.id ?? index)} className="border-t border-slate-200">{columns.map(key => <td key={key} className="whitespace-nowrap p-3">{row[key] ?? '—'}</td>)}</tr>)}</tbody></table></div> : <p>No records in this date range.</p>}
      <div className="mt-4 flex gap-3"><Button variant="secondary" disabled={!history.length} onClick={() => { setCursor(history[history.length - 1]); setHistory(history.slice(0, -1)); }}>Previous report page</Button><Button variant="secondary" disabled={!report.data.nextCursor} onClick={() => { setHistory([...history, cursor]); setCursor(report.data!.nextCursor); }}>Next report page</Button></div></>}
  </section>;
}
