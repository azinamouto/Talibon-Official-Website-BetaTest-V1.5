import { render,screen,fireEvent,waitFor,within,cleanup } from '@testing-library/react';
import { beforeEach,afterEach,expect,it,vi } from 'vitest';
import AdminContent from '../../src/components/admin/AdminContent';
import { staffRequest } from '../../src/contexts/StaffAuthContext';
import { uploadPrivateMedia,type UploadProgress } from '../../src/lib/mediaUpload';
import { StaffRequestError,staffResponseError } from '../../src/lib/staffErrors';
import type { Asset } from '../../src/components/admin/AdminMedia';
import AdminMedia from '../../src/components/admin/AdminMedia';
vi.mock('../../src/contexts/StaffAuthContext',()=>({staffRequest:vi.fn()}));
vi.mock('../../src/lib/mediaUpload',async()=>({...await vi.importActual('../../src/lib/mediaUpload'),uploadPrivateMedia:vi.fn()}));
const source={id:'33333333-3333-4333-8333-333333333333',reference:'Synthetic approved source',owner:'Fixture office',sha256:'a'.repeat(64),approved:true,reviewed_at:'2026-11-17'};
const category={id:'22222222-2222-4222-8222-222222222222',title:'Approved photos',kind:'photo',approved:true};
const photo:Asset={id:'11111111-1111-4111-8111-111111111111',title:'Fixture photo',description:'',alt_text:'White test image',category_id:category.id,source_id:source.id,kind:'photo',mime:'image/png',bytes:80,processing:'ready',publication:'draft',version:2};
const pending={...source,id:'44444444-4444-4444-8444-444444444444',reference:'Pending official source',approved:false,reviewed_at:null};
const rejected={...pending,id:'55555555-5555-4555-8555-555555555555',reference:'Rejected source',approval_status:'rejected' as const};
let library:Asset[],rows:unknown[];
beforeEach(()=>{
 library=[];rows=[];
 Object.defineProperty(URL,'createObjectURL',{configurable:true,writable:true,value:vi.fn(()=> 'blob:fixture-preview')});
 Object.defineProperty(URL,'revokeObjectURL',{configurable:true,writable:true,value:vi.fn()});
 Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,value:function(){this.setAttribute('open','');}});
 Object.defineProperty(HTMLDialogElement.prototype,'close',{configurable:true,value:function(){this.removeAttribute('open');}});
 vi.mocked(staffRequest).mockImplementation(async(path,body)=>{
  if(path==='/api/admin/content/sources')return {data:[source,pending,rejected]};
  if(path==='/api/admin/media/options')return {categories:[category,{...category,id:'pending-category',title:'Pending photos',approved:false}],sources:[source,pending,rejected]};
  if(path.startsWith('/api/admin/media?'))return {data:library,hasMore:false};
  if(path===`/api/admin/media/${photo.id}`)return photo;
  if(path.startsWith('/api/admin/content/'))return {data:rows,pagination:{totalPages:rows.length?1:0}};
  return {};
 });
 vi.mocked(uploadPrivateMedia).mockResolvedValue(photo);
});
afterEach(()=>{cleanup();vi.resetAllMocks();vi.unstubAllGlobals();});
async function editor(group:'news'|'galleries'|'transparency'='news') {
 render(<AdminContent role="admin" group={group}/>);
 await waitFor(()=>expect(screen.getByRole('button',{name:'New draft'})).toBeEnabled());
 fireEvent.click(screen.getByRole('button',{name:'New draft'}));
 fireEvent.change(screen.getByLabelText('Title'),{target:{value:'Synthetic draft'}});
 fireEvent.change(screen.getByLabelText('Public slug'),{target:{value:'synthetic-draft'}});
 fireEvent.change(screen.getByLabelText('Source record'),{target:{value:source.id}});
 await waitFor(()=>expect(screen.queryByRole('status',{name:'Loading media library'})).not.toBeInTheDocument());
}
async function queuedPhoto(name='photo.png') {
 fireEvent.change(screen.getByLabelText('Upload files for this draft'),{target:{files:[new File(['fixture image'],name,{type:'image/png'})]}});
 fireEvent.change(screen.getByLabelText('File 1 alternative text'),{target:{value:'White test image'}});
 fireEvent.change(screen.getByLabelText('File 1 category'),{target:{value:category.id}});
}
it('distinguishes approved, pending and rejected sources, and disables unapproved categories',async()=>{
 await editor();
 expect(screen.getByRole('option',{name:/Rejected source/})).toBeDisabled();
 fireEvent.change(screen.getByLabelText('Source record'),{target:{value:pending.id}});
 expect(screen.getByText(/This source can be used for a private draft/)).toBeVisible();
 await queuedPhoto();expect(screen.getByRole('option',{name:/Pending photos/})).toBeDisabled();
 expect(screen.getAllByRole('link',{name:'Open Source approvals'})[0]).toHaveAttribute('href','/cms?tab=sources');
 expect(vi.mocked(staffRequest).mock.calls.some(([path])=>path.endsWith('/approve'))).toBe(false);
});
it('uploads directly, attaches privately, measures progress, and disables the editor during transfer',async()=>{
 let finish:(asset:Asset)=>void;
 vi.mocked(uploadPrivateMedia).mockImplementation((_file,_metadata,_id,progress)=>{progress({stage:'uploading',percent:50});return new Promise(resolve=>{finish=resolve;});});
 await editor();await queuedPhoto('Council photo (1).png');
 expect(screen.getByLabelText('File 1 upload filename')).toHaveValue('Council photo -1-.png');
 fireEvent.click(screen.getByRole('button',{name:'Upload and attach'}));
 await screen.findByRole('progressbar',{name:'File upload progress'});
 expect(screen.getByLabelText('Title')).toBeDisabled();expect(screen.getByRole('button',{name:'Save draft'})).toBeDisabled();
 expect(uploadPrivateMedia).toHaveBeenCalledWith(expect.any(File),expect.objectContaining({sourceId:source.id,categoryId:category.id,filename:'Council photo -1-.png',altText:'White test image'}),expect.any(String),expect.any(Function));
 finish!(photo);await screen.findByText('File uploaded and attached to this draft. Save the draft to keep the attachment. The file remains private.');
 expect(screen.getByLabelText('Attachment 1 caption')).toHaveValue(photo.title);
 expect(screen.getByRole('region',{name:'Attached files'})).toHaveTextContent('Private draft');
 expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
 expect(vi.mocked(staffRequest).mock.calls.some(([path])=>path.endsWith('/publish'))).toBe(false);
});
it('recovers a failed upload using the same identity and immutable original details',async()=>{
 vi.mocked(uploadPrivateMedia).mockRejectedValueOnce(new StaffRequestError(503));
 await editor();await queuedPhoto();fireEvent.click(screen.getByRole('button',{name:'Upload and attach'}));
 await screen.findByRole('button',{name:'Retry upload and attach'});
 expect(screen.getByLabelText('File 1 upload filename')).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Retry upload and attach'}));
 await screen.findByLabelText('Attachment 1 caption');
 const calls=vi.mocked(uploadPrivateMedia).mock.calls;expect(calls).toHaveLength(2);expect(calls[0][2]).toBe(calls[1][2]);expect(calls[0][1]).toEqual(calls[1][1]);
 expect(screen.queryByRole('button',{name:'Retry upload and attach'})).not.toBeInTheDocument();
});
it('preserves uploaded attachments and featured photos after a draft save conflict',async()=>{
 const request=vi.mocked(staffRequest),original=request.getMockImplementation()!;
 request.mockImplementation(async(path,body)=>{if(body && path==='/api/admin/content/news')throw new StaffRequestError(409);return original(path,body);});
 await editor();await queuedPhoto();fireEvent.click(screen.getByRole('button',{name:'Upload and attach'}));await screen.findByLabelText('Attachment 1 caption');
 fireEvent.change(screen.getByLabelText('Featured photo'),{target:{value:photo.id}});
 fireEvent.change(screen.getByLabelText('Summary'),{target:{value:'Fixture summary'}});fireEvent.change(screen.getByLabelText('Article text'),{target:{value:'Fixture content'}});
 fireEvent.submit(screen.getByLabelText('Title').closest('form')!);
 await screen.findByRole('alert');expect(screen.getByLabelText('Featured photo')).toHaveValue(photo.id);expect(screen.getByLabelText('Attachment 1 caption')).toHaveValue(photo.title);
 expect(request).toHaveBeenCalledWith('/api/admin/content/news',expect.objectContaining({body:expect.objectContaining({featuredAssetId:photo.id,attachments:[{assetId:photo.id,caption:photo.title,altText:photo.alt_text}]})}));
});
it('removes an attachment and clears its featured selection without deleting the media file',async()=>{
 library=[photo];await editor();fireEvent.click(screen.getByRole('button',{name:'Attach file'}));
 fireEvent.change(screen.getByLabelText('Featured photo'),{target:{value:photo.id}});
 fireEvent.click(screen.getByRole('button',{name:'Remove file'}));
 expect(screen.getByLabelText('Featured photo')).toHaveValue('');expect(screen.queryByLabelText('Attachment 1 caption')).not.toBeInTheDocument();
 expect(vi.mocked(staffRequest).mock.calls.some(([path])=>path.endsWith('/delete'))).toBe(false);
});
it('keeps queued files visible and prevents saving until they are uploaded or removed',async()=>{
 await editor();await queuedPhoto();
 expect(screen.getByRole('button',{name:'Save draft'})).toBeDisabled();
 fireEvent.submit(screen.getByRole('button',{name:'Save draft'}).closest('form')!);
 expect(await screen.findByText('Upload the queued files or remove them before saving this draft.')).toBeVisible();
 expect(screen.getByLabelText('File 1 title')).toBeInTheDocument();
 expect(vi.mocked(staffRequest).mock.calls.some(([,body])=>typeof body==='object' && body!==null && 'body' in body)).toBe(false);
 fireEvent.click(screen.getByRole('button',{name:'Remove queued file'}));
 await waitFor(()=>expect(screen.getByRole('button',{name:'Save draft'})).toBeEnabled());
});
it('reserves attachment capacity for queued files before offering existing library files',async()=>{
 library=[photo];await editor();
 const libraryAttach=screen.getByRole('button',{name:'Attach file'});
 const files=Array.from({length:50},(_,index)=>new File(['fixture'],`photo-${index}.png`,{type:'image/png'}));
 fireEvent.change(screen.getByLabelText('Upload files for this draft'),{target:{files}});
 expect(document.querySelectorAll('article[aria-label^="Queued file"]')).toHaveLength(50);
 expect(libraryAttach).toBeDisabled();
 const firstCard=document.querySelector<HTMLElement>('article[aria-label="Queued file 1"]')!;
 fireEvent.click(within(firstCard).getByRole('button',{name:'Remove queued file'}));
 expect(libraryAttach).toBeEnabled();
});
it('guards recovery resets, hides another uploader’s recovery, and retains original upload metadata',async()=>{
 const pendingPhoto={...photo,processing:'pending',can_resume:true,upload_id:'77777777-7777-4777-8777-777777777777',original_filename:'reviewed-original.png'};
 library=[pendingPhoto,{...pendingPhoto,id:'88888888-8888-4888-8888-888888888888',title:'Other staff upload',can_resume:false,upload_id:undefined}];
 render(<AdminMedia role="editor" kind="photo" />);
 await waitFor(()=>expect(screen.getByRole('button',{name:'Resume upload'})).toBeEnabled());
 expect(screen.getAllByRole('button',{name:'Resume upload'})).toHaveLength(1);
 fireEvent.change(screen.getByLabelText('Title'),{target:{value:'Unsaved library draft'}});
 fireEvent.click(screen.getByRole('button',{name:'Resume upload'}));
 fireEvent.click(screen.getByRole('button',{name:'Keep editing'}));
 expect(screen.getByLabelText('Title')).toHaveValue('Unsaved library draft');
 fireEvent.click(screen.getByRole('button',{name:'Resume upload'}));
 fireEvent.click(screen.getByRole('button',{name:'Discard changes'}));
 fireEvent.change(screen.getByLabelText('File'),{target:{files:[new File(['fixture image'],'Different local filename (1).png',{type:'image/png'})]}});
 expect(screen.getByLabelText('Upload filename')).toHaveValue('reviewed-original.png');
 expect(screen.getByLabelText('Title')).toHaveAttribute('readonly');
 fireEvent.click(screen.getByRole('button',{name:'Upload private draft'}));
 await waitFor(()=>expect(uploadPrivateMedia).toHaveBeenCalledWith(expect.any(File),expect.objectContaining({filename:'reviewed-original.png',title:photo.title,sourceId:source.id,categoryId:category.id}),pendingPhoto.upload_id,expect.any(Function)));
});
it('warns before discarding or leaving an unsaved editor',async()=>{
 await editor();const unload=new Event('beforeunload',{cancelable:true});expect(window.dispatchEvent(unload)).toBe(false);
 fireEvent.click(screen.getByRole('button',{name:'Close editor'}));const dialog=await screen.findByRole('dialog',{name:'Discard unsaved changes?'});
 fireEvent.click(within(dialog).getByRole('button',{name:'Keep editing'}));expect(screen.getByLabelText('Title')).toHaveValue('Synthetic draft');
 fireEvent.click(screen.getByRole('button',{name:'Close editor'}));fireEvent.click(screen.getByRole('button',{name:'Discard changes'}));expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
});
it('shows a recoverable library failure rather than an empty successful library',async()=>{
 vi.mocked(staffRequest).mockImplementation(async path=>path.endsWith('/sources')?{data:[source]}:path.endsWith('/options')?{categories:[],sources:[source]}:path.startsWith('/api/admin/media?')?Promise.reject(new StaffRequestError(503)):{data:[],pagination:{totalPages:0}});
 render(<AdminContent role="editor" group="galleries"/>);await waitFor(()=>expect(screen.getByRole('button',{name:'New draft'})).toBeEnabled());fireEvent.click(screen.getByRole('button',{name:'New draft'}));
 await screen.findByRole('button',{name:'Retry media library'});expect(screen.queryByText('No ready files found')).not.toBeInTheDocument();
 const path=vi.mocked(staffRequest).mock.calls.find(([path])=>path.startsWith('/api/admin/media?'))![0];const params=new URL(path,'https://local.invalid').searchParams;expect(params.get('ready')).toBe('true');expect(params.get('kind')).toBe('photo');
});
it('keeps response errors sanitized and rejects unknown provider diagnostics',()=>{
 const error=staffResponseError(400,{message:'password=secret',fieldErrors:{categoryId:'category_kind',filename:'filename',sourceId:'password=secret',object_key:'required'}});
 expect(error.fields.categoryId).toMatch(/category matching/);expect(error.fields.filename).toMatch(/filename starting/);expect(JSON.stringify(error.fields)).not.toMatch(/secret|object_key/);
});
it('sends canonical base64 to the authenticated API and reports measured transfer and verification stages',async()=>{
 const actual=await vi.importActual<typeof import('../../src/lib/mediaUpload')>('../../src/lib/mediaUpload');
 let payload:Record<string,unknown>,opened:unknown[],credentials=false;
 class Request {
  upload:{onprogress?:(event:unknown)=>void;onload?:()=>void}={};status=201;responseText=JSON.stringify(photo);withCredentials=false;timeout=0;onload?:()=>void;
  open(...args:unknown[]){opened=args;}setRequestHeader(){}
  send(body:string){payload=JSON.parse(body);credentials=this.withCredentials;this.upload.onprogress?.({lengthComputable:true,loaded:50,total:100});this.upload.onload?.();this.onload?.();}
 }
 vi.stubGlobal('XMLHttpRequest',Request);const stages:UploadProgress[]=[];
 const result=await actual.uploadPrivateMedia(new File(['fixture'],'fixture.png',{type:'image/png'}),{title:'Fixture',description:'',altText:'Fixture image',categoryId:category.id,sourceId:source.id,filename:'fixture.png'},crypto.randomUUID(),progress=>stages.push(progress));
 expect(result.id).toBe(photo.id);expect(opened!).toEqual(['POST','/api/admin/media/uploads']);expect(credentials).toBe(true);expect(payload!.base64).toBe('Zml4dHVyZQ==');expect(payload!.mime).toBe('image/png');expect(stages).toContainEqual({stage:'uploading',percent:50});expect(stages).toContainEqual({stage:'verifying'});
});
