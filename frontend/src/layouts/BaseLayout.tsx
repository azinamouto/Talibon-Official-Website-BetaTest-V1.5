import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import MunicipalChatbot from '../components/MunicipalChatbot';
import ErrorBoundary from '../components/ErrorBoundary';
import ErrorPage from '../pages/ErrorPage';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { useUI } from '../contexts/UIContext';

export default function BaseLayout() {
  const location = useLocation();
  const { isOffline, notification, dismissNotification, setNavigationOpen } = useUI();
  const isLogin = location.pathname === '/login';
  useEffect(() => { setNavigationOpen(false); }, [location.pathname, setNavigationOpen]);
  return <div className="min-h-screen bg-brand-bg font-sans text-brand-text">
    <a href="#main-content" className="ui-focus sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-control focus:bg-white focus:p-4">Skip to main content</a>
    {!isLogin && <Navbar />}
    {notification && <div className="fixed left-1/2 top-4 z-[150] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2">
      <Alert tone={notification.tone}><div className="flex items-center justify-between gap-4">
        <span>{notification.message}</span>
        <Button variant="secondary" onClick={dismissNotification} aria-label="Dismiss notification">Close</Button>
      </div></Alert>
    </div>}
    <div id="main-content" tabIndex={-1} className={location.pathname === '/' || isLogin ? '' : 'pt-[125px] lg:pt-[142px]'}>
      <ErrorBoundary key={location.pathname} fallback={<ErrorPage />} componentName="Route">
        <Outlet />
      </ErrorBoundary>
    </div>
    <Footer />
    <MunicipalChatbot />
    {isOffline && <div className="fixed bottom-4 right-4 z-50 max-w-sm"><Alert>You're offline. Check your internet connection.</Alert></div>}
  </div>;
}
