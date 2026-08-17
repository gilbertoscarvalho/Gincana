/**
 * Date and time helper utilities for the Gincana & Tocata app
 * Ensures timezone consistency between HTML5 datetime-local input, UTC ISO strings, and Brazilian locale displays.
 */

/**
 * Converts any ISO date string or Date object to the standard `YYYY-MM-DDTHH:mm` format
 * required by `<input type="datetime-local" />`, using the local timezone.
 */
export function toDatetimeLocalValue(dateInput?: string | Date | null): string {
  if (!dateInput) return '2026-09-07T08:00';
  
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) {
      // If it is already a YYYY-MM-DDTHH:mm string
      if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(dateInput)) {
        return dateInput.substring(0, 16);
      }
      return '2026-09-07T08:00';
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch (e) {
    return '2026-09-07T08:00';
  }
}

/**
 * Converts a `YYYY-MM-DDTHH:mm` string from datetime-local input into an ISO string.
 */
export function fromDatetimeLocalValue(localDatetimeStr: string): string {
  if (!localDatetimeStr) return new Date('2026-09-07T08:00:00-03:00').toISOString();
  
  try {
    const date = new Date(localDatetimeStr);
    if (isNaN(date.getTime())) {
      return new Date('2026-09-07T08:00:00-03:00').toISOString();
    }
    return date.toISOString();
  } catch (e) {
    return new Date('2026-09-07T08:00:00-03:00').toISOString();
  }
}

/**
 * Formats full event date in Portuguese (e.g. "Segunda-feira, 07 de setembro de 2026")
 */
export function formatEventDateLong(dateInput?: string | Date | null): string {
  if (!dateInput) return 'Segunda-feira, 07 de Setembro de 2026';
  
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return 'Segunda-feira, 07 de Setembro de 2026';

    const formatted = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: '2-digit'
    }).format(date);

    // Capitalize first letter (e.g. "segunda-feira" -> "Segunda-feira")
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  } catch (e) {
    return 'Segunda-feira, 07 de Setembro de 2026';
  }
}

/**
 * Formats event time in Portuguese (e.g. "A partir das 08h00 (Recepção e Abertura)")
 */
export function formatEventTime(dateInput?: string | Date | null): string {
  if (!dateInput) return 'A partir das 08h00 (Recepção e Abertura)';
  
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return 'A partir das 08h00 (Recepção e Abertura)';

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `A partir das ${hours}h${minutes} (Recepção e Abertura)`;
  } catch (e) {
    return 'A partir das 08h00 (Recepção e Abertura)';
  }
}

/**
 * Formats short date tag (e.g. "07 de Setembro")
 */
export function formatEventDateShort(dateInput?: string | Date | null): string {
  if (!dateInput) return '07 de Setembro';
  
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '07 de Setembro';

    const day = String(date.getDate()).padStart(2, '0');
    const month = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(date);
    const monthCap = month.charAt(0).toUpperCase() + month.slice(1);
    return `${day} de ${monthCap}`;
  } catch (e) {
    return '07 de Setembro';
  }
}
