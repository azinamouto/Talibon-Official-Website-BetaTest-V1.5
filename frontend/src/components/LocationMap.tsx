import PublicMapCanvas from './PublicMapCanvas';
export default function LocationMap({ lat, lng, title }: { lat: number; lng: number; title: string; logoUrl?: string }) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return <p role="status">Location coordinates are unavailable.</p>;
  return <div className="space-y-3">
    <PublicMapCanvas points={[{ id: 'location', name: title, position: [lat, lng] }]} />
    <p>{title}</p>
    <a className="ui-focus underline" href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`} target="_blank" rel="noopener noreferrer">Directions to {title} (opens a new tab)</a>
  </div>;
}
