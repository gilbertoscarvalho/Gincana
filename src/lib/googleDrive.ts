// Helper functions for Google Drive OAuth, Backup and Restore

import firebaseConfig from '../../firebase-applet-config.json';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

declare global {
  interface Window {
    google?: any;
  }
}

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const DRIVE_BACKUP_FILENAME = 'gincana_backup_database.json';

export interface FullBackupData {
  version: number;
  exportedAt: string;
  settings: any;
  participants: any[];
}

/**
 * Trigger OAuth token client for Google Drive access
 */
export async function requestGoogleDriveToken(onSuccess: (token: string) => void, onError: (err: any) => void) {
  try {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    provider.addScope('https://www.googleapis.com/auth/drive');

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (credential?.accessToken) {
      onSuccess(credential.accessToken);
      return;
    }

    throw new Error('Não foi possível obter o token de acesso do Google.');
  } catch (err: any) {
    console.warn('Firebase signInWithPopup failed or cancelled, trying GIS fallback...', err);

    if (firebaseConfig.oAuthClientId && window.google?.accounts?.oauth2) {
      try {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: firebaseConfig.oAuthClientId,
          scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive',
          callback: (response: any) => {
            if (response.error) {
              onError(new Error(response.error_description || response.error || 'Erro na autenticação'));
            } else if (response.access_token) {
              onSuccess(response.access_token);
            }
          },
        });

        tokenClient.requestAccessToken({ prompt: 'consent' });
        return;
      } catch (gisErr: any) {
        console.error('GIS fallback error:', gisErr);
      }
    }

    onError(new Error(err.message || 'Falha ao conectar com o Google Drive.'));
  }
}

/**
 * Upload or update backup file in a specific Google Drive folder
 */
export async function uploadBackupToDriveFolder(
  folderId: string,
  accessToken: string,
  data: FullBackupData
): Promise<{ success: boolean; fileId?: string; message: string }> {
  if (!folderId || !accessToken) {
    return { success: false, message: 'ID da pasta do Google Drive ou token de acesso ausentes.' };
  }

  const cleanFolderId = folderId.trim();
  const jsonContent = JSON.stringify(data, null, 2);

  try {
    // 1. Check if backup file already exists in folder
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q='${cleanFolderId}'+in+parents+and+name='${DRIVE_BACKUP_FILENAME}'+and+trashed=false&fields=files(id,name)`;
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!searchRes.ok) {
      const errData = await searchRes.json().catch(() => ({}));
      throw new Error(errData.error?.message || 'Falha ao buscar pasta no Google Drive.');
    }

    const searchData = await searchRes.json();
    const existingFiles = searchData.files || [];

    if (existingFiles.length > 0) {
      // Update existing file
      const fileId = existingFiles[0].id;
      const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
      const updateRes = await fetch(updateUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: jsonContent,
      });

      if (!updateRes.ok) {
        throw new Error('Erro ao atualizar arquivo no Google Drive.');
      }

      return { success: true, fileId, message: 'Backup atualizado no Google Drive com sucesso!' };
    } else {
      // Create new file with metadata and content using multipart
      const metadata = {
        name: DRIVE_BACKUP_FILENAME,
        mimeType: 'application/json',
        parents: [cleanFolderId],
      };

      const formData = new FormData();
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      formData.append('file', new Blob([jsonContent], { type: 'application/json' }));

      const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id';
      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({}));
        throw new Error(errData.error?.message || 'Erro ao criar arquivo no Google Drive.');
      }

      const resData = await uploadRes.json();
      return { success: true, fileId: resData.id, message: 'Backup criado no Google Drive com sucesso!' };
    }
  } catch (err: any) {
    return { success: false, message: err.message || 'Erro de conexão com o Google Drive.' };
  }
}

/**
 * Upload an individual proof or image file to Google Drive folder
 */
export async function uploadSingleFileToDriveFolder(
  folderId: string,
  accessToken: string,
  fileName: string,
  mimeType: string,
  base64OrBlob: string
): Promise<{ success: boolean; fileId?: string; webViewLink?: string; message: string }> {
  if (!folderId || !accessToken) {
    return { success: false, message: 'ID da pasta ou token ausentes.' };
  }

  try {
    const cleanFolderId = folderId.trim();
    
    // Convert base64 data URL to blob if needed
    let blob: Blob;
    if (base64OrBlob.startsWith('data:')) {
      const parts = base64OrBlob.split(',');
      const byteString = atob(parts[1]);
      const mimeMatch = parts[0].match(/:(.*?);/);
      const type = mimeMatch ? mimeMatch[1] : mimeType;
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      blob = new Blob([ab], { type });
    } else {
      blob = new Blob([base64OrBlob], { type: mimeType });
    }

    const metadata = {
      name: fileName,
      parents: [cleanFolderId],
    };

    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', blob);

    const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink';
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });

    if (!uploadRes.ok) {
      const errData = await uploadRes.json().catch(() => ({}));
      throw new Error(errData.error?.message || 'Erro ao fazer upload para o Google Drive.');
    }

    const resData = await uploadRes.json();
    return {
      success: true,
      fileId: resData.id,
      webViewLink: resData.webViewLink,
      message: 'Arquivo enviado para o Google Drive com sucesso!',
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Erro ao enviar arquivo para o Google Drive.' };
  }
}

/**
 * Search and download backup file content from Google Drive folder
 */
export async function downloadBackupFromDriveFolder(
  folderId: string,
  accessToken: string
): Promise<{ success: boolean; data?: FullBackupData; message: string }> {
  if (!folderId || !accessToken) {
    return { success: false, message: 'ID da pasta do Google Drive ou token de acesso ausentes.' };
  }

  try {
    const cleanFolderId = folderId.trim();
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q='${cleanFolderId}'+in+parents+and+name='${DRIVE_BACKUP_FILENAME}'+and+trashed=false&fields=files(id,name)`;
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!searchRes.ok) {
      throw new Error('Falha ao procurar arquivo no Google Drive.');
    }

    const searchData = await searchRes.json();
    const existingFiles = searchData.files || [];

    if (existingFiles.length === 0) {
      return { success: false, message: `Nenhum arquivo '${DRIVE_BACKUP_FILENAME}' foi encontrado na pasta informada.` };
    }

    const fileId = existingFiles[0].id;
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const downloadRes = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!downloadRes.ok) {
      throw new Error('Erro ao baixar arquivo do Google Drive.');
    }

    const data: FullBackupData = await downloadRes.json();
    return { success: true, data, message: 'Backup baixado do Google Drive com sucesso!' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Erro ao ler do Google Drive.' };
  }
}

/**
 * Local JSON file export (download .json)
 */
export function downloadLocalJsonBackup(data: FullBackupData, fileName = 'backup_gincana_completo.json') {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Read uploaded local JSON backup file
 */
export function readLocalJsonFile(file: File): Promise<FullBackupData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        resolve(parsed);
      } catch (err) {
        reject(new Error('Arquivo JSON inválido. Verifique o conteúdo do arquivo.'));
      }
    };
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo selecionado.'));
    reader.readAsText(file);
  });
}
