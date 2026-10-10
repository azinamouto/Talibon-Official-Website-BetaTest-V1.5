import { usePublicResource } from '../hooks/usePublicResource';
import { coordinates, loadMapLocations } from '../services/mapLocations';
import PublicMapCanvas, { type MapPoint } from './PublicMapCanvas';

export default function InteractiveMap() {
  const { data, loading, error, retry } = usePublicResource(loadMapLocations);
  if (loading) return <p role="status">Loading public locations...</p>;
  if (error) return <div role="alert"><p>Public locations are unavailable. Please try again.</p><button className="ui-focus underline" onClick={retry}>Retry locations</button></div>;
  if (!data?.length) return <p role="status">No public locations have been posted yet.</p>;
  const points: MapPoint[] = data.flatMap(item => {
    const position = coordinates(item.google_maps_link);
    return position ? [{ id: item.id, name: item.name, position }] : [];
  });
  const counts = [['With verified coordinates', points.length], ['Coordinates not available', data.length - points.length]] as const;
  return <div className="space-y-6">
    <section aria-labelledby="location-summary" className="rounded-xl border bg-white p-6">
      <h2 id="location-summary" className="text-xl font-bold">Public location coverage</h2>
      <p>{data.length} locations from the municipal tourism directory. Counts describe the listed records, not all destinations in Talibon.</p>
      <table className="mt-4 w-full text-left"><caption className="sr-only">Availability of coordinates in the public directory</caption>
        <thead><tr><th scope="col">Location information</th><th scope="col">Count</th></tr></thead>
        <tbody>{counts.map(([label, count]) => <tr key={label}><th scope="row" className="py-2 font-normal">{label}
          <span aria-hidden="true" className="mt-1 block h-3 rounded bg-brand-primary" style={{ width: `${count / data.length * 100}%` }} /></th><td>{count}</td></tr>)}</tbody>
      </table>
    </section>
    {points.length ? <PublicMapCanvas points={points} /> : <p role="status">Map coordinates are not available for these locations yet. View their published addresses below.</p>}
    <ul aria-label="Public locations" className="grid gap-4 sm:grid-cols-2">{data.map(item => {
      const position = coordinates(item.google_maps_link);
      return <li key={item.id} className="rounded-xl border bg-white p-5">
        <h3 className="font-bold">{item.name}</h3><p>{item.description}</p><p className="mt-2">{item.location}</p>
        {position ? <a className="ui-focus underline" href={`https://www.google.com/maps/dir/?api=1&destination=${position.join(',')}`} target="_blank" rel="noopener noreferrer">Directions to {item.name} (opens a new tab)</a>
          : <p className="text-sm text-slate-600">Coordinates not available.</p>}
      </li>;
    })}</ul>
  </div>;
}
