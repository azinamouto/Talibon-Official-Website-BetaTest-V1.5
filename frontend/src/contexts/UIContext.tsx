import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type NoticeTone = 'info' | 'success' | 'error';
interface UIContextValue {
  isOffline: boolean;
  isNavigationOpen: boolean;
  setNavigationOpen: (open: boolean) => void;
  notification: { message: string; tone: NoticeTone } | null;
  notify: (message: string, tone?: NoticeTone) => void;
  dismissNotification: () => void;
}
const UIContext = createContext<UIContextValue | undefined>(undefined);
export function UIProvider({ children }: { children: ReactNode }) {
  const [isOffline, setOffline] = useState(() => !navigator.onLine);
  const [isNavigationOpen, setNavigationOpen] = useState(false);
  const [notification, setNotification] = useState<UIContextValue['notification']>(null);
  const notify = useCallback((message: string, tone: NoticeTone = 'info') => setNotification({ message, tone }), []);
  const dismissNotification = useCallback(() => setNotification(null), []);
  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => { window.removeEventListener('online', sync); window.removeEventListener('offline', sync); };
  }, []);
  const value = useMemo(() => ({ isOffline, isNavigationOpen, setNavigationOpen, notification, notify, dismissNotification }),
    [isOffline, isNavigationOpen, notification, notify, dismissNotification]);
  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}
export function useUI(): UIContextValue {
  const value = useContext(UIContext);
  if (!value) throw new Error('useUI must be used within a UIProvider');
  return value;
}
