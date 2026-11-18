import { useBlocker } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { EditorState } from '../../hooks/useCmsEditor';
export default function CmsRouteGuard({dirty,busy,uncertain=false}:EditorState) {
  const blocker=useBlocker(({currentLocation,nextLocation})=>(dirty || busy || uncertain) && (currentLocation.pathname!==nextLocation.pathname || currentLocation.search!==nextLocation.search));
  if(blocker.state!=='blocked')return null;
  return <Modal open title={busy?'Please wait':uncertain?'Leave before confirming publication?':'Discard unsaved changes?'} onClose={()=>blocker.reset()}><p className="mb-4">{busy?'The current operation is still in progress. Keep this editor open until it finishes.':uncertain?'Publication may have completed. Retry this submission to confirm it before leaving. Leaving will lose the retry information.':'Your changes have not been saved. Uploaded files remain private in the media library.'}</p><div className="flex flex-wrap gap-4"><Button variant="secondary" onClick={()=>blocker.reset()}>{uncertain && !busy?'Return to publication':'Keep editing'}</Button><Button variant="danger" disabled={busy} onClick={()=>blocker.proceed()}>{uncertain?'Leave editor':'Discard changes'}</Button></div></Modal>;
}
