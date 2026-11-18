import { cleanup, render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import AdminContent from '../../src/components/admin/AdminContent';
import AdminSources from '../../src/components/admin/AdminSources';
import { CmsToast } from '../../src/components/admin/CmsControls';
import { staffRequest } from '../../src/contexts/StaffAuthContext';
import { StaffRequestError } from '../../src/lib/staffErrors';
vi.mock('../../src/contexts/StaffAuthContext',()=>({staffRequest:vi.fn()}));
afterEach(()=>{cleanup();vi.resetAllMocks();});
const source={id:'source',reference:'Synthetic approved source',owner:'Test office',sha256:'a'.repeat(64),approved:true};
const emptyResult={data:[],pagination:{totalPages:0},hasMore:false};
async function newPost() {
 await waitFor(()=>expect(screen.getByRole('button',{name:'New post'})).toBeEnabled());
 fireEvent.click(screen.getByRole('button',{name:'New post'}));
 fireEvent.change(screen.getByLabelText('Title'),{target:{value:'Fictional news'}});
 fireEvent.change(screen.getByLabelText('Description / body'),{target:{value:'Fictional body'}});
}
it('announces a dismissible success notification without obscuring controls',()=>{
 const dismiss=vi.fn();const {rerender}=render(<CmsToast message="Fictional record published." onDismiss={dismiss}/>);
 expect(screen.getByRole('status')).toHaveTextContent('Fictional record published.');
 fireEvent.click(screen.getByRole('button',{name:'Dismiss notification'}));expect(dismiss).toHaveBeenCalledOnce();
 rerender(<CmsToast message="" onDismiss={dismiss}/>);expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
it('previews locally and publishes an advisory once without a draft or mandatory source',async()=>{
 const request=vi.mocked(staffRequest);let rows:unknown[]=[];
 request.mockImplementation(async(path,body)=>{
  if(body && path==='/api/admin/content/advisories/publish'){
   rows=[{id:'item',kind:'advisories',title:'Synthetic advisory',slug:'synthetic-advisory',source_id:null,publication:'published',version:2,published_at:'2026-11-18T06:00:00Z',updated_at:'2026-11-18',body:{summary:'Test copy',content:'Test copy'}}];return {data:rows[0]};
  }
  return {data:rows,pagination:{totalPages:rows.length?1:0},hasMore:false};
 });
 render(<AdminContent role="editor" group="news"/>);
 await waitFor(()=>expect(screen.getByRole('button',{name:'New post'})).toBeEnabled());
 fireEvent.change(screen.getByLabelText('Post type'),{target:{value:'advisories:'}});
 await newPost();fireEvent.change(screen.getByLabelText('Title'),{target:{value:'Synthetic advisory'}});
 fireEvent.change(screen.getByLabelText('Description / body'),{target:{value:'Test copy'}});
 expect(screen.queryByLabelText('Public slug')).not.toBeInTheDocument();
 expect(screen.queryByRole('button',{name:'Save draft'})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Preview'}));await screen.findByRole('region',{name:'Private content preview'});
 expect(request.mock.calls.some(([,body])=>body)).toBe(false);
 fireEvent.click(screen.getByRole('button',{name:'Close preview'}));fireEvent.click(screen.getByRole('button',{name:'Publish'}));
 await screen.findByText('Published successfully.');
 expect(request).toHaveBeenCalledWith('/api/admin/content/advisories/publish',expect.objectContaining({title:'Synthetic advisory',body:{content:'Test copy',attachments:[]},submissionId:expect.any(String),media:[]}));
 expect(request.mock.calls.filter(([,body])=>body)).toHaveLength(1);
 expect(request.mock.calls.some(([path])=>path.endsWith('/sources') || path.endsWith('/options'))).toBe(false);
 expect(screen.getAllByRole('link',{name:'View on website'})[0]).toHaveAttribute('href','/news/view/item');
 expect(screen.queryByRole('button',{name:'Delete'})).not.toBeInTheDocument();
});
it('preserves form data and shows a required PDF error while sources remain optional',async()=>{
 const request=vi.mocked(staffRequest);
 request.mockImplementation(async(_path,body)=>{if(body)throw new StaffRequestError(400,{attachments:'Attach a verified PDF before publishing this record.'});return emptyResult;});
 render(<AdminContent role="editor" group="transparency"/>);
 await waitFor(()=>expect(screen.getByRole('button',{name:'New record'})).toBeEnabled());fireEvent.click(screen.getByRole('button',{name:'New record'}));
 expect(screen.getByRole('button',{name:'Publish'})).toBeEnabled();
 expect(screen.queryByText(/administrator must register official source material/)).not.toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('Document title'),{target:{value:'Unsaved official report'}});
 fireEvent.change(screen.getByLabelText('Description'),{target:{value:'Fictional report description'}});
 fireEvent.submit(screen.getByLabelText('Document title').closest('form')!);
 await screen.findByRole('alert');expect(screen.getByLabelText('Document title')).toHaveValue('Unsaved official report');
 expect(screen.getByRole('alert')).toHaveTextContent('PDF');expect(screen.getByRole('button',{name:'Publish'})).toBeEnabled();
});
it('reviews historical source approvals only after fresh administrator MFA',async()=>{
 const request=vi.mocked(staffRequest);request.mockImplementation(async(path)=>path==='/api/admin/content/sources'?{data:[{...source,approved:false}]}:{});
 render(<AdminSources/>);
 const approve=await screen.findByRole('button',{name:'Approve reviewed source'});expect(approve).toBeDisabled();
 fireEvent.change(screen.getByLabelText('Current authenticator code'),{target:{value:'123456'}});fireEvent.click(approve);
 await waitFor(()=>expect(request).toHaveBeenCalledWith('/api/admin/content/sources/source/approve',{}));
 const paths=request.mock.calls.map(([path])=>path);expect(paths.indexOf('/api/staff-auth/two-factor/verify-totp')).toBeLessThan(paths.indexOf('/api/admin/content/sources/source/approve'));
 expect(screen.getByLabelText('Current authenticator code')).toHaveValue('');
});
it('maps organizational chart validation to the affected input and preserves the form',async()=>{
 const request=vi.mocked(staffRequest);request.mockImplementation(async(_path,body)=>{if(body)throw new StaffRequestError(400,{'nodes.0.name':'Complete this field.'});return emptyResult;});
 render(<AdminContent role="editor" group="chart"/>);
 await waitFor(()=>expect(screen.getByRole('button',{name:'New record'})).toBeEnabled());fireEvent.click(screen.getByRole('button',{name:'New record'}));
 fireEvent.change(screen.getByLabelText('Chart title'),{target:{value:'Synthetic organization'}});
 fireEvent.change(screen.getByLabelText('Official 1 name'),{target:{value:'Fictional official'}});
 fireEvent.change(screen.getByLabelText('Official 1 position'),{target:{value:'Fictional position'}});
 fireEvent.submit(screen.getByLabelText('Chart title').closest('form')!);await screen.findByRole('alert');
 expect(screen.getByLabelText('Official 1 name')).toHaveAttribute('aria-invalid','true');
 expect(screen.getByRole('alert')).toHaveTextContent('Complete this field.');expect(screen.getByRole('alert')).toHaveTextContent('Official 1 name');
 expect(screen.getByRole('alert')).not.toHaveTextContent('nodes.0.name');expect(screen.getByLabelText('Chart title')).toHaveValue('Synthetic organization');
});
it('keeps a version conflict visible in the form and preserves a published revision',async()=>{
 const row={id:'fictional-item',kind:'news',title:'Fictional published news',slug:'fictional-news',source_id:source.id,publication:'published',version:4,updated_at:'2026-11-17',body:{category:'ARTICLE',content:'Fixture content'}};
 const latest={...row,title:'Fictional latest version',version:5};
 const request=vi.mocked(staffRequest);request.mockImplementation(async(path,body)=>{if(body)throw new StaffRequestError(409);return {data:[path.endsWith('/preview')?latest:row],pagination:{totalPages:1}};});
 render(<AdminContent role="admin" group="news"/>);fireEvent.click(await screen.findByRole('button',{name:'Edit'}));
 fireEvent.change(screen.getByLabelText('Title'),{target:{value:'Fictional reviewed revision'}});fireEvent.click(screen.getByRole('button',{name:'Publish'}));
 await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('changed'));expect(screen.getByLabelText('Title')).toHaveValue('Fictional reviewed revision');
 expect(screen.getByRole('button',{name:'Publish'})).toBeEnabled();expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
 expect(request).toHaveBeenCalledWith('/api/admin/content/news/fictional-item/update',expect.objectContaining({version:4,title:'Fictional reviewed revision',media:[],submissionId:expect.any(String)}));
 fireEvent.click(screen.getByRole('button',{name:'Reload record'}));
 const confirmation=await screen.findByRole('dialog',{name:'Discard unsaved changes?'});fireEvent.click(within(confirmation).getByRole('button',{name:'Discard changes'}));
 await waitFor(()=>expect(screen.getByLabelText('Title')).toHaveValue(latest.title));expect(screen.queryByRole('button',{name:'Reload record'})).not.toBeInTheDocument();
 expect(screen.getByText('The existing supporting evidence is retained with this record. Add supporting documents using the attachments above.')).toBeVisible();
 expect(screen.queryByLabelText('Supporting evidence')).not.toBeInTheDocument();
});
it('shows failed deletion MFA inside the confirmation and never deletes without assurance',async()=>{
 const row={id:'fictional-item',kind:'news',title:'Fictional draft',source_id:source.id,publication:'draft',version:2,updated_at:'2026-11-17',body:{content:'Fixture'}};
 const request=vi.mocked(staffRequest);request.mockImplementation(async(path)=>{if(path==='/api/staff-auth/two-factor/verify-totp')throw new StaffRequestError(403);return {data:[row],pagination:{totalPages:1}};});
 render(<AdminContent role="admin" group="news"/>);fireEvent.click(await screen.findByRole('button',{name:'Delete'}));
 const dialog=screen.getByRole('dialog',{name:'Delete content?'});fireEvent.change(within(dialog).getByLabelText('Deletion authenticator code'),{target:{value:'123456'}});
 fireEvent.click(within(dialog).getByRole('button',{name:'Confirm deletion'}));await waitFor(()=>expect(within(dialog).getByRole('alert')).toBeVisible());
 expect(within(dialog).getByLabelText('Deletion authenticator code')).toHaveValue('');expect(request.mock.calls.some(([path])=>path.endsWith('/delete'))).toBe(false);
});
it('offers only attached images for an official portrait and clears the portrait when its photo is removed',async()=>{
 const photoId='11111111-1111-4111-8111-111111111111',pdfId='22222222-2222-4222-8222-222222222222';
 const row={id:'fixture-office',kind:'departments',title:'Fictional office',slug:'fictional-office',source_id:null,publication:'published',version:2,updated_at:'2026-11-18',body:{description:'Fictional department',officials:[{id:'33333333-3333-4333-8333-333333333333',name:'Fictional official',role:'Director',office:'Fictional office'}],attachments:[{assetId:photoId,caption:'Fixture portrait',altText:'White test photo'},{assetId:pdfId,caption:'Fixture PDF',altText:''}]}};
 const request=vi.mocked(staffRequest);request.mockImplementation(async path=>path.startsWith('/api/admin/media/')?{id:path.endsWith(photoId)?photoId:pdfId,kind:path.endsWith(photoId)?'photo':'document',processing:'ready',publication:'published',title:path.endsWith(photoId)?'Fixture portrait':'Fixture PDF',version:2}:{data:[row],pagination:{totalPages:1}});
 render(<AdminContent role="editor" group="government"/>);fireEvent.change(await screen.findByLabelText('Section'),{target:{value:'departments:'}});fireEvent.click(await screen.findByRole('button',{name:'Edit'}));
 const portrait=screen.getByLabelText('Official 1 photo');await waitFor(()=>expect(within(portrait).getByRole('option',{name:'Fixture portrait'})).toBeInTheDocument());
 expect(within(portrait).queryByRole('option',{name:'Fixture PDF'})).not.toBeInTheDocument();fireEvent.change(portrait,{target:{value:photoId}});
 fireEvent.click(within(screen.getByRole('region',{name:'Attached files'})).getAllByRole('button',{name:'Remove file'})[0]);expect(portrait).toHaveValue('');
 expect(within(screen.getByRole('region',{name:'Attached files'})).getByText('Fixture PDF')).toBeInTheDocument();
});
it('reuses the exact submission after an uncertain response and unlocks a definitive validation failure',async()=>{
 const request=vi.mocked(staffRequest);let attempt=0;
 request.mockImplementation(async(_path,body)=>{if(body){attempt++;throw attempt===1?new StaffRequestError(503):new StaffRequestError(400,{content:'Check this field.'});}return emptyResult;});
 render(<AdminContent role="editor" group="news"/>);await newPost();fireEvent.click(screen.getByRole('button',{name:'Publish'}));
 const retry=await screen.findByRole('button',{name:'Retry publication'});expect(screen.getByLabelText('Title')).toBeDisabled();fireEvent.click(retry);
 await waitFor(()=>expect(screen.getByRole('button',{name:'Publish'})).toBeEnabled());expect(screen.getByLabelText('Title')).toBeEnabled();
 const writes=request.mock.calls.filter(([,body])=>body);expect(writes).toHaveLength(2);expect(writes[0]).toEqual(writes[1]);
 expect(screen.getByLabelText('Description / body')).toHaveValue('Fictional body');
});
it('prevents duplicate submissions and recovers success using the original submission identity',async()=>{
 const request=vi.mocked(staffRequest);let rejectFirst:((reason:unknown)=>void)|undefined;
 request.mockImplementation(async(_path,body)=>{
  if(body){if(!rejectFirst)return new Promise((_resolve,reject)=>{rejectFirst=reject;});return {data:{id:'confirmed-item',kind:'news',title:'Fictional news',publication:'published',version:2,slug:'fictional',source_id:null,updated_at:'2026-11-18',body:{content:'Fictional body'}}};}
  return emptyResult;
 });
 render(<AdminContent role="editor" group="news"/>);await newPost();const form=screen.getByLabelText('Title').closest('form')!;
 fireEvent.submit(form);fireEvent.submit(form);await waitFor(()=>expect(request.mock.calls.filter(([,body])=>body)).toHaveLength(1));
 expect(screen.getByRole('button',{name:'Publish'})).toBeDisabled();rejectFirst!(new StaffRequestError(503));
 await screen.findByRole('button',{name:'Retry publication'});fireEvent.click(screen.getByRole('button',{name:'Cancel'}));
 const confirmation=await screen.findByRole('dialog',{name:'Leave before confirming publication?'});expect(confirmation).toHaveTextContent('Publication may have completed');expect(confirmation).not.toHaveTextContent('have not been saved');
 fireEvent.click(within(confirmation).getByRole('button',{name:'Return to publication'}));
 fireEvent.click(screen.getByRole('button',{name:'Retry publication'}));await screen.findByText('Published successfully.');
 const writes=request.mock.calls.filter(([,body])=>body);expect(writes).toHaveLength(2);expect(writes[0]).toEqual(writes[1]);
 expect(screen.getByRole('link',{name:'View on website'})).toHaveAttribute('href','/news/view/confirmed-item');
});
