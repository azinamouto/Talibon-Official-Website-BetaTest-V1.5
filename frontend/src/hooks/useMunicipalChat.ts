import { useEffect, useRef, useState } from 'react';
import { answerMunicipalQuestion, type AssistantAnswer } from '../services/municipalAssistant';
export interface ChatMessage { id: number; role: 'user' | 'assistant'; text: string; answer?: AssistantAnswer }
export function useMunicipalChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retryAt, setRetryAt] = useState(0);
  const generation = useRef(0), nextId = useRef(0), locked = useRef(false);
  const attempts = useRef<number[]>([]);
  useEffect(() => () => { generation.current++; }, []);
  useEffect(() => {
    if (!retryAt) return;
    const timer = window.setTimeout(() => { setRetryAt(0); setError(''); }, Math.max(0, retryAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [retryAt]);
  async function send(value: string) {
    const text = value.trim();
    if (!text || locked.current || retryAt > Date.now()) return false;
    if (text.length > 2000) { setError('Please keep your question within 2,000 characters.'); return false; }
    attempts.current = attempts.current.filter(time => time > Date.now() - 60000);
    if (attempts.current.length >= 10) {
      setRetryAt(attempts.current[0] + 60000);
      setError('Several questions were sent quickly. Please wait up to a minute before sending another.');
      return false;
    }
    attempts.current.push(Date.now());
    const current = generation.current;
    locked.current = true; setLoading(true); setError('');
    setMessages(previous => [...previous.slice(-98), { id: nextId.current++, role: 'user', text }]);
    try {
      const answer = await answerMunicipalQuestion(text);
      if (current === generation.current) setMessages(previous => [...previous, { id: nextId.current++, role: 'assistant', text: answer.text, answer }]);
    } catch {
      if (current === generation.current) setError('The assistant could not prepare an answer. Please try again or use the municipal directory.');
      return false;
    } finally {
      if (current === generation.current) { locked.current = false; setLoading(false); }
    }
    return current === generation.current;
  }
  function reset() { generation.current++; locked.current = false; setMessages([]); setLoading(false); setError(''); }
  return { messages, loading, error, limited: retryAt > 0, send, reset };
}
