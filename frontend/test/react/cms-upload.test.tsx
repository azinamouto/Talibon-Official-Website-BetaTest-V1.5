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
 vi.mocked(staffRequest).mockImplementation(async(path)=>{
  if(path==='/api/admin/content/sources')return {data:[source,pending,rejected,{...source,id:'placeholder',reference:'R2 Qualification source'}]};
  if(path==='/api/admin/media/options')return {categories:[category,{...category,id:'pending-category',title:'Pending photos',approved:false}],sources:[source,pending,rejected]};
  if(path.startsWith('/api/admin/media?'))return {data:library,hasMore:false};
  if(path.startsWith('/api/admin/media/'))return library.find(asset=>path.endsWith('/'+asset.id)) || photo;
  if(path.startsWith('/api/admin/content/'))return {data:rows,pagination:{totalPages:rows.length?1:0}};
  return {};
 });
 vi.mocked(uploadPrivateMedia).mockResolvedValue(photo);
});
afterEach(()=>{cleanup();vi.resetAllMocks();vi.unstubAllGlobals();});
async function editor(group:'news'|'galleries'|'transparency'='news') {
 render(<AdminContent role="admin" group={group}/>);
 await waitFor(()=>expect(screen.getByRole('button',{name:group==='news'?'New post':'New record'})).toBeEnabled());
 fireEvent.click(screen.getByRole('button',{name:group==='news'?'New post':'New record'}));
 fireEvent.change(screen.getByLabelText(group==='news'?'Title':group==='galleries'?'Album title':'Document title'),{target:{value:'Fictional record'}});
 fireEvent.change(screen.getByLabelText(group==='news'?'Description / body':'Description'),{target:{value:'Fictional body'}});
 expect(screen.queryByLabelText('Public slug')).not.toBeInTheDocument();
}
function openDetails(summary:string) {
 const details=screen.getByText(summary,{selector:'summary'}).parentElement as HTMLDetailsElement;
 details.open=true;fireEvent(details,new Event('toggle'));
}
async function openLibrary() {
 openDetails('Choose an existing file');
 await waitFor(()=>expect(screen.queryByRole('status',{name:'Loading media library'})).not.toBeInTheDocument());
}
function choosePhoto(name='photo.png') {
 fireEvent.change(screen.getByLabelText('Choose files'),{target:{files:[new File(['fixture image'],name,{type:'image/png'})]}});
}
it('keeps source selectors, qualification placeholders and approval steps out of ordinary publishing',async()=>{
 await editor();
 expect(vi.mocked(staffRequest).mock.calls.some(([path])=>path.endsWith('/sources') || path.endsWith('/options'))).toBe(false);
 expect(screen.getByRole('button',{name:'Publish'})).toBeEnabled();
 expect(screen.queryByLabelText('Supporting evidence')).not.toBeInTheDocument();
 expect(screen.queryByText('Supporting evidence (optional)')).not.toBeInTheDocument();
 expect(screen.queryByRole('option',{name:/Qualification/})).not.toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Publish'})).toBeEnabled();
 expect(vi.mocked(staffRequest).mock.calls.some(([path])=>path.endsWith('/approve'))).toBe(false);
});
it('uploads selected files automatically, measures progress, and disables publication during transfer',async()=>{
 let finish:(asset:Asset)=>void;
 vi.mocked(uploadPrivateMedia).mockImplementation((_file,_metadata,_id,progress)=>{progress({stage:'uploading',percent:50});return new Promise(resolve=>{finish=resolve;});});
 await editor();choosePhoto('Council photo (1).png');
 await screen.findByRole('progressbar',{name:'File upload progress'});
 expect(screen.getByLabelText('Title')).toBeDisabled();expect(screen.getByRole('button',{name:'Publish'})).toBeDisabled();
 expect(uploadPrivateMedia).toHaveBeenCalledWith(expect.any(File),{title:'Council photo (1)',description:'',filename:'Council photo -1-.png',altText:'Fictional record'},expect.any(String),expect.any(Function));
 finish!(photo);await screen.findByLabelText('Attachment 1 caption');
 expect(screen.getByLabelText('Attachment 1 caption')).toHaveValue(photo.title);
 expect(screen.getByRole('region',{name:'Attached files'})).toHaveTextContent('Ready to publish');
 expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
 expect(vi.mocked(staffRequest).mock.calls.some(([,body])=>body)).toBe(false);
});
it('recovers a failed upload using the same identity and original file details',async()=>{
 vi.mocked(uploadPrivateMedia).mockRejectedValueOnce(new StaffRequestError(503));
 await editor();choosePhoto();fireEvent.click(await screen.findByRole('button',{name:'Retry upload'}));
 await screen.findByLabelText('Attachment 1 caption');
 const calls=vi.mocked(uploadPrivateMedia).mock.calls;expect(calls).toHaveLength(2);expect(calls[0][2]).toBe(calls[1][2]);expect(calls[0][1]).toEqual(calls[1][1]);
 expect(screen.queryByRole('button',{name:'Retry upload'})).not.toBeInTheDocument();
});
it.each([
 ['news','photo.png','image/png'],['galleries','photo.png','image/png'],['transparency','report.pdf','application/pdf'],
] as const)('preserves the %s form and selected file during an unavailable upload service',async(group,filename,mime)=>{
 vi.mocked(uploadPrivateMedia).mockRejectedValueOnce(staffResponseError(503,{message:'private database detail'}));
 await editor(group);
 const file=new File(['fictional local fixture'],filename,{type:mime});
 fireEvent.change(screen.getByLabelText('Choose files'),{target:{files:[file]}});
 const retry=await screen.findByRole('button',{name:'Retry upload'});
 expect(screen.getByLabelText(group==='news'?'Title':group==='galleries'?'Album title':'Document title')).toHaveValue('Fictional record');
 expect(screen.getByLabelText(group==='news'?'Description / body':'Description')).toHaveValue('Fictional body');
 expect(screen.getByRole('article',{name:'Selected file 1'})).toHaveTextContent(filename);
 expect(screen.getByRole('button',{name:'Publish'})).toBeDisabled();
 expect(screen.queryByText(/Upload the file again|private database detail/)).not.toBeInTheDocument();
 fireEvent.click(retry);await screen.findByLabelText('Attachment 1 caption');
 const calls=vi.mocked(uploadPrivateMedia).mock.calls;
 expect(calls).toHaveLength(2);expect(calls[0][0]).toBe(file);expect(calls[1][0]).toBe(file);
 expect(calls[0][1]).toEqual(calls[1][1]);expect(calls[0][2]).toBe(calls[1][2]);
});
it('preserves news and the submission identity when direct publication is unavailable',async()=>{
 const request=vi.mocked(staffRequest),original=request.getMockImplementation()!;
 const submissions:unknown[]=[];
 request.mockImplementation(async(path,body)=>{
  if(path==='/api/admin/content/news/publish') {
   submissions.push(body);throw staffResponseError(503,{message:'private missing schema detail'});
  }
  return original(path,body);
 });
 await editor();fireEvent.click(screen.getByRole('button',{name:'Publish'}));
 const retry=await screen.findByRole('button',{name:'Retry publication'});
 expect(screen.getByLabelText('Title')).toHaveValue('Fictional record');
 expect(screen.getByLabelText('Description / body')).toHaveValue('Fictional body');
 fireEvent.click(retry);await waitFor(()=>expect(submissions).toHaveLength(2));
 expect(submissions[0]).toEqual(submissions[1]);expect(screen.getByLabelText('Title')).toHaveValue('Fictional record');
 expect(screen.queryByText(/private missing schema/)).not.toBeInTheDocument();
});
it('preserves uploaded attachments and cover photos after a publication conflict',async()=>{
 const request=vi.mocked(staffRequest),original=request.getMockImplementation()!;
 request.mockImplementation(async(path,body)=>{if(body && path==='/api/admin/content/news/publish')throw new StaffRequestError(409);return original(path,body);});
 await editor();choosePhoto();await screen.findByLabelText('Attachment 1 caption');
 fireEvent.change(screen.getByLabelText('Cover photo'),{target:{value:photo.id}});fireEvent.submit(screen.getByLabelText('Title').closest('form')!);
 await screen.findByRole('alert');expect(screen.getByLabelText('Cover photo')).toHaveValue(photo.id);expect(screen.getByLabelText('Attachment 1 caption')).toHaveValue(photo.title);
 expect(request).toHaveBeenCalledWith('/api/admin/content/news/publish',expect.objectContaining({media:[{assetId:photo.id,version:photo.version}],body:expect.objectContaining({featuredAssetId:photo.id,attachments:[{assetId:photo.id,caption:photo.title,altText:photo.alt_text}]})}));
});
it('keeps attachments and prevents publishing when metadata returns a different record',async()=>{
 const request=vi.mocked(staffRequest),original=request.getMockImplementation()!;
 await editor();choosePhoto();await screen.findByLabelText('Attachment 1 caption');
 request.mockImplementation(async(path,body)=>path==='/api/admin/media/'+photo.id?{...photo,id:'88888888-8888-4888-8888-888888888888'}:original(path,body));
 await waitFor(()=>expect(screen.getByRole('button',{name:'Publish'})).toBeEnabled());
 fireEvent.click(screen.getByRole('button',{name:'Publish'}));
 await screen.findByRole('alert');
 expect(screen.getByLabelText('Attachment 1 caption')).toHaveValue(photo.title);
 expect(request.mock.calls.some(([path,body])=>body && path.endsWith('/publish'))).toBe(false);
});
it('removes an attachment and clears its cover selection without deleting the private file',async()=>{
 library=[photo];await editor();await openLibrary();fireEvent.click(await screen.findByRole('button',{name:'Attach file'}));
 fireEvent.change(screen.getByLabelText('Cover photo'),{target:{value:photo.id}});fireEvent.click(screen.getByRole('button',{name:'Remove file'}));
 expect(screen.queryByLabelText('Cover photo')).not.toBeInTheDocument();expect(screen.queryByLabelText('Attachment 1 caption')).not.toBeInTheDocument();
 expect(vi.mocked(staffRequest).mock.calls.some(([path])=>path.endsWith('/delete'))).toBe(false);
});
it('supports keyboard and drag ordering without changing attachment identities or cover selection',async()=>{
 const second={...photo,id:'88888888-8888-4888-8888-888888888888',title:'Second fictional photo'};
 library=[photo,second];await editor('galleries');await openLibrary();
 for(const button of await screen.findAllByRole('button',{name:'Attach file'}))fireEvent.click(button);
 fireEvent.change(screen.getByLabelText('Cover photo'),{target:{value:photo.id}});fireEvent.click(screen.getByRole('button',{name:'Move attachment 2 up'}));
 expect(screen.getByLabelText('Attachment 1 caption')).toHaveValue(second.title);expect(screen.getByLabelText('Cover photo')).toHaveValue(photo.id);
 fireEvent.drop(screen.getByLabelText('Attachment 1 caption').closest('article')!,{dataTransfer:{getData:()=>photo.id}});
 expect(screen.getByLabelText('Attachment 1 caption')).toHaveValue(photo.title);expect(screen.getByLabelText('Attachment 2 caption')).toHaveValue(second.title);
 expect(vi.mocked(staffRequest).mock.calls.some(([path])=>path.endsWith('/delete'))).toBe(false);
});
it('keeps failed files visible and blocks publication until they are retried or removed',async()=>{
 vi.mocked(uploadPrivateMedia).mockRejectedValue(new StaffRequestError(503));
 await editor();choosePhoto();await screen.findByRole('button',{name:'Retry upload'});
 expect(screen.getByRole('button',{name:'Publish'})).toBeDisabled();fireEvent.submit(screen.getByLabelText('Title').closest('form')!);
 expect(await screen.findByText('Wait for the files to finish uploading, or retry or remove the failed upload.')).toBeVisible();
 expect(screen.getByRole('article',{name:'Selected file 1'})).toHaveTextContent('photo.png');
 expect(vi.mocked(staffRequest).mock.calls.some(([,body])=>body)).toBe(false);
 fireEvent.click(screen.getByRole('button',{name:'Remove file'}));await waitFor(()=>expect(screen.getByRole('button',{name:'Publish'})).toBeEnabled());
});
it('reserves the 50-file capacity for queued uploads before offering library attachments',async()=>{
 let finish:(asset:Asset)=>void;vi.mocked(uploadPrivateMedia).mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
 library=[{...photo,id:'88888888-8888-4888-8888-888888888888'}];await editor();await openLibrary();const attach=await screen.findByRole('button',{name:'Attach file'});
 const files=Array.from({length:50},(_,index)=>new File(['fixture'],`photo-${index}.png`,{type:'image/png'}));
 fireEvent.change(screen.getByLabelText('Choose files'),{target:{files}});
 expect(document.querySelectorAll('article[aria-label^="Selected file"]')).toHaveLength(50);expect(attach).toBeDisabled();
 await waitFor(()=>expect(uploadPrivateMedia).toHaveBeenCalledOnce());
 const selected=Array.from(document.querySelectorAll<HTMLElement>('article[aria-label^="Selected file"]'));
 expect(within(selected[0]).getByRole('button',{name:'Remove file'})).toBeDisabled();
 for(const queued of selected.slice(1))fireEvent.click(within(queued).getByRole('button',{name:'Remove file'}));
 expect(document.querySelectorAll('article[aria-label^="Selected file"]')).toHaveLength(1);expect(attach).toBeDisabled();
 finish!(photo);await waitFor(()=>expect(attach).toBeEnabled());expect(uploadPrivateMedia).toHaveBeenCalledOnce();
},15000);
it('guards recovery resets, hides another uploader recovery, and retains the original upload metadata',async()=>{
 const pendingPhoto={...photo,processing:'pending',can_resume:true,upload_id:'77777777-7777-4777-8777-777777777777',original_filename:'reviewed-original.png'};
 library=[pendingPhoto,{...pendingPhoto,id:'88888888-8888-4888-8888-888888888888',title:'Other staff upload',can_resume:false,upload_id:undefined}];
 render(<AdminMedia role="editor" kind="photo"/>);await waitFor(()=>expect(screen.getByRole('button',{name:'Resume upload'})).toBeEnabled());
 expect(screen.getAllByRole('button',{name:'Resume upload'})).toHaveLength(1);fireEvent.change(screen.getByLabelText('Title'),{target:{value:'Unsaved library changes'}});
 fireEvent.click(screen.getByRole('button',{name:'Resume upload'}));fireEvent.click(screen.getByRole('button',{name:'Keep editing'}));expect(screen.getByLabelText('Title')).toHaveValue('Unsaved library changes');
 fireEvent.click(screen.getByRole('button',{name:'Resume upload'}));fireEvent.click(screen.getByRole('button',{name:'Discard changes'}));
 fireEvent.change(screen.getByLabelText('File'),{target:{files:[new File(['fixture image'],'Different local filename (1).png',{type:'image/png'})]}});
 expect(screen.getByLabelText('Title')).toHaveAttribute('readonly');expect(screen.queryByLabelText('Upload filename')).not.toBeInTheDocument();
 fireEvent.click(within(screen.getByLabelText('Title').closest('form')!).getByRole('button',{name:'Publish'}));
 await waitFor(()=>expect(uploadPrivateMedia).toHaveBeenCalledWith(expect.any(File),expect.objectContaining({filename:'reviewed-original.png',title:photo.title,sourceId:source.id,categoryId:category.id}),pendingPhoto.upload_id,expect.any(Function)));
});
it('publishes a library photo in one action and recovers an uncertain result without a second file',async()=>{
 const request=vi.mocked(staffRequest),original=request.getMockImplementation()!;let attempts=0;
 const published={...photo,source_id:null,publication:'published',version:3};
 request.mockImplementation(async(path,body)=>{if(path.endsWith('/publish-direct')){if(++attempts===1)throw new StaffRequestError(503);return published;}return original(path,body);});
 vi.mocked(uploadPrivateMedia).mockResolvedValueOnce({...photo,source_id:null}).mockResolvedValueOnce(published);
 render(<AdminMedia role="editor" kind="photo"/>);await waitFor(()=>expect(screen.getByRole('button',{name:'Publish'})).toBeEnabled());
 fireEvent.change(screen.getByLabelText('File'),{target:{files:[new File(['fixture'],'photo.png',{type:'image/png'})]}});
 const form=screen.getByLabelText('Title').closest('form')!;fireEvent.submit(form);fireEvent.submit(form);
 await screen.findByRole('button',{name:'Retry publication'});expect(uploadPrivateMedia).toHaveBeenCalledOnce();expect(screen.getByLabelText('Title')).toHaveAttribute('readonly');
 fireEvent.click(screen.getByRole('button',{name:'Clear form'}));const confirmation=await screen.findByRole('dialog',{name:'Leave before confirming publication?'});
 expect(confirmation).toHaveTextContent('Publication may have completed');fireEvent.click(within(confirmation).getByRole('button',{name:'Return to publication'}));
 fireEvent.click(screen.getByRole('button',{name:'Retry publication'}));await screen.findByText('Published successfully.');
 const uploads=vi.mocked(uploadPrivateMedia).mock.calls;expect(uploads).toHaveLength(2);expect(uploads[0][2]).toBe(uploads[1][2]);expect(uploads[0][1]).toEqual(uploads[1][1]);
 expect(uploads[0][1]).not.toHaveProperty('sourceId');expect(uploads[0][1]).not.toHaveProperty('categoryId');
 expect(request.mock.calls.filter(([path])=>path.endsWith('/publish-direct'))).toEqual([['/api/admin/media/'+photo.id+'/publish-direct',{version:2}],['/api/admin/media/'+photo.id+'/publish-direct',{version:3}]]);
 expect(screen.getByRole('link',{name:'View on website'})).toHaveAttribute('href','/downloads');
});
it('warns before discarding or leaving an unsaved editor',async()=>{
 await editor();const unload=new Event('beforeunload',{cancelable:true});expect(window.dispatchEvent(unload)).toBe(false);
 fireEvent.click(screen.getByRole('button',{name:'Cancel'}));const dialog=await screen.findByRole('dialog',{name:'Discard unsaved changes?'});
 fireEvent.click(within(dialog).getByRole('button',{name:'Keep editing'}));expect(screen.getByLabelText('Title')).toHaveValue('Fictional record');
 fireEvent.click(screen.getByRole('button',{name:'Cancel'}));fireEvent.click(screen.getByRole('button',{name:'Discard changes'}));expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
});
it('shows a recoverable library failure while leaving direct upload available',async()=>{
 vi.mocked(staffRequest).mockImplementation(async path=>path.startsWith('/api/admin/media?')?Promise.reject(new StaffRequestError(503)):{data:[],pagination:{totalPages:0}});
 await editor('galleries');await openLibrary();await screen.findByRole('button',{name:'Retry media library'});
 expect(screen.queryByText('No files found. Upload a file above or clear your search.')).not.toBeInTheDocument();
 expect(screen.getByLabelText('Choose files')).toBeEnabled();
 const path=vi.mocked(staffRequest).mock.calls.find(([path])=>path.startsWith('/api/admin/media?'))![0];const params=new URL(path,'https://local.invalid').searchParams;
 expect(params.get('ready')).toBe('true');expect(params.get('kind')).toBe('photo');
});
it('keeps response errors sanitized and rejects unknown provider diagnostics',()=>{
 const error=staffResponseError(400,{message:'password=secret',fieldErrors:{categoryId:'category_kind',filename:'filename',sourceId:'password=secret',object_key:'required'}});
 expect(error.fields.categoryId).toMatch(/category matching/);expect(error.fields.filename).toMatch(/filename starting/);expect(JSON.stringify(error.fields)).not.toMatch(/secret|object_key/);
});
it('sends canonical base64 to the authenticated API and reports transfer and verification stages',async()=>{
 const actual=await vi.importActual<typeof import('../../src/lib/mediaUpload')>('../../src/lib/mediaUpload');
 let payload:Record<string,unknown>,opened:unknown[],credentials=false,publication='draft';
 class Request {
  upload:{onprogress?:(event:unknown)=>void;onload?:()=>void}={};status=201;responseText=JSON.stringify({...photo,publication});withCredentials=false;timeout=0;onload?:()=>void;
  open(...args:unknown[]){opened=args;}setRequestHeader(){}
  send(body:string){payload=JSON.parse(body);credentials=this.withCredentials;this.upload.onprogress?.({lengthComputable:true,loaded:50,total:100});this.upload.onload?.();this.onload?.();}
 }
 vi.stubGlobal('XMLHttpRequest',Request);const stages:UploadProgress[]=[];
 const result=await actual.uploadPrivateMedia(new File(['fixture'],'fixture.png',{type:'image/png'}),{title:'Fixture',description:'',altText:'Fixture image',filename:'fixture.png'},crypto.randomUUID(),progress=>stages.push(progress));
 expect(result.id).toBe(photo.id);expect(opened!).toEqual(['POST','/api/admin/media/uploads']);expect(credentials).toBe(true);expect(payload!.base64).toBe('Zml4dHVyZQ==');expect(payload!.mime).toBe('image/png');
 expect(payload!).not.toHaveProperty('categoryId');expect(payload!).not.toHaveProperty('sourceId');expect(stages).toContainEqual({stage:'uploading',percent:50});expect(stages).toContainEqual({stage:'verifying'});
 publication='published';const recovered=await actual.uploadPrivateMedia(new File(['fixture'],'fixture.png',{type:'image/png'}),{title:'Fixture',description:'',altText:'Fixture image',filename:'fixture.png'},crypto.randomUUID(),()=>{});expect(recovered.publication).toBe('published');
});
