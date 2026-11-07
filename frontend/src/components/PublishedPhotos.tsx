import { useEffect, useState } from 'react';
import { publicGet } from '../services/publicApi';
type Photo = { id: string; title: string; alt_text: string; download_url: string };
export default function PublishedPhotos() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [state, setState] = useState('loading');
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(false);
  useEffect(() => {
    const controller = new AbortController(); setState('loading');
    publicGet<{ data: Photo[]; hasMore: boolean }>(`media?kind=photo&page=${page}`, controller.signal)
      .then(result => { if (controller.signal.aborted) return; setPhotos(result.data); setMore(result.hasMore); setState('ready'); })
      .catch(() => { if (!controller.signal.aborted) setState('error'); });
    return () => controller.abort();
  }, [page]);
  return <section className="mt-12" aria-label="Published photo gallery">
    <h2 className="text-xl font-bold mb-4">Published photos</h2>
    {state === 'loading' ? <p role="status">Loading photos?</p> : state === 'error' ? <p role="alert">Photos are temporarily unavailable.</p> : !photos.length ? <p>No photos are currently published.</p> :
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{photos.map(photo => <figure key={photo.id}>
        <img src={`/api/media/${encodeURIComponent(photo.id)}/preview`} alt={photo.alt_text} loading="lazy" width="600" height="400" className="w-full aspect-[3/2] object-cover rounded-lg" />
        <figcaption className="py-2"><a href={photo.download_url} className="underline focus-visible:outline">{photo.title}</a></figcaption>
      </figure>)}</div>}
    <div className="flex gap-4 mt-4">
      {page > 1 && <button className="min-h-11 underline" onClick={() => setPage(page-1)}>Previous photos</button>}
      {more && state === 'ready' && <button className="min-h-11 underline" onClick={() => setPage(page+1)}>Next photos</button>}
    </div>
  </section>;
}
