import { ArrowLeft, Eye, Send, X } from 'lucide-react';
import { Button } from '../ui/Button';
import styles from './AdminContent.module.css';

export default function EditorActions({busy,blocked,retrying,onPreview,onCancel}:{busy:boolean;blocked:boolean;retrying:boolean;onPreview():void;onCancel():void}) {
  return <div className={styles.editorActions}>
    <Button type="submit" busy={busy} disabled={blocked}><Send size={18} aria-hidden="true" />{retrying?'Retry publication':'Publish'}</Button>
    <Button type="button" variant="secondary" disabled={busy || blocked} onClick={onPreview}><Eye size={18} aria-hidden="true" />Preview</Button>
    <Button variant="secondary" disabled={busy} onClick={onCancel}><X size={18} aria-hidden="true" />Cancel</Button>
  </div>;
}
export function EditorBack({busy,onBack}:{busy:boolean;onBack():void}) {
  return <Button variant="secondary" disabled={busy} onClick={onBack}><ArrowLeft size={18} aria-hidden="true" />Back to list</Button>;
}
