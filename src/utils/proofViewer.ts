/**
 * Proof document and PDF viewing/download utilities
 */

/**
 * Checks whether a participant or file represents a PDF document
 */
export function isPdfDocument(
  fileType?: string | null,
  fileName?: string | null,
  fileUrl?: string | null
): boolean {
  if (fileType && (fileType.toLowerCase() === 'pdf' || fileType.toLowerCase().includes('application/pdf'))) {
    return true;
  }
  if (fileName && fileName.toLowerCase().endsWith('.pdf')) {
    return true;
  }
  if (fileUrl) {
    if (fileUrl.startsWith('data:application/pdf')) return true;
    if (fileUrl.toLowerCase().includes('.pdf')) return true;
  }
  return false;
}

/**
 * Converts a data: URI to a native Blob Object URL that browsers and iframes can render safely
 */
export function createBlobUrlFromDataUri(dataUri: string): string | null {
  if (!dataUri || !dataUri.startsWith('data:')) return null;

  try {
    const base64Index = dataUri.indexOf(';base64,');
    if (base64Index === -1) {
      return null;
    }

    const contentType = dataUri.substring(5, base64Index) || 'application/pdf';
    const base64Data = dataUri.substring(base64Index + 8);
    const byteCharacters = atob(base64Data);
    const byteArray = new Uint8Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteArray[i] = byteCharacters.charCodeAt(i);
    }

    const blob = new Blob([byteArray], { type: contentType });
    return URL.createObjectURL(blob);
  } catch (err) {
    console.warn('[ProofViewer] Could not convert data URI to blob:', err);
    return null;
  }
}

/**
 * Returns a displayable URL (converts data: URIs to Blob URLs if needed, or returns the raw HTTP URL)
 */
export function getDisplayableProofUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('data:')) {
    const blobUrl = createBlobUrlFromDataUri(url);
    if (blobUrl) return blobUrl;
  }
  return url;
}

/**
 * Safely opens a proof document (PDF or Image) in a new tab without being blocked by Chrome data URI security policy
 */
export function openProofInNewTab(url?: string | null, fileName = 'comprovante.pdf'): void {
  if (!url) return;

  // If it's a data: URI, convert to Blob URL first
  if (url.startsWith('data:')) {
    const blobUrl = createBlobUrlFromDataUri(url);
    if (blobUrl) {
      const opened = window.open(blobUrl, '_blank');
      if (!opened) {
        // Pop-up blocker fallback: trigger download
        downloadProofFile(url, fileName);
      }
      return;
    }
  }

  // Normal HTTP/HTTPS URL
  const opened = window.open(url, '_blank');
  if (!opened) {
    downloadProofFile(url, fileName);
  }
}

/**
 * Safely triggers download of a proof document
 */
export function downloadProofFile(url?: string | null, fileName = 'comprovante'): void {
  if (!url) return;

  const finalName = fileName || 'comprovante_pagamento.pdf';

  if (url.startsWith('data:')) {
    const blobUrl = createBlobUrlFromDataUri(url);
    if (blobUrl) {
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = finalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
  }

  const link = document.createElement('a');
  link.href = url;
  link.download = finalName;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
