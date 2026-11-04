interface FileUploadProps { onUploadComplete: (url: string) => void; label: string; accept?: string; folder?: string; currentValue?: string; bucket?: string; }
/** Legacy editor compatibility. Uploads now require the staff media workflow. */
export default function FileUpload({ label }: FileUploadProps) {
  return <div><p>{label}</p><p>Legacy uploads are retired. Use <a href="/cms" className="underline">Photos and documents</a> in the staff workspace.</p></div>;
}
