import { Component, useEffect, useState, type ReactNode } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

const icon = L.icon({ iconUrl, shadowUrl, iconSize: [25, 41], iconAnchor: [12, 41] });
export interface MapPoint { id: string; name: string; position: [number, number] }
class MapBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
export default function PublicMapCanvas({ points }: { points: MapPoint[] }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (loaded || failed) return;
    const timer = window.setTimeout(() => setFailed(true), 12000);
    return () => window.clearTimeout(timer);
  }, [loaded, failed, attempt]);
  const fallback = <div role="status" className="rounded-xl border bg-slate-50 p-6">
    <p>The map service is unavailable. Location details and directions are still available below.</p>
    <button className="ui-focus mt-3 underline" onClick={() => { setFailed(false); setLoaded(false); setAttempt(n => n + 1); }}>Retry map</button>
  </div>;
  if (failed) return fallback;
  return <MapBoundary key={attempt} fallback={fallback}>
    <div aria-label="Public locations map" className="relative h-[450px] overflow-hidden rounded-2xl border">
      {!loaded && <p role="status">Loading map...</p>}
      <MapContainer center={points[0]?.position ?? [10.1506, 124.3323]} zoom={13} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          eventHandlers={{ tileerror: () => setFailed(true), tileload: () => setLoaded(true) }} />
        {points.map(point => <Marker key={point.id} position={point.position} icon={icon} title={point.name}>
          <Popup>{point.name}</Popup>
        </Marker>)}
      </MapContainer>
    </div>
  </MapBoundary>;
}
