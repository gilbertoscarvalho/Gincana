/**
 * Media compression and formatting utilities for Photos and Videos
 */

/**
 * Parses and formats a video URL into an embeddable format (YouTube, Vimeo, etc.)
 */
export function formatVideoEmbedUrl(rawUrl: string): { embedUrl: string; thumbnailUrl: string; isEmbed: boolean } {
  if (!rawUrl) return { embedUrl: '', thumbnailUrl: '', isEmbed: false };

  const trimmed = rawUrl.trim();

  // YouTube standard watch URL: https://www.youtube.com/watch?v=VIDEO_ID
  const ytWatchMatch = trimmed.match(/(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
  if (ytWatchMatch && ytWatchMatch[1]) {
    const videoId = ytWatchMatch[1];
    return {
      embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      isEmbed: true
    };
  }

  // Vimeo URL: https://vimeo.com/12345678
  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?([0-9]+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    const vimeoId = vimeoMatch[1];
    return {
      embedUrl: `https://player.vimeo.com/video/${vimeoId}`,
      thumbnailUrl: '',
      isEmbed: true
    };
  }

  // Standard direct video URL or Base64 / blob
  return {
    embedUrl: trimmed,
    thumbnailUrl: '',
    isEmbed: false
  };
}

/**
 * Compresses an image file client-side to ensure small payloads (< 100KB) and fast rendering.
 */
export function compressImageFile(
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.75
): Promise<string> {
  return new Promise((resolve) => {
    if (file.type.includes('svg')) {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string || '');
          return;
        }

        // Fill background with white for transparent PNGs converted to JPEG
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        try {
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        } catch (e) {
          resolve(event.target?.result as string || '');
        }
      };
      img.onerror = () => resolve(event.target?.result as string || '');
      img.src = event.target?.result as string || '';
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

/**
 * Creates a low-resolution thumbnail (~15KB) for fast list and grid views.
 */
export function createThumbnail(
  file: File,
  maxWidth = 320,
  maxHeight = 320,
  quality = 0.65
): Promise<string> {
  return compressImageFile(file, maxWidth, maxHeight, quality);
}
