import { ArrowLeft, Eye, Save, Send, X } from 'lucide-react';
import { Button } from '../ui/Button';
import styles from './AdminContent.module.css';

export default function EditorActions({busy,blocked,published,onPreview,onPublish,onCancel}:{busy:boolean;blocked:boolean;published:boolean;onPreview():void;onPublish():void;onCancel():void}) {
  return <div className={styles.editorActions}>
    {!published && <Button type="submit" variant="secondary" busy={busy} disabled={blocked}><Save size={18} aria-hidden="true" />Save draft</Button>}
    <Button variant="secondary" disabled={busy || blocked} onClick={onPreview}><Eye size={18} aria-hidden="true" />Preview</Button>
    <Button disabled={busy || blocked} onClick={onPublish}><Send size={18} aria-hidden="true" />{published?'Update':'Publish'}</Button>
    <Button variant="secondary" disabled={busy} onClick={onCancel}><X size={18} aria-hidden="true" />Cancel</Button>
  </div>;
}
export function EditorBack({busy,onBack}:{busy:boolean;onBack():void}) {
  return <Button variant="secondary" disabled={busy} onClick={onBack}><ArrowLeft size={18} aria-hidden="true" />Back to list</Button>;
}
