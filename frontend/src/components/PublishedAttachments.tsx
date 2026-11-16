import type { PublicAttachment } from '../services/publicApi';
export default function PublishedAttachments({attachments}: {attachments?:PublicAttachment[]}) {
  if (!attachments?.length) return null;
  return <section className="space-y-4 mt-4" aria-label="Published attachments">{attachments.map(item=><figure key={item.id}>
    {item.kind==='photo' && <img src={item.preview_url} alt={item.alt_text} loading="lazy" className="w-full max-h-96 object-contain rounded-lg" />}
    <figcaption className="py-2"><a className="underline text-brand-primary inline-flex items-center min-h-11 focus-visible:outline" href={item.download_url}>{item.caption || item.title}{item.kind==='document'?' · Download PDF':''}</a></figcaption>
  </figure>)}</section>;
}
