/**
 * Media compression and formatting utilities for Photos and Videos
 */

export interface FormattedMediaResult {
  url: string;
  thumbnailUrl: string;
  type: 'photo' | 'video';
  isEmbed: boolean;
  provider: 'google-drive' | 'youtube' | 'vimeo' | 'dropbox' | 'imgur' | 'imgbb' | 'postimages' | 'direct' | 'base64';
  driveId?: string;
  isFolder?: boolean;
}

/**
 * Parses and formats any media URL (Google Drive folder/file, YouTube, Vimeo, Dropbox, Imgur, ImgBB, Postimages, Direct URL)
 */
export function formatMediaUrl(rawUrl: string, userType: 'photo' | 'video' = 'photo'): FormattedMediaResult {
  if (!rawUrl) {
    return { url: '', thumbnailUrl: '', type: userType, isEmbed: false, provider: 'direct' };
  }

  const trimmed = rawUrl.trim();

  // 1. YouTube standard & shorts: https://www.youtube.com/watch?v=ID or youtu.be/ID
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return {
      url: `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      type: 'video',
      isEmbed: true,
      provider: 'youtube'
    };
  }

  // 2. Vimeo URL: https://vimeo.com/12345678
  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?([0-9]+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    const vimeoId = vimeoMatch[1];
    return {
      url: `https://player.vimeo.com/video/${vimeoId}`,
      thumbnailUrl: '',
      type: 'video',
      isEmbed: true,
      provider: 'vimeo'
    };
  }

  // 3. Google Drive Folder Album (e.g. https://drive.google.com/drive/u/0/folders/1OgmzxYTxAKZJ62ZPcAQoTQi2GsdKrscl)
  const gFolderMatch = trimmed.match(/drive\.google\.com\/(?:drive\/)?(?:u\/\d+\/)?folders\/([a-zA-Z0-9_-]{20,})/);
  if (gFolderMatch && gFolderMatch[1]) {
    const folderId = gFolderMatch[1];
    return {
      url: `https://drive.google.com/drive/folders/${folderId}`,
      thumbnailUrl: `https://drive.google.com/embeddedfolderview?id=${folderId}#grid`,
      type: userType,
      isEmbed: true,
      provider: 'google-drive',
      driveId: folderId,
      isFolder: true
    };
  }

  // 4. Google Drive Individual File (Photo, Video or Document)
  // Handles:
  // - https://drive.google.com/file/d/FILE_ID/view
  // - https://drive.google.com/open?id=FILE_ID
  // - https://drive.google.com/uc?id=FILE_ID
  // - https://lh3.googleusercontent.com/d/FILE_ID
  const gDriveMatch = trimmed.match(/(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=view&)?id=)|lh3\.googleusercontent\.com\/d\/)([a-zA-Z0-9_-]{20,})/);
  if (gDriveMatch && gDriveMatch[1]) {
    const fileId = gDriveMatch[1];
    if (userType === 'video' || trimmed.includes('video') || trimmed.includes('/preview')) {
      return {
        url: `https://drive.google.com/file/d/${fileId}/preview`,
        thumbnailUrl: `https://lh3.googleusercontent.com/d/${fileId}`,
        type: 'video',
        isEmbed: true,
        provider: 'google-drive',
        driveId: fileId
      };
    } else {
      // Direct high-resolution Google thumbnail & CDN (works seamlessly for public Drive images)
      return {
        url: `https://lh3.googleusercontent.com/d/${fileId}`,
        thumbnailUrl: `https://lh3.googleusercontent.com/d/${fileId}`,
        type: 'photo',
        isEmbed: false,
        provider: 'google-drive',
        driveId: fileId
      };
    }
  }

  // 5. ImgBB (direct image or page)
  if (trimmed.includes('i.ibb.co/') || trimmed.includes('ibb.co/')) {
    return {
      url: trimmed,
      thumbnailUrl: trimmed,
      type: 'photo',
      isEmbed: false,
      provider: 'imgbb'
    };
  }

  // 6. Postimages
  if (trimmed.includes('postimg.cc/') || trimmed.includes('i.postimg.cc/')) {
    return {
      url: trimmed,
      thumbnailUrl: trimmed,
      type: 'photo',
      isEmbed: false,
      provider: 'postimages'
    };
  }

  // 7. Dropbox (Convert view link to direct raw link)
  if (trimmed.includes('dropbox.com/')) {
    let directUrl = trimmed.replace(/\?dl=0/, '?raw=1');
    if (!directUrl.includes('raw=1')) {
      directUrl += directUrl.includes('?') ? '&raw=1' : '?raw=1';
    }
    return {
      url: directUrl,
      thumbnailUrl: directUrl,
      type: userType,
      isEmbed: false,
      provider: 'dropbox'
    };
  }

  // 8. Imgur (Convert page link to direct image link)
  const imgurMatch = trimmed.match(/imgur\.com\/([a-zA-Z0-9]+)(?:\.[a-z]+)?$/);
  if (imgurMatch && imgurMatch[1] && !trimmed.includes('/a/') && !trimmed.includes('/gallery/')) {
    const id = imgurMatch[1];
    return {
      url: `https://i.imgur.com/${id}.jpg`,
      thumbnailUrl: `https://i.imgur.com/${id}m.jpg`,
      type: 'photo',
      isEmbed: false,
      provider: 'imgur'
    };
  }

  // 9. Direct video formats
  const isVideoExt = /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(trimmed);
  const detectedType = userType === 'video' || isVideoExt ? 'video' : 'photo';

  return {
    url: trimmed,
    thumbnailUrl: detectedType === 'photo' ? trimmed : '',
    type: detectedType,
    isEmbed: false,
    provider: trimmed.startsWith('data:') ? 'base64' : 'direct'
  };
}

