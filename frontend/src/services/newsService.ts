import { publicGet } from './publicApi';

export interface NewsItem {
  id: string;
  title: string;
  summary?: string | null;
  content?: string | null;
  category?: string | null;
  author?: string | null;
  date: string;
  image_url?: string | null;
}

interface NewsListResponse { data: NewsItem[] }

export const newsService = {
  async getNews(signal?: AbortSignal): Promise<NewsItem[]> {
    const result = await publicGet<NewsListResponse>('news?limit=100', signal);
    if (!Array.isArray(result.data)) throw new Error('Invalid public news response.');
    return result.data;
  },
};
