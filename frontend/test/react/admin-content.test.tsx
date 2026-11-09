import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import AdminContent from '../../src/components/admin/AdminContent';
import { staffRequest } from '../../src/contexts/StaffAuthContext';
vi.mock('../../src/contexts/StaffAuthContext',()=>({staffRequest:vi.fn()}));
afterEach(()=>vi.resetAllMocks());
it('editor saves an attributed advisory draft and publishes the returned version',async()=>{
  const request=vi.mocked(staffRequest);
  let rows:unknown[]=[];
  request.mockImplementation(async(path,body)=>{
    if(path==='/api/admin/media/options') return {sources:[{id:'source',reference:'Synthetic approved source',approved:true}]};
    if(body&&path==='/api/admin/content/news') {rows=[{id:'item',title:'Synthetic advisory',slug:'synthetic-advisory',source_id:'source',publication:'draft',version:1,body:{}}];return {};}
    return {data:rows,pagination:{totalPages:1}};
  });
  render(<AdminContent role="editor"/>);
  await screen.findByRole('option',{name:'Synthetic approved source'});
  await waitFor(()=>expect(screen.getByLabelText('Title or name')).toBeEnabled());
  fireEvent.change(screen.getByLabelText('Title or name'),{target:{value:'Synthetic advisory'}});
  fireEvent.change(screen.getByLabelText('Page address'),{target:{value:'synthetic-advisory'}});
  fireEvent.change(screen.getByLabelText('Source attribution'),{target:{value:'source'}});
  fireEvent.change(screen.getByLabelText('Category'),{target:{value:'ADVISORY'}});
  fireEvent.change(screen.getByLabelText('Content'),{target:{value:'Synthetic text'}});
  fireEvent.click(screen.getByRole('button',{name:'Save draft'}));
  await screen.findByText('Draft saved. Review before publishing.');
  expect(request).toHaveBeenCalledWith('/api/admin/content/news',expect.objectContaining({sourceId:'source',status:'draft',body:expect.objectContaining({category:'ADVISORY',content:'Synthetic text'})}));
  await waitFor(()=>expect(screen.getByRole('button',{name:'Publish'})).toBeEnabled());
  fireEvent.click(screen.getByRole('button',{name:'Publish'}));
  await waitFor(()=>expect(request).toHaveBeenCalledWith('/api/admin/content/news/item/edit',{version:1,status:'published'}));
  expect(screen.queryByRole('button',{name:'Delete'})).not.toBeInTheDocument();
});
it('does not enable saving without an attributed source',async()=>{
  vi.mocked(staffRequest).mockImplementation(async path=>path.endsWith('/options')?{sources:[]}:{data:[],pagination:{totalPages:0}});
  render(<AdminContent role="editor"/>);
  await screen.findByText(/No sources are registered/);
  expect(screen.getByRole('button',{name:'Save draft'})).toBeDisabled();
});