/**
 * Parses and formats a video URL into an embeddable format (YouTube, Vimeo, Google Drive, etc.)
 */
export function formatVideoEmbedUrl(rawUrl: string): { embedUrl: string; thumbnailUrl: string; isEmbed: boolean } {
  const result = formatMediaUrl(rawUrl, 'video');
  return {
    embedUrl: result.url,
    thumbnailUrl: result.thumbnailUrl,
    isEmbed: result.isEmbed
  };
}

/**
 * Parses and formats an audio / hymn URL (Google Drive, Dropbox, direct MP3 link) into a streamable URL
 */
export function formatAudioUrl(rawUrl: string): string {
  if (!rawUrl) return '/uploads/audio/Se_vos_baterdes_Ele_vos_abre.mp3';
  const trimmed = rawUrl.trim();

  // If local audio path without leading slash
  if (trimmed.startsWith('uploads/')) {
    return '/' + trimmed;
  }
  if (trimmed.startsWith('audio/')) {
    return '/' + trimmed;
  }
  if (trimmed.includes('Se_vos_baterdes') && !trimmed.startsWith('http') && !trimmed.startsWith('/')) {
    return '/uploads/audio/' + trimmed;
  }

  // If already base64, blob URL, or local upload path or proxy
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('/uploads/') ||
    trimmed.startsWith('/audio/') ||
    trimmed.startsWith('/api/audio') ||
    trimmed.startsWith('/api/audio-proxy') ||
    trimmed.startsWith('/audio-proxy')
  ) {
    return trimmed;
  }

  // Google Drive: extract file ID from any Google Drive link variation
  const gDriveMatch = trimmed.match(/(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:[^"'\s]*&)?id=)|docs\.google\.com\/(?:file\/d\/)|drive\.usercontent\.google\.com\/download\?(?:[^"'\s]*&)?id=)([a-zA-Z0-9_-]{20,})/);
  if (gDriveMatch && gDriveMatch[1]) {
    const fileId = gDriveMatch[1];
    return `/api/audio-proxy?driveId=${fileId}`;
  }

  // If raw Google Drive ID was entered directly (e.g. 1efHm1MUbsNt_QOH-Zw4zWjgUWFJ6m2Gs)
  if (/^[a-zA-Z0-9_-]{25,}$/.test(trimmed) && !trimmed.includes('/') && !trimmed.includes('.')) {
    return `/api/audio-proxy?driveId=${trimmed}`;
  }

  // Dropbox: convert ?dl=0 to ?raw=1
  if (trimmed.includes('dropbox.com/')) {
    let directUrl = trimmed.replace(/\?dl=0/, '?raw=1');
    if (!directUrl.includes('raw=1')) {
      directUrl += directUrl.includes('?') ? '&raw=1' : '?raw=1';
    }
    return directUrl;
  }

  // If it is an external HTTP/HTTPS MP3 or audio stream, stream via proxy to avoid CORS issues if needed
  return trimmed;
}

/**
 * Compresses an image file client-side to ensure small payloads (< 80KB) and fast rendering.
 */
export function compressImageFile(
  file: File,
  maxWidth = 1000,
  maxHeight = 1000,
  quality = 0.68
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

        // Fill background with neutral dark for transparent PNGs converted to JPEG
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
 * Creates a low-resolution thumbnail (~8KB) for fast list and grid views.
 */
export function createThumbnail(
  file: File,
  maxWidth = 260,
  maxHeight = 260,
  quality = 0.52
): Promise<string> {
  return compressImageFile(file, maxWidth, maxHeight, quality);
}
