import { google } from 'calendar-link';

type CalendarEvent = {
  title: string;
  description?: string;
  start: Date;
  end: Date;
  location?: string;
};

export async function createEventURL(event: CalendarEvent) {
  return google({
    title: event.title,
    description: event.description,
    start: event.start,
    end: event.end,
    location: event.location,
  });
}