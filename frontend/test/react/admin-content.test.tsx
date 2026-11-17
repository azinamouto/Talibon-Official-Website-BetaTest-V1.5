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
it('announces a dismissible success notification without obscuring controls',()=>{
 const dismiss=vi.fn();const {rerender}=render(<CmsToast message="Fictional draft saved." onDismiss={dismiss}/>);
 expect(screen.getByRole('status')).toHaveTextContent('Fictional draft saved.');
 fireEvent.click(screen.getByRole('button',{name:'Dismiss notification'}));expect(dismiss).toHaveBeenCalledOnce();
 rerender(<CmsToast message="" onDismiss={dismiss}/>);expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
it('saves an attributed advisory draft, privately previews it and publishes its current version',async()=>{
 const request=vi.mocked(staffRequest);let rows:unknown[]=[];
 request.mockImplementation(async(path,body)=>{
  if(path==='/api/admin/content/sources')return {data:[source]};
  if(path.startsWith('/api/admin/media?'))return {data:[],hasMore:false};
  if(body&&path==='/api/admin/content/advisories'){rows=[{id:'item',kind:'advisories',title:'Synthetic advisory',slug:'synthetic-advisory',source_id:'source',publication:'draft',version:3,updated_at:'2026-11-17',body:{summary:'Test summary',content:'Test copy'}}];return {data:rows[0]};}
  return {data:rows,pagination:{totalPages:1}};
 });
 render(<AdminContent role="editor" group="news"/>);
 await waitFor(()=>expect(screen.getByRole('button',{name:'New draft'})).toBeEnabled());
 fireEvent.change(screen.getByLabelText('Content type'),{target:{value:'advisories:'}});
 await waitFor(()=>expect(screen.getByRole('button',{name:'New draft'})).toBeEnabled());
 fireEvent.click(screen.getByRole('button',{name:'New draft'}));
 fireEvent.change(screen.getByLabelText('Headline'),{target:{value:'Synthetic advisory'}});
 expect(screen.queryByLabelText('Public slug')).not.toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('Official material'),{target:{value:'source'}});
 fireEvent.change(screen.getByLabelText('Short description'),{target:{value:'Test summary'}});
 fireEvent.change(screen.getByLabelText('Article content'),{target:{value:'Test copy'}});
 fireEvent.submit(screen.getByLabelText('Headline').closest('form')!);
 await screen.findByText('Draft saved.');
 expect(request).toHaveBeenCalledWith('/api/admin/content/advisories',expect.objectContaining({sourceId:'source',body:expect.objectContaining({content:'Test copy',summary:'Test summary'})}));
 fireEvent.click(await screen.findByRole('button',{name:'Preview'}));
 await screen.findByRole('region',{name:'Private content preview'});
 expect(request).toHaveBeenCalledWith('/api/admin/content/advisories/item/preview');
 fireEvent.click(screen.getByRole('button',{name:'Close preview'}));
 fireEvent.click(screen.getByRole('button',{name:'Publish'}));
 fireEvent.click(await screen.findByRole('button',{name:'Confirm publication'}));
 await waitFor(()=>expect(request).toHaveBeenCalledWith('/api/admin/content/advisories/item/publish',{version:3,media:[]}));
 expect(screen.queryByRole('button',{name:'Delete'})).not.toBeInTheDocument();
});
it('preserves an unsaved draft after a conflict and prevents saving without sources',async()=>{
 const request=vi.mocked(staffRequest);
 request.mockImplementation(async(path,body)=>{if(body)throw Error('This record changed. Refresh it before retrying.');if(path.endsWith('/sources'))return {data:[]};return {data:[],pagination:{totalPages:0},hasMore:false};});
 render(<AdminContent role="editor" group="transparency"/>);
 await waitFor(()=>expect(screen.getByRole('button',{name:'New draft'})).toBeEnabled());fireEvent.click(screen.getByRole('button',{name:'New draft'}));
 expect(screen.getByRole('button',{name:'Save draft'})).toBeDisabled();
 expect(screen.getByText(/administrator must register official source material/)).toBeVisible();
 fireEvent.change(screen.getByLabelText('Document title'),{target:{value:'Unsaved official report'}});fireEvent.submit(screen.getByLabelText('Document title').closest('form')!);
 await screen.findByRole('alert');expect(screen.getByLabelText('Document title')).toHaveValue('Unsaved official report');
});
it('reviews source approvals only after fresh administrator MFA',async()=>{
 const request=vi.mocked(staffRequest);request.mockImplementation(async(path)=>path==='/api/admin/content/sources'?{data:[{...source,approved:false}]}:{});
 render(<AdminSources/>);
 const approve=await screen.findByRole('button',{name:'Approve reviewed source'});expect(approve).toBeDisabled();
 fireEvent.change(screen.getByLabelText('Current authenticator code'),{target:{value:'123456'}});fireEvent.click(approve);
 await waitFor(()=>expect(request).toHaveBeenCalledWith('/api/admin/content/sources/source/approve',{}));
 const paths=request.mock.calls.map(([path])=>path);expect(paths.indexOf('/api/staff-auth/two-factor/verify-totp')).toBeLessThan(paths.indexOf('/api/admin/content/sources/source/approve'));
 expect(screen.getByLabelText('Current authenticator code')).toHaveValue('');
});
it('maps organizational chart validation to the affected input and preserves the draft',async()=>{
 const request=vi.mocked(staffRequest);request.mockImplementation(async(path,body)=>{
  if(path==='/api/admin/content/sources')return {data:[source]};
  if(path==='/api/admin/media/options')return {categories:[],sources:[source]};
  if(body && path.startsWith('/api/admin/content/organizational_chart'))throw new StaffRequestError(400,{'nodes.0.name':'Complete this field.'});
  return {data:[],pagination:{totalPages:0},hasMore:false};
 });
 render(<AdminContent role="editor" group="government"/>);
 await waitFor(()=>expect(screen.getByRole('button',{name:'New draft'})).toBeEnabled());
 fireEvent.change(screen.getByLabelText('Section'),{target:{value:'organizational_chart:executive-chart'}});
 await waitFor(()=>expect(screen.getByRole('button',{name:'New draft'})).toBeEnabled());
 fireEvent.click(screen.getByRole('button',{name:'New draft'}));
 fireEvent.change(screen.getByLabelText('Title'),{target:{value:'Synthetic organization draft'}});
 fireEvent.change(screen.getByLabelText('Official material'),{target:{value:'source'}});
 fireEvent.submit(screen.getByLabelText('Title').closest('form')!);
 await screen.findByRole('alert');
 expect(screen.getByLabelText('Official 1 name')).toHaveAttribute('aria-invalid','true');
 expect(screen.getByRole('alert')).toHaveTextContent('Complete this field.');
 expect(screen.getByRole('alert')).toHaveTextContent('Official 1 name');
 expect(screen.getByRole('alert')).not.toHaveTextContent('nodes.0.name');
 expect(screen.getByLabelText('Title')).toHaveValue('Synthetic organization draft');
});
it('keeps publication errors visible in the dialog and preserves a published revision for retry',async()=>{
 const row={id:'fictional-item',kind:'news',title:'Fictional published news',slug:'fictional-news',source_id:source.id,publication:'published',version:4,updated_at:'2026-11-17',body:{category:'ARTICLE',content:'Fixture content'}};
 const request=vi.mocked(staffRequest);request.mockImplementation(async(path,body)=>{
  if(path.endsWith('/sources'))return {data:[source]};
  if(path.endsWith('/options'))return {categories:[],sources:[source]};
  if(path.startsWith('/api/admin/media?'))return {data:[],hasMore:false};
  if(body && path.endsWith('/update'))throw new StaffRequestError(409);
  return {data:[row],pagination:{totalPages:1}};
 });
 render(<AdminContent role="admin" group="news"/>);
 fireEvent.click(await screen.findByRole('button',{name:'Edit'}));
 fireEvent.change(screen.getByLabelText('Headline'),{target:{value:'Fictional reviewed revision'}});
 fireEvent.click(screen.getByRole('button',{name:'Update'}));
 const dialog=await screen.findByRole('dialog',{name:'Update published content?'});
 fireEvent.click(within(dialog).getByRole('button',{name:'Confirm update'}));
 await waitFor(()=>expect(within(dialog).getByRole('alert')).toHaveTextContent('changed'));
 expect(screen.getByLabelText('Headline')).toHaveValue('Fictional reviewed revision');
 expect(request).toHaveBeenCalledWith('/api/admin/content/news/fictional-item/update',expect.objectContaining({version:4,title:'Fictional reviewed revision',media:[]}));
});
it('shows failed deletion MFA inside the confirmation and never deletes without assurance',async()=>{
 const row={id:'fictional-item',kind:'news',title:'Fictional draft',source_id:source.id,publication:'draft',version:2,updated_at:'2026-11-17',body:{content:'Fixture'}};
 const request=vi.mocked(staffRequest);request.mockImplementation(async(path)=>{
  if(path.endsWith('/sources'))return {data:[source]};
  if(path==='/api/staff-auth/two-factor/verify-totp')throw new StaffRequestError(403);
  return {data:[row],pagination:{totalPages:1}};
 });
 render(<AdminContent role="admin" group="news"/>);
 fireEvent.click(await screen.findByRole('button',{name:'Delete'}));
 const dialog=screen.getByRole('dialog',{name:'Delete content?'});
 fireEvent.change(within(dialog).getByLabelText('Deletion authenticator code'),{target:{value:'123456'}});
 fireEvent.click(within(dialog).getByRole('button',{name:'Confirm deletion'}));
 await waitFor(()=>expect(within(dialog).getByRole('alert')).toBeVisible());
 expect(within(dialog).getByLabelText('Deletion authenticator code')).toHaveValue('');
 expect(request.mock.calls.some(([path])=>path.endsWith('/delete'))).toBe(false);
});
