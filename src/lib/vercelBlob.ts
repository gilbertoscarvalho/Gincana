// Helper functions for Vercel Blob storage, backup, restore, media upload and file management

export interface FullBackupData {
  version: number;
  exportedAt: string;
  settings: any;
  participants: any[];
}

export interface VercelBlobItem {
  url: string;
  downloadUrl: string;
  pathname: string;
  size: number;
  uploadedAt: string;
}

/**
 * Upload a file, image, PDF, video, or data URL to Vercel Blob
 */
export async function uploadToVercelBlob(
  fileData: File | Blob | string,
  filename: string,
  customToken?: string
): Promise<{ success: boolean; url?: string; downloadUrl?: string; pathname?: string; error?: string }> {
  try {
    let payloadContent = '';
    let contentType = 'application/octet-stream';

    if (typeof fileData === 'string') {
      payloadContent = fileData;
      if (fileData.startsWith('data:')) {
        const matches = fileData.match(/^data:([^;]+);base64,/);
        if (matches) contentType = matches[1];
      } else {
        contentType = 'text/plain';
      }
    } else if (fileData instanceof File || fileData instanceof Blob) {
      contentType = fileData.type || 'application/octet-stream';
      payloadContent = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(fileData);
      });
    }

    const response = await fetch('/api/blob/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: filename || 'file_' + Date.now(),
        content: payloadContent,
        contentType,
        customToken
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Falha ao enviar arquivo para o Vercel Blob.');
    }

    return {
      success: true,
      url: data.url,
      downloadUrl: data.downloadUrl || data.url,
      pathname: data.pathname
    };
  } catch (err: any) {
    console.error('Vercel Blob Upload error:', err);
    return { success: false, error: err.message || 'Erro ao enviar para o Vercel Blob.' };
  }
}

/**
 * Save full database backup JSON to Vercel Blob
 */
export async function saveBackupToVercelBlob(
  backupData: FullBackupData,
  customToken?: string
): Promise<{ success: boolean; url?: string; message: string }> {
  try {
    const response = await fetch('/api/blob/backup/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ backupData, customToken })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Erro ao salvar backup no Vercel Blob.');
    }

    return {
      success: true,
      url: data.url,
      message: data.message || 'Backup salvo com sucesso no Vercel Blob!'
    };
  } catch (err: any) {
    console.error('Save Vercel Blob backup error:', err);
    return {
      success: false,
      message: err.message || 'Falha ao conectar com o Vercel Blob.'
    };
  }
}

/**
 * Load and restore full database backup JSON from Vercel Blob
 */
export async function loadBackupFromVercelBlob(
  customToken?: string
): Promise<{ success: boolean; backupData?: FullBackupData; message: string }> {
  try {
    const response = await fetch('/api/blob/backup/load', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customToken })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Nenhum backup encontrado no Vercel Blob.');
    }

    return {
      success: true,
      backupData: data.backupData,
      message: data.message || 'Backup carregado do Vercel Blob com sucesso!'
    };
  } catch (err: any) {
    console.error('Load Vercel Blob backup error:', err);
    return {
      success: false,
      message: err.message || 'Erro ao carregar backup do Vercel Blob.'
    };
  }
}

/**
 * List all blobs stored in Vercel Blob container
 */
export async function listVercelBlobs(
  customToken?: string
): Promise<{ success: boolean; blobs: VercelBlobItem[]; error?: string }> {
  try {
    const url = new URL('/api/blob/list', window.location.origin);
    if (customToken) {
      url.searchParams.set('customToken', customToken);
    }

    const response = await fetch(url.toString());
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erro ao listar arquivos do Vercel Blob.');
    }

    return {
      success: true,
      blobs: data.blobs || []
    };
  } catch (err: any) {
    return {
      success: false,
      blobs: [],
      error: err.message || 'Erro ao obter lista do Vercel Blob.'
    };
  }
}

/**
 * Delete a specific file from Vercel Blob by URL
 */
export async function deleteVercelBlob(
  urlToDelete: string,
  customToken?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch('/api/blob/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: urlToDelete, customToken })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Erro ao deletar do Vercel Blob.');
    }

    return {
      success: true,
      message: data.message || 'Arquivo deletado com sucesso do Vercel Blob.'
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Erro ao deletar do Vercel Blob.'
    };
  }
}

/**
 * Trigger local browser download of FullBackupData as JSON file (compatible with PC, Mobile, Tablet, and iOS/Android)
 */
export function downloadLocalJsonBackup(data: FullBackupData, filename = 'gincana_backup_database.json') {
  const jsonStr = JSON.stringify(data, null, 2);

  try {
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.setAttribute('download', filename);
    link.target = '_blank';
    link.style.display = 'none';
    document.body.appendChild(link);

    // Standard click dispatch
    if (typeof link.click === 'function') {
      link.click();
    } else {
      const evt = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
      link.dispatchEvent(evt);
    }

    // Delay cleanup to allow browser time to start the download stream
    setTimeout(() => {
      try {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
        URL.revokeObjectURL(url);
      } catch (e) {}
    }, 2000);
  } catch (err) {
    // Fallback using Data URI
    try {
      const encoded = encodeURIComponent(jsonStr);
      const dataUri = `data:application/json;charset=utf-8,${encoded}`;
      const link = document.createElement('a');
      link.href = dataUri;
      link.download = filename;
      link.setAttribute('download', filename);
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (link.parentNode) link.parentNode.removeChild(link);
      }, 2000);
    } catch (fallbackErr) {
      console.error('Failed to trigger JSON download:', fallbackErr);
    }
  }
}

/**
 * Read local JSON file uploaded via input file element
 */
export function readLocalJsonFile(file: File): Promise<any> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rawStr = reader.result as string;
        if (!rawStr || rawStr.trim() === '') {
          throw new Error('O arquivo JSON selecionado está vazio.');
        }
        // Remove BOM or special invisible characters
        const cleanStr = rawStr.replace(/^\uFEFF/, '').trim();
        const parsed = JSON.parse(cleanStr);
        if (!parsed || (typeof parsed !== 'object' && !Array.isArray(parsed))) {
          throw new Error('Formato JSON inválido.');
        }
        resolve(parsed);
      } catch (err: any) {
        reject(new Error('Não foi possível ler o arquivo JSON selecionado: ' + (err?.message || 'Estrutura inválida.')));
      }
    };
    reader.onerror = () => reject(new Error('Erro ao carregar o arquivo local.'));
    reader.readAsText(file, 'utf-8');
  });
}
