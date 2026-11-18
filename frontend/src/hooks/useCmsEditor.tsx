import { useEffect, useState } from 'react';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
export type EditorState = {dirty:boolean;busy:boolean;uncertain?:boolean};
export function useCmsEditor(dirty:boolean,busy:boolean,onStateChange?: (state:EditorState)=>void,uncertain=false) {
  const [pending,setPending]=useState<(()=>void)|null>(null);
  useEffect(()=>{onStateChange?.({dirty,busy,uncertain});},[dirty,busy,uncertain,onStateChange]);
  useEffect(()=>{
    if(!dirty && !busy && !uncertain)return;
    const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};
    window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);
  },[dirty,busy,uncertain]);
  function requestDiscard(action:()=>void) {if(busy)return;if(dirty || uncertain)setPending(()=>action);else action();}
  const dialog=pending && <Modal open title={uncertain?'Leave before confirming publication?':'Discard unsaved changes?'} onClose={()=>setPending(null)}><p className="mb-4">{uncertain?'Publication may have completed. Retry this submission to confirm it before leaving. Leaving will lose the retry information.':'Your changes have not been saved. Uploaded files remain private in the media library.'}</p><div className="flex flex-wrap gap-4"><Button variant="secondary" onClick={()=>setPending(null)}>{uncertain?'Return to publication':'Keep editing'}</Button><Button variant="danger" onClick={()=>{pending();setPending(null);}}>{uncertain?'Leave editor':'Discard changes'}</Button></div></Modal>;
  return {requestDiscard,dialog};
}
