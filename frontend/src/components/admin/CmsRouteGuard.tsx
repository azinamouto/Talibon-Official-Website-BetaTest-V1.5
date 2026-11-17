import { useBlocker } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
export default function CmsRouteGuard({dirty,busy}:{dirty:boolean;busy:boolean}) {
  const blocker=useBlocker(({currentLocation,nextLocation})=>(dirty || busy) && (currentLocation.pathname!==nextLocation.pathname || currentLocation.search!==nextLocation.search));
  if(blocker.state!=='blocked')return null;
  return <Modal open title={busy?'Please wait for saving':'Discard unsaved changes?'} onClose={()=>blocker.reset()}><p className="mb-4">{busy?'The current operation is still in progress. Keep this editor open until it finishes.':'Your changes have not been saved. Uploaded files remain private in the media library.'}</p><div className="flex flex-wrap gap-4"><Button variant="secondary" onClick={()=>blocker.reset()}>Keep editing</Button><Button variant="danger" disabled={busy} onClick={()=>blocker.proceed()}>Discard changes</Button></div></Modal>;
}
