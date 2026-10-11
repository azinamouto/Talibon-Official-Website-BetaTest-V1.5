import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Send, X } from 'lucide-react';
import { useMunicipalChat } from '../hooks/useMunicipalChat';
import { assistantTopics } from '../services/municipalAssistant';

export default function MunicipalChatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const chat = useMunicipalChat();
  const trigger = useRef<HTMLButtonElement>(null), field = useRef<HTMLInputElement>(null);
  const log = useRef<HTMLDivElement>(null);
  useEffect(() => { if (open) field.current?.focus(); }, [open]);
  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [chat.messages, chat.loading, open]);
  const close = () => { setOpen(false); trigger.current?.focus(); };
  async function send(text = input) {
    if (await chat.send(text)) setInput('');
  }
  return <>
    <button ref={trigger} onClick={() => open ? close() : setOpen(true)} aria-expanded={open}
      aria-controls="municipal-assistant" aria-label={open ? 'Close Municipal Assistant Chat' : 'Open Municipal Assistant Chat'}
      className="ui-focus fixed bottom-6 right-6 z-[90] flex items-center gap-2 rounded-full bg-brand-primary p-4 text-white shadow-xl">
      <Bot aria-hidden="true" /> <span className="hidden md:inline">Talibon Assistant</span>
    </button>
    {open && <section id="municipal-assistant" role="dialog" aria-labelledby="assistant-title"
      onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); close(); } }}
      className="fixed bottom-24 right-3 z-[95] flex max-h-[calc(100dvh-7rem)] w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl sm:right-6 sm:w-[420px]">
      <header className="flex items-center justify-between gap-2 bg-brand-text p-4 text-white ">
        <div><h2 id="assistant-title" className="font-bold">Talibon Assistant</h2><p className="text-xs">Prepared answers · Service and website guide</p></div>
        <button className="ui-focus p-2" onClick={close} aria-label="Close Chat"><X aria-hidden="true" /></button>
      </header>
      <p className="px-4 pt-3 text-sm">Ask about municipal services or choose a topic. For current records, follow the official page links. Please do not share sensitive information.</p>
      <div ref={log} role="log" aria-label="Conversation" aria-live="polite" aria-relevant="additions" className="min-h-24 flex-1 space-y-3 overflow-y-auto p-4">
        {chat.messages.map(message => <div key={message.id} className={message.role === 'user' ? 'rounded-xl bg-blue-50 p-3' : 'rounded-xl border p-3'}>
          <p className="text-xs font-bold">{message.role === 'user' ? 'You' : 'Assistant'}</p>
          <p className="whitespace-pre-wrap">{message.text}</p>
          {message.answer && <Link className="ui-focus underline" to={message.answer.route} onClick={close}>{message.answer.actionText}</Link>}
        </div>)}
      </div>
      {chat.loading && <p role="status" className="px-4">Preparing an answer...</p>}
      {chat.error && <p role="alert" className="px-4 text-red-800">{chat.error}</p>}
      <details className="border-t px-4 py-2"><summary className="ui-focus cursor-pointer">Browse all topics ({assistantTopics.length})</summary>
        <div className="mt-2 flex max-h-32 flex-wrap gap-2 overflow-y-auto">
          {assistantTopics.map(topic => <button key={topic.id} disabled={chat.loading || chat.limited} className="ui-focus rounded-lg border px-2 py-1 text-sm disabled:opacity-50" onClick={() => void send(topic.phrases[0])}>{topic.title}</button>)}
        </div>
      </details>
      <form className="flex gap-2 border-t p-3" onSubmit={event => { event.preventDefault(); void send(); }}>
        <label htmlFor="assistant-question" className="sr-only">Your question</label>
        <input id="assistant-question" ref={field} value={input} onChange={event => setInput(event.target.value)}
          onKeyDown={event => { if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault(); }}
          maxLength={2000} readOnly={chat.loading} placeholder="Ask about services, forms, tourism..."
          className="ui-focus min-w-0 flex-1 rounded-lg border p-2" />
        <button type="submit" aria-label="Send query" disabled={!input.trim() || chat.loading || chat.limited} className="ui-focus rounded-lg bg-brand-primary p-2 text-white disabled:opacity-50"><Send aria-hidden="true" /></button>
      </form>
      <footer className="flex justify-between px-4 pb-3 text-sm">
        <button className="ui-focus underline" onClick={() => { chat.reset(); setInput(''); field.current?.focus(); }}>Clear conversation</button>
        <Link className="ui-focus underline" to="/executive/directory" onClick={close}>Municipal directory</Link>
      </footer>
    </section>}
  </>;
}
