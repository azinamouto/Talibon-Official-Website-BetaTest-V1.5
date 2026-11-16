import { useEffect, useState } from 'react';
import { staffRequest } from '../../contexts/StaffAuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { ContentSource } from './municipalModules';
import styles from './AdminContent.module.css';
export default function AdminSources() {
  const [sources,setSources]=useState<ContentSource[]>([]),[reference,setReference]=useState(''),[owner,setOwner]=useState(''),[sha256,setSha256]=useState(''),[code,setCode]=useState('');
  const [error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[reload,setReload]=useState(0);
  useEffect(()=>{let current=true;setLoading(true);void staffRequest<{data:ContentSource[]}>('/api/admin/content/sources').then(result=>{if(current)setSources(result.data);}).catch(reason=>{if(current)setError((reason as Error).message);}).finally(()=>{if(current)setLoading(false);});return ()=>{current=false;};},[reload]);
  async function act(work:()=>Promise<void>) {
    const value=code;setCode('');setBusy(true);setError('');setMessage('');
    try{await staffRequest('/api/staff-auth/two-factor/verify-totp',{code:value});await work();setReload(value=>value+1);}
    catch(reason){setError((reason as Error).message);}finally{setBusy(false);}
  }
  return <section className={styles.root} aria-label="Source approvals"><div className={styles.heading}><div><h2>Source approvals</h2><p>Register actual official source material and review it before publication. Existing sources remain intact.</p></div></div>
    {error && <p role="alert" className={styles.error}>{error}</p>}{message && <p role="status" className={styles.notice}>{message}</p>}
    <Input label="Current authenticator code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} disabled={busy} value={code} onChange={event=>setCode(event.target.value)} />
    <form className={styles.form} onSubmit={event=>{event.preventDefault();void act(async()=>{await staffRequest('/api/admin/content/sources',{reference,owner,sha256});setReference('');setOwner('');setSha256('');setMessage('Source registered. Review it before approving.');});}}><h3>Register official source</h3><fieldset disabled={busy} className={styles.fields}>
      <Input label="Source reference (official record or URL)" required maxLength={1000} value={reference} onChange={event=>setReference(event.target.value)} />
      <Input label="Responsible office or custodian" required maxLength={200} value={owner} onChange={event=>setOwner(event.target.value)} />
      <label className={`${styles.field} ${styles.wide}`}>Calculate checksum from the source file<input type="file" onChange={event=>{const file=event.target.files?.[0];if(!file)return;void file.arrayBuffer().then(buffer=>crypto.subtle.digest('SHA-256',buffer)).then(hash=>setSha256(Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,'0')).join(''))).catch(()=>setError('Could not read the source file.'));}} /></label>
      <div className={styles.wide}><Input label="SHA-256 of the original source material" required pattern="[a-f0-9]{64}" minLength={64} maxLength={64} value={sha256} onChange={event=>setSha256(event.target.value)} /></div>
    </fieldset><Button type="submit" disabled={busy||!/^\d{6}$/.test(code)}>Register unapproved source</Button></form>
    {loading?<p role="status">Loading sources…</p>:sources.map(source=><article key={source.id} className={styles.source}><h3>{source.reference}</h3><p>{source.owner} · {source.approved?'Approved':'Awaiting review'}</p><p className={styles.hint}>SHA-256: {source.sha256}</p>{source.reviewed_at && <p className={styles.hint}>Reviewed {new Date(source.reviewed_at).toLocaleString()}</p>}{!source.approved && <Button disabled={busy||!/^\d{6}$/.test(code)} onClick={()=>void act(async()=>{await staffRequest(`/api/admin/content/sources/${source.id}/approve`,{});setMessage('Official source approved.');})}>Approve reviewed source</Button>}</article>)}
  </section>;
}
