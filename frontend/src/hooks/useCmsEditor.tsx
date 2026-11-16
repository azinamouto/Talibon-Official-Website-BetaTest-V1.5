import { useEffect, useState } from 'react';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
export type EditorState = {dirty:boolean;busy:boolean};
export function useCmsEditor(dirty:boolean,busy:boolean,onStateChange?: (state:EditorState)=>void) {
  const [pending,setPending]=useState<(()=>void)|null>(null);
  useEffect(()=>{onStateChange?.({dirty,busy});},[dirty,busy,onStateChange]);
  useEffect(()=>{
    if(!dirty && !busy)return;
    const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};
    window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);
  },[dirty,busy]);
  function requestDiscard(action:()=>void) {if(busy)return;if(dirty)setPending(()=>action);else action();}
  const dialog=pending && <Modal open title="Discard unsaved changes?" onClose={()=>setPending(null)}><p className="mb-4">Your changes have not been saved. Uploaded files remain private in the media library.</p><div className="flex flex-wrap gap-4"><Button variant="secondary" onClick={()=>setPending(null)}>Keep editing</Button><Button variant="danger" onClick={()=>{pending();setPending(null);}}>Discard changes</Button></div></Modal>;
  return {requestDiscard,dialog};
}
