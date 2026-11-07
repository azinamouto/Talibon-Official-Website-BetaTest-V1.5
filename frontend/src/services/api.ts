import { aboutApi } from './aboutApi';
import { publicGet } from './publicApi';
import type { ContentData } from '../types';

const get = <T>(path: string, signal?: AbortSignal) => publicGet<T>(path, signal);

export { aboutApi };

export const executiveApi = {
  getMandate: () => get<ContentData>('executive/mandate'),
  getVisionMission: () => get<ContentData>('executive/vision-mission'),
  getChart: (signal?: AbortSignal) => get<ContentData>('executive/chart', signal),
  getDirectory: () => get<ContentData>('executive/directory'),
  getGadIms: () => get<ContentData>('executive/gad-ims'),
};

export const legislativeApi = {
  getMandate: () => get<ContentData>('legislative/mandate'),
  getStructure: () => get<ContentData>('legislative/structure'),
  getOrdinances: (signal?: AbortSignal) => get<unknown>('legislative/ordinances', signal),
  getResolutions: (signal?: AbortSignal) => get<unknown>('legislative/resolutions', signal),
};

export const transparencyApi = {
  getCitizenCharter: () => get<ContentData>('transparency/citizen-charter'),
  getFullDisclosure: () => get<ContentData>('transparency/full-disclosure'),
  getInfrastructure: () => get<ContentData>('transparency/infrastructure'),
  getFinanceReports: () => get<ContentData>('transparency/finance-reports'),
  getExecutiveOrders: () => get<ContentData>('transparency/executive-orders'),
  getBudget: () => get<ContentData>('transparency/budget'),
  getBiddings: () => get<ContentData>('transparency/biddings'),
};

export const tourismApi = {
  getSpots: () => get<ContentData[]>('tourism/spots'),
  getFestivities: () => get<ContentData[]>('tourism/festivities'),
  getDelicacies: () => get<ContentData[]>('tourism/delicacies'),
};

export interface DownloadableForm {
  id: string | number;
  title: string;
  url?: string | null;
  file_url?: string | null;
  category?: string | null;
  file_size?: string | null;
}

export const formsApi = {
  getBusinessPermits: () => get<DownloadableForm[]>('forms/business-permits'),
  getBuildingPermits: () => get<DownloadableForm[]>('forms/building-permits'),
  getZoningClearance: () => get<DownloadableForm[]>('forms/zoning-clearance'),
  getDownloadable: async (signal?: AbortSignal): Promise<DownloadableForm[]> => (await formsApi.getDownloadablePage(1,signal)).data,
  getDownloadablePage: async (page: number, signal?: AbortSignal): Promise<{data: DownloadableForm[]; hasMore: boolean}> => {
    const result = await get<{ data: { id: string; title: string; category: string; bytes: number; download_url: string }[]; hasMore: boolean }>(`media?kind=document&page=${page}`, signal);
    return { data: result.data.map(item => ({ id: item.id, title: item.title, category: item.category, file_size: `${item.bytes} bytes`, file_url: item.download_url })), hasMore: result.hasMore };
  },
};
