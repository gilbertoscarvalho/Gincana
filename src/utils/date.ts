/**
 * Date and time helper utilities for the Gincana & Tocata app
 * Ensures timezone consistency (America/Bahia / UTC-3) between HTML5 datetime-local input,
 * UTC ISO strings, and Portuguese locale displays across desktop and mobile devices.
 */

const EVENT_TIMEZONE = 'America/Bahia';

/**
 * Converts any ISO date string, date representation, or Date object to the standard `YYYY-MM-DDTHH:mm` format
 * required by `<input type="datetime-local" />`, consistently using the event timezone (Bahia / UTC-3).
 */
export function toDatetimeLocalValue(dateInput?: string | Date | null): string {
  if (!dateInput) return '2026-09-07T08:00';

  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dateInput)) {
    return dateInput;
  }

  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) {
      return '2026-09-07T08:00';
    }

    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: EVENT_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(date);

    const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
    const y = get('year') || '2026';
    const m = get('month') || '09';
    const d = get('day') || '07';
    const h = get('hour') || '08';
    const min = get('minute') || '00';
    return `${y}-${m}-${d}T${h}:${min}`;
  } catch (e) {
    return '2026-09-07T08:00';
  }
}

/**
 * Converts a `YYYY-MM-DDTHH:mm` string from datetime-local input into an ISO string with Bahia/Brasília offset (-03:00).
 */
export function fromDatetimeLocalValue(localDatetimeStr: string): string {
  if (!localDatetimeStr) return new Date('2026-09-07T08:00:00-03:00').toISOString();

  try {
    // If it's already an ISO string with Z or timezone
    if (localDatetimeStr.includes('Z') || /[+-]\d{2}:\d{2}$/.test(localDatetimeStr)) {
      const date = new Date(localDatetimeStr);
      if (!isNaN(date.getTime())) return date.toISOString();
    }

    // Attach Bahia offset (-03:00)
    const withOffset = `${localDatetimeStr}:00-03:00`;
    const date = new Date(withOffset);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }

    const fallbackDate = new Date(localDatetimeStr);
    if (!isNaN(fallbackDate.getTime())) {
      return fallbackDate.toISOString();
    }

    return new Date('2026-09-07T08:00:00-03:00').toISOString();
  } catch (e) {
    return new Date('2026-09-07T08:00:00-03:00').toISOString();
  }
}

/**
 * Formats full event date in Portuguese (e.g. "Segunda-feira, 07 de setembro de 2026") in Bahia timezone.
 */
export function formatEventDateLong(dateInput?: string | Date | null): string {
  if (!dateInput) return 'Segunda-feira, 07 de Setembro de 2026';

  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return 'Segunda-feira, 07 de Setembro de 2026';

    const formatted = new Intl.DateTimeFormat('pt-BR', {
      timeZone: EVENT_TIMEZONE,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: '2-digit'
    }).format(date);

    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  } catch (e) {
    return 'Segunda-feira, 07 de Setembro de 2026';
  }
}

/**
 * Formats event time in Portuguese (e.g. "A partir das 08h00 (Recepção e Abertura)") in Bahia timezone.
 */
export function formatEventTime(dateInput?: string | Date | null): string {
  if (!dateInput) return 'A partir das 08h00 (Recepção e Abertura)';

  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return 'A partir das 08h00 (Recepção e Abertura)';

    const parts = new Intl.DateTimeFormat('pt-BR', {
      timeZone: EVENT_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(date);

    const h = parts.find((p) => p.type === 'hour')?.value || '08';
    const min = parts.find((p) => p.type === 'minute')?.value || '00';
    return `A partir das ${h}h${min} (Recepção e Abertura)`;
  } catch (e) {
    return 'A partir das 08h00 (Recepção e Abertura)';
  }
}

/**
 * Formats short date tag (e.g. "07 de Setembro") in Bahia timezone.
 */
export function formatEventDateShort(dateInput?: string | Date | null): string {
  if (!dateInput) return '07 de Setembro';

  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '07 de Setembro';

    const parts = new Intl.DateTimeFormat('pt-BR', {
      timeZone: EVENT_TIMEZONE,
      day: '2-digit',
      month: 'long'
    }).formatToParts(date);

    const d = parts.find((p) => p.type === 'day')?.value || '07';
    const m = parts.find((p) => p.type === 'month')?.value || 'setembro';
    const monthCap = m.charAt(0).toUpperCase() + m.slice(1);
    return `${d} de ${monthCap}`;
  } catch (e) {
    return '07 de Setembro';
  }
}
