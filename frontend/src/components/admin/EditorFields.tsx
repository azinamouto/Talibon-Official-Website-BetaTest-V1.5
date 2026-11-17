import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { Field } from './municipalModules';
import styles from './AdminContent.module.css';

export default function EditorFields({definitions,values,errors,onChange}:{definitions:Field[];values:Record<string,unknown>;errors:Record<string,string>;onChange(value:Record<string,unknown>):void}) {
  return <>{definitions.filter(field=>!field.when || field.when.includes(String(values.category))).map(field=>{
    const id=`cms-field-${field.key}`,change=(value:unknown)=>onChange({...values,[field.key]:value});
    if(field.repeatable) {
      const entries=Array.isArray(values[field.key])?values[field.key] as string[]:[];
      return <section className={styles.wide} key={field.key} aria-label={field.label}><h4>{field.label}</h4>
        {entries.map((entry,index)=><div className={styles.repeatRow} key={index}><Input label={`Highlight ${index+1}`} maxLength={field.max} required value={entry} error={errors[`${field.key}.${index}`]} onChange={event=>change(entries.map((value,i)=>i===index?event.target.value:value))} />
          <Button variant="secondary" title={`Remove highlight ${index+1}`} aria-label={`Remove highlight ${index+1}`} onClick={()=>change(entries.filter((_,i)=>i!==index))}><Trash2 size={18} aria-hidden="true" /></Button></div>)}
        <Button variant="secondary" disabled={entries.length>=30} onClick={()=>change([...entries,''])}><Plus size={18} aria-hidden="true" />Add highlight</Button>
        {errors[field.key] && <p className={styles.fieldError}>{errors[field.key]}</p>}
      </section>;
    }
    const props={id,name:field.key,required:field.required,'aria-invalid':!!errors[field.key],'aria-describedby':errors[field.key]?`${id}-error`:undefined};
    return <div key={field.key} className={`${styles.field} ${field.multiline?styles.wide:''}`}><label htmlFor={id}>{field.label}</label>
      {field.options?<select {...props} value={String(values[field.key] || '')} onChange={event=>change(event.target.value)}><option value="">Choose {field.label.toLowerCase()}</option>{field.options.map(option=><option key={option} value={option}>{field.optionLabels?.[option] || option}</option>)}</select>
        :field.multiline?<textarea {...props} maxLength={field.max} rows={field.key==='content'?12:4} value={String(values[field.key] || '')} onChange={event=>change(event.target.value)} />
        :<input {...props} type={field.type || 'text'} maxLength={field.max || 500} value={String(values[field.key] || '')} onChange={event=>change(event.target.value)} />}
      {errors[field.key] && <span id={`${id}-error`} className={styles.fieldError}>{errors[field.key]}</span>}
    </div>;
  })}</>;
}
