import InteractiveMap from '../components/InteractiveMap';
export default function TourismMapPage() {
  return <main className="mx-auto max-w-7xl space-y-8 px-4 py-12 md:px-8">
    <h1 className="text-3xl font-bold text-brand-text">Interactive Tourism Map</h1>
    <p>Explore locations published in the municipal tourism directory. Only locations with explicit coordinates appear on the map.</p>
    <InteractiveMap />
  </main>;
}
