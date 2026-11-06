import { publicGet } from './publicApi';

export interface EventItem {
  id: string | number;
  name: string;
  date: string;
}

export const eventService = {
  async getEvents(signal?: AbortSignal): Promise<EventItem[]> {
    const events = await publicGet<unknown>('tourism/festivities', signal);
    if (!Array.isArray(events)) throw new Error('Invalid public festivities response.');
    return events.filter((value): value is EventItem => {
      if (!value || typeof value !== 'object') return false;
      const event = value as Record<string, unknown>;
      return (typeof event.id === 'string' || (typeof event.id === 'number' && Number.isFinite(event.id))) &&
        typeof event.name === 'string' && Boolean(event.name.trim()) &&
        typeof event.date === 'string' && Boolean(event.date.trim());
    });
  },
};
