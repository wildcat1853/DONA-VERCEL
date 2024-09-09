import { CalendarEvent, google } from 'calendar-link'

export async function createEventURL(event: CalendarEvent) {
    return google(event)
}