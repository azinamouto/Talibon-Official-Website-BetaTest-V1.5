import { createContext, useContext, type ReactNode } from 'react';

export interface AppConfig {
  readonly appName: string;
  readonly environment: string;
}
const defaultConfig: AppConfig = Object.freeze({ appName: 'TAL.GOV', environment: import.meta.env.MODE });
const AppConfigContext = createContext<AppConfig | undefined>(undefined);
export function AppConfigProvider({ children, config = defaultConfig }: { children: ReactNode; config?: AppConfig }) {
  return <AppConfigContext.Provider value={config}>{children}</AppConfigContext.Provider>;
}
export function useAppConfig(): AppConfig {
  const config = useContext(AppConfigContext);
  if (!config) throw new Error('useAppConfig must be used within an AppConfigProvider');
  return config;
}
