import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { PDFDocument, PDFDict, PDFName, PDFArray } from 'pdf-lib';
import { BadRequestException } from '@nestjs/common';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';

export const MAX_MEDIA_BYTES = 2 * 1024 * 1024;
export const checksum = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const types = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf' };
async function validateBytes(filename: string, mime: string, bytes: Buffer) {
  try {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9 _-]{0,100}\.(jpg|jpeg|png|webp|pdf)$/i.test(filename)) throw new Error();
    const ext = filename.split('.').pop().toLowerCase();
    if (types[ext] !== mime || !bytes.length || bytes.length > MAX_MEDIA_BYTES) throw new Error();
    if (ext === 'pdf') {
      if (!bytes.subarray(0, 8).toString().match(/^%PDF-1\.[0-7]/) || !/%%EOF\s*$/.test(bytes.subarray(-1024).toString('latin1'))) throw new Error();
      const pdf = await PDFDocument.load(bytes, { ignoreEncryption: false, throwOnInvalidObject: true, updateMetadata: false });
      if (pdf.isEncrypted || pdf.getPageCount() < 1 || pdf.getPageCount() > 300) throw new Error();
      // Examine parsed objects, including compressed object streams and escaped PDF names.
      const forbidden = new Set(['JS','JavaScript','AA','OpenAction','Launch','EmbeddedFiles','EmbeddedFile','Filespec','RichMedia','XFA','AcroForm','SubmitForm','ImportData','GoToR','URI','Sound','Movie']);
      for (const [, object] of pdf.context.enumerateIndirectObjects()) {
        const visit = (value: unknown, depth = 0) => {
          if (depth > 50) throw new Error();
          if (value instanceof PDFName && forbidden.has(value.decodeText())) throw new Error();
          if (value instanceof PDFDict) for (const [key, child] of value.entries()) { visit(key, depth + 1); visit(child, depth + 1); }
          else if (value instanceof PDFArray) for (const child of value.asArray()) visit(child, depth + 1);
          else if (value && typeof value === 'object' && 'dict' in value) visit(value.dict, depth + 1);
        };
        visit(object);
      }
    } else {
      const image = sharp(bytes, { failOn: 'warning', limitInputPixels: 16000000, animated: true });
      const meta = await image.metadata();
      if (meta.format !== (ext === 'jpg' ? 'jpeg' : ext) || (meta.pages || 1) !== 1) throw new Error();
      await image.raw().toBuffer(); // Full decode, not just magic/header inspection.
    }
    return { kind: ext === 'pdf' ? 'document' as const : 'photo' as const, mime, bytes: bytes.length, sha256: checksum(bytes) };
  } catch { throw new BadRequestException('Use a valid, static JPEG, PNG, WebP or passive PDF up to 2 MiB with a simple filename.'); }
}

// Parsing untrusted compressed documents has a time and JS heap budget, independent
// of the HTTP event loop. Failure, timeout or worker termination never yields ready media.
export async function validateFile(filename: string, mime: string, bytes: Buffer): Promise<{ kind: 'photo' | 'document'; mime: string; bytes: number; sha256: string }> {
  if (mime !== 'application/pdf') return validateBytes(filename,mime,bytes);
  if (bytes.length > MAX_MEDIA_BYTES) throw new BadRequestException('File exceeds 2 MiB.');
  return new Promise((resolve,reject) => {
    const worker = new Worker(__filename,{workerData:{filename,mime,bytes},resourceLimits:{maxOldGenerationSizeMb:96,stackSizeMb:4}});
    const fail = () => reject(new BadRequestException('PDF is invalid, active or exceeds parser limits.'));
    const timer = setTimeout(() => { void worker.terminate(); fail(); },10000);
    worker.once('message',result => { clearTimeout(timer); void worker.terminate(); if (result.ok) resolve(result.value); else fail(); });
    worker.once('error',() => { clearTimeout(timer); fail(); });
    worker.once('exit',code => { clearTimeout(timer); if (code !== 0) fail(); });
  });
}
if (!isMainThread && workerData) {
  void validateBytes(workerData.filename,workerData.mime,Buffer.from(workerData.bytes))
    .then(value => parentPort.postMessage({ok:true,value}),() => parentPort.postMessage({ok:false}));
}
