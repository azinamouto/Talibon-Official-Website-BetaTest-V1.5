import { fieldMessages, StaffRequestError, staffResponseError } from './staffErrors';
import type { Asset } from '../components/admin/AdminMedia';
export const MAX_MEDIA_BYTES = 2 * 1024 * 1024;
export const mediaTypes: Record<string,string> = {jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',pdf:'application/pdf'};
export type MediaKind = 'photo'|'document';
export type UploadProgress = { stage:'reading'|'uploading'|'verifying'|'publishing'; percent?:number };
export type UploadMetadata = {title:string;description:string;altText:string;categoryId?:string;sourceId?:string;filename:string};
export function fileMime(file: File) { return file.type || mediaTypes[file.name.split('.').pop()!.toLowerCase()] || ''; }
export function fileKind(file: File): MediaKind { return fileMime(file) === 'application/pdf' ? 'document' : 'photo'; }
export function simpleFilename(name: string) {
  const extension = name.split('.').pop()!.toLowerCase();
  const stem = name.slice(0,-extension.length-1).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9 _-]/g,'-').replace(/^[^a-zA-Z0-9]+/,'').trim().slice(0,101);
  return `${stem || 'file'}.${extension}`;
}
export function validateUploadFile(file: File, kind?: MediaKind, filename = simpleFilename(file.name)) {
  const fields: Record<string,string> = {};
  const mime = fileMime(file), ext = filename.split('.').pop()!.toLowerCase();
  if (!file.size || file.size > MAX_MEDIA_BYTES) fields.file = fieldMessages.file_size;
  if (!Object.values(mediaTypes).includes(mime) || mediaTypes[ext] !== mime || (kind && fileKind(file) !== kind)) fields.file = kind === 'photo' ? 'Choose a JPEG, PNG or WebP photo.' : kind === 'document' ? 'Choose a PDF document.' : fieldMessages.file_type;
  if (!/^[a-zA-Z0-9][a-zA-Z0-9 _-]{0,100}\.(jpg|jpeg|png|webp|pdf)$/i.test(filename)) fields.filename = fieldMessages.filename;
  if (Object.keys(fields).length) throw new StaffRequestError(400,fields);
}
export function readBase64(file: File, progress: (value:UploadProgress)=>void): Promise<string> {
  return new Promise((resolve,reject) => {
    const reader = new FileReader();
    progress({stage:'reading',percent:0});
    reader.onprogress = event => progress({stage:'reading',percent:event.lengthComputable ? Math.round(event.loaded/event.total*100) : undefined});
    reader.onload = () => { const encoded = String(reader.result).split(',')[1]; encoded ? resolve(encoded) : reject(new StaffRequestError(400,{file:fieldMessages.base64})); };
    reader.onerror = () => reject(new StaffRequestError(400,{file:fieldMessages.base64}));
    reader.readAsDataURL(file);
  });
}
/** Same-origin authenticated JSON API, with measured transfer progress. The
 * server verifies private storage, fully parses the file and commits readiness. */
export async function uploadPrivateMedia(file: File, metadata: UploadMetadata, uploadId: string, progress: (value:UploadProgress)=>void): Promise<Asset> {
  validateUploadFile(file,undefined,metadata.filename);
  const base64 = await readBase64(file,progress);
  return new Promise((resolve,reject) => {
    const request = new XMLHttpRequest();
    request.open('POST','/api/admin/media/uploads');
    request.withCredentials = true;
    request.timeout = 60000;
    request.setRequestHeader('Content-Type','application/json');
    request.upload.onprogress = event => progress(event.lengthComputable && event.loaded < event.total
      ? {stage:'uploading',percent:Math.round(event.loaded/event.total*100)} : {stage:'verifying'});
    request.upload.onload = () => progress({stage:'verifying'});
    request.onerror = request.ontimeout = () => reject(new StaffRequestError(503));
    request.onload = () => {
      let body: unknown; try { body = JSON.parse(request.responseText); } catch { reject(new StaffRequestError(503)); return; }
      if (request.status < 200 || request.status >= 300) { reject(staffResponseError(request.status,body)); return; }
      const asset = body as Asset;
      if (!asset || typeof asset.id !== 'string' || asset.processing !== 'ready' || !['draft','published'].includes(asset.publication)) { reject(new StaffRequestError(503)); return; }
      resolve(asset);
    };
    progress({stage:'uploading',percent:0});
    request.send(JSON.stringify({...metadata,uploadId,mime:fileMime(file),base64}));
  });
}
