import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  DollarSign,
  Target,
  Key,
  Calendar,
  MapPin,
  Save,
  Lock,
  CheckCircle2,
  AlertCircle,
  Church,
  Plus,
  X,
  RotateCcw,
  Image as ImageIcon,
  Upload,
  Globe,
  Trash2,
  Film,
  Phone,
  MessageCircle,
  Download,
  Trophy,
  Sparkles,
  Edit3,
  Check,
  Gem,
  Shield,
  Award,
  Link2,
  Music,
  Volume2,
  Play,
  Pause,
  ExternalLink,
  FolderOpen,
  Database,
  FileSpreadsheet,
  HardDrive,
  Smartphone,
  Laptop,
  RefreshCw,
  Code,
  Copy
} from 'lucide-react';
import { EventSettings, GalleryMediaItem, EventTeam, Participant } from '../types';
import { DEFAULT_TEAMS } from '../constants/teams';
import { toDatetimeLocalValue, fromDatetimeLocalValue } from '../utils/date';
import { compressImageFile, createThumbnail, formatVideoEmbedUrl, formatMediaUrl, formatAudioUrl } from '../utils/media';
import {
  downloadLocalJsonBackup,
  readLocalJsonFile,
  FullBackupData
} from '../lib/vercelBlob';
import {
  saveSettingsToSupabaseDirect,
  exportSupabaseDatabaseBackup,
  restoreSupabaseDatabaseBackup,
  getSupabaseLiveHealth,
  fetchParticipantsFromSupabaseDirect,
  SUPABASE_SQL_SETUP_SCRIPT
} from '../lib/supabase';
import { exportParticipantsToExcel } from '../utils/exportUtils';

interface AdminSettingsProps {
  settings: EventSettings;
  adminPasswordInput: string;
  onUpdateSettings: (newSettings: Partial<EventSettings>, currentAdminPass: string) => Promise<{ success: boolean; error?: string } | boolean>;
  onLockAdmin: () => void;
}

const DEFAULT_CONGREGATIONS_LIST = [
  'Central',
  'Jardim Primavera',
  'Vila Nova',
  'Bela Vista',
  'Parque das Flores',
  'Jardim América',
  'São José'
];

const DEFAULT_GALLERY_ITEMS: GalleryMediaItem[] = [];

const TEAM_COLOR_PRESETS = [
  { id: 'rose', name: 'Rubi / Vermelho', color: 'from-rose-600 to-red-500', badgeBg: 'bg-rose-500/20', badgeText: 'text-rose-300 border-rose-500/30' },
  { id: 'sky', name: 'Safira / Azul', color: 'from-sky-600 to-blue-500', badgeBg: 'bg-sky-500/20', badgeText: 'text-sky-300 border-sky-500/30' },
  { id: 'emerald', name: 'Esmeralda / Verde', color: 'from-emerald-600 to-teal-500', badgeBg: 'bg-emerald-500/20', badgeText: 'text-emerald-300 border-emerald-500/30' },
  { id: 'amber', name: 'Diamante / Dourado', color: 'from-amber-500 to-yellow-400', badgeBg: 'bg-amber-500/20', badgeText: 'text-amber-300 border-amber-500/30' },
  { id: 'purple', name: 'Ametista / Roxo', color: 'from-purple-600 to-violet-500', badgeBg: 'bg-purple-500/20', badgeText: 'text-purple-300 border-purple-500/30' },
  { id: 'orange', name: 'Topázio / Laranja', color: 'from-orange-600 to-amber-500', badgeBg: 'bg-orange-500/20', badgeText: 'text-orange-300 border-orange-500/30' },
  { id: 'cyan', name: 'Turquesa / Ciano', color: 'from-cyan-600 to-blue-400', badgeBg: 'bg-cyan-500/20', badgeText: 'text-cyan-300 border-cyan-500/30' },
  { id: 'slate', name: 'Ônix / Cinza Metálico', color: 'from-slate-700 to-slate-500', badgeBg: 'bg-slate-500/20', badgeText: 'text-slate-300 border-slate-500/30' }
];

const sanitizeGalleryList = (items: any[]): GalleryMediaItem[] => {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => {
    if (!item || typeof item !== 'object') return false;
    const id = String(item.id || '');
    if (['m1', 'm2', 'm3', 'm4', 'm5', 'm6'].includes(id)) return false;
    const urlStr = String(item.url || '');
    const thumbStr = String(item.thumbnailUrl || '');
    if (urlStr.includes('unsplash.com') || urlStr.includes('romelandia.sc.gov.br')) return false;
    if (thumbStr.includes('unsplash.com') || thumbStr.includes('romelandia.sc.gov.br')) return false;
    return true;
  });
};

export const AdminSettings: React.FC<AdminSettingsProps> = ({
  settings,
  adminPasswordInput,
  onUpdateSettings,
  onLockAdmin
}) => {
  // Form State initialized from settings
  const [ticketPrice, setTicketPrice] = useState<number>(settings.ticketPrice ?? 25);
  const [revenueGoal, setRevenueGoal] = useState<number>(settings.revenueGoal ?? 2500);
  const [newAdminPassword, setNewAdminPassword] = useState<string>('');
  const [eventDate, setEventDate] = useState<string>(
    toDatetimeLocalValue(settings.eventDate)
  );
  const [locationName, setLocationName] = useState<string>(settings.locationName || 'Espaço e Chácara "Somos Jóias Preciosas"');
  const [locationAddress, setLocationAddress] = useState<string>(settings.locationAddress || 'Fazenda Chico Pinto, Bairro Cedro. São Gonçalo dos Campos');
  const [googleMapsEmbedUrl, setGoogleMapsEmbedUrl] = useState<string>(
    settings.googleMapsEmbedUrl ||
      'https://www.google.com/maps/embed?pb=!1m17!1m12!1m3!1d3896.670711455419!2d-38.93708902493298!3d-12.404963687860697!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m2!1m1!2zMTLCsDI0JzE3LjkiUyAzOMKwNTYnMDQuMyJX!5e0!3m2!1spt-BR!2sbr!4v1786794586966!5m2!1spt-BR!2sbr'
  );

  // App Identity State (Title and Logo)
  const [eventName, setEventName] = useState<string>(settings.eventName || 'Somos Jóias Preciosas');
  const [logoUrl, setLogoUrl] = useState<string>(settings.logoUrl || '');
  const [logoFileName, setLogoFileName] = useState<string>('');

  // Background Hymn / Music (.MP3) State (persisted with settings)
  const [backgroundMusicUrl, setBackgroundMusicUrl] = useState<string>(settings.backgroundMusicUrl || '/uploads/audio/Se_vos_baterdes_Ele_vos_abre.mp3');
  const [backgroundMusicTitle, setBackgroundMusicTitle] = useState<string>(settings.backgroundMusicTitle || 'Hino CCB • Sou Feliz com Jesus');
  const [backgroundMusicEnabled, setBackgroundMusicEnabled] = useState<boolean>(settings.backgroundMusicEnabled ?? true);
  const [audioUploadProgress, setAudioUploadProgress] = useState<string | null>(null);
  const [isPreviewAudioPlaying, setIsPreviewAudioPlaying] = useState<boolean>(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // PIX & WhatsApp Configuration
  const [pixKey, setPixKey] = useState<string>(settings.pixKey || 'gincana.joias2026@gmail.com');
  const [whatsappGroupUrl, setWhatsappGroupUrl] = useState<string>(
    settings.whatsappGroupUrl || 'https://chat.whatsapp.com/Bf4nIjDR6QCFXEuxm7S3gK'
  );

  // Teams Management State
  const [teamsList, setTeamsList] = useState<EventTeam[]>(
    Array.isArray(settings.teams) && settings.teams.length > 0 ? settings.teams : DEFAULT_TEAMS
  );
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState('');
  const [teamMotto, setTeamMotto] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [teamColorPresetId, setTeamColorPresetId] = useState('rose');
  const [showTeamForm, setShowTeamForm] = useState(false);

  // Congregations state
  const [congregationsList, setCongregationsList] = useState<string[]>(
    Array.isArray(settings.congregations) && settings.congregations.length > 0 ? settings.congregations : DEFAULT_CONGREGATIONS_LIST
  );
  const [newChurchName, setNewChurchName] = useState('');

  // Gallery Photos/Videos State
  const [galleryList, setGalleryList] = useState<GalleryMediaItem[]>(
    Array.isArray(settings.galleryItems) ? sanitizeGalleryList(settings.galleryItems) : DEFAULT_GALLERY_ITEMS
  );

  // User modification tracker to prevent background polling from resetting form while typing
  const isDirtyRef = useRef(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    // Only synchronize from external settings if the user hasn't modified local state in this session
    if (!initializedRef.current) {
      initializedRef.current = true;
      if (settings) {
        if (settings.ticketPrice !== undefined) setTicketPrice(settings.ticketPrice);
        if (settings.revenueGoal !== undefined) setRevenueGoal(settings.revenueGoal);
        if (settings.eventDate) setEventDate(toDatetimeLocalValue(settings.eventDate));
        if (settings.locationName !== undefined) setLocationName(settings.locationName);
        if (settings.locationAddress !== undefined) setLocationAddress(settings.locationAddress);
        if (settings.googleMapsEmbedUrl) setGoogleMapsEmbedUrl(settings.googleMapsEmbedUrl);
        if (settings.eventName !== undefined) setEventName(settings.eventName);
        if (settings.logoUrl !== undefined) setLogoUrl(settings.logoUrl);
        if (settings.pixKey !== undefined) setPixKey(settings.pixKey);
        if (settings.whatsappGroupUrl !== undefined) setWhatsappGroupUrl(settings.whatsappGroupUrl);
        if (Array.isArray(settings.teams) && settings.teams.length > 0) setTeamsList(settings.teams);
        if (Array.isArray(settings.congregations) && settings.congregations.length > 0) setCongregationsList(settings.congregations);
        if (Array.isArray(settings.galleryItems)) setGalleryList(sanitizeGalleryList(settings.galleryItems));
        if (settings.backgroundMusicUrl !== undefined) setBackgroundMusicUrl(settings.backgroundMusicUrl);
        if (settings.backgroundMusicTitle !== undefined) setBackgroundMusicTitle(settings.backgroundMusicTitle);
        if (settings.backgroundMusicEnabled !== undefined) setBackgroundMusicEnabled(settings.backgroundMusicEnabled);
      }
    }
  }, [settings]);

  // New photo form state
  const [newPhotoCategory, setNewPhotoCategory] = useState<'anterior' | 'atual'>('anterior');
  const [newPhotoTitle, setNewPhotoTitle] = useState('');
  const [newPhotoDesc, setNewPhotoDesc] = useState('');
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [newPhotoType, setNewPhotoType] = useState<'photo' | 'video'>('photo');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [activeGalleryTab, setActiveGalleryTab] = useState<'anterior' | 'atual'>('anterior');

  const [saving, setSaving] = useState(false);
  const [isExportingJson, setIsExportingJson] = useState(false);
  const [isExportingSupabase, setIsExportingSupabase] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isImportingJson, setIsImportingJson] = useState(false);
  const [lastBackupInfo, setLastBackupInfo] = useState<{
    filename: string;
    sizeKb: number;
    count: number;
    time: string;
  } | null>(null);
  const [supabaseHealth, setSupabaseHealth] = useState<{
    connected: boolean;
    participantCount: number;
    projectUrl: string;
    error?: string;
  } | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [copiedSql, setCopiedSql] = useState<string | null>(null);
  const [showSqlGuide, setShowSqlGuide] = useState(false);

  const handleCopySql = (sqlText: string, label: string) => {
    navigator.clipboard.writeText(sqlText);
    setCopiedSql(label);
    setTimeout(() => {
      setCopiedSql(null);
    }, 3000);
  };
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const checkSupabaseHealth = async () => {
    setIsCheckingHealth(true);
    try {
      const health = await getSupabaseLiveHealth();
      setSupabaseHealth(health);
    } catch {
      setSupabaseHealth(null);
    } finally {
      setIsCheckingHealth(false);
    }
  };

  useEffect(() => {
    checkSupabaseHealth();
  }, []);

  // Supabase Full Database Export & Download to Device
  const handleDownloadSupabaseBackup = async () => {
    setIsExportingSupabase(true);
    setErrorMsg(null);
    try {
      const currentSettings: EventSettings = {
        adminPassword: adminPasswordInput || settings.adminPassword || 'ccb*2026',
        ticketPrice,
        revenueGoal,
        eventDate: fromDatetimeLocalValue(eventDate),
        locationName,
        locationAddress,
        googleMapsEmbedUrl,
        congregations: congregationsList,
        galleryItems: galleryList,
        eventName,
        logoUrl,
        pixKey,
        whatsappGroupUrl,
        teams: teamsList,
        backgroundMusicUrl,
        backgroundMusicTitle,
        backgroundMusicEnabled
      };

      const result = await exportSupabaseDatabaseBackup(undefined, currentSettings);
      setLastBackupInfo({
        filename: result.filename,
        sizeKb: result.sizeKb,
        count: result.count,
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      });
      setSuccessMsg(`Backup da base Supabase exportado com sucesso! Arquivo "${result.filename}" (${result.sizeKb} KB) com ${result.count} participantes baixado para o seu aparelho.`);
      checkSupabaseHealth();
    } catch (err: any) {
      console.error('Supabase backup error:', err);
      setErrorMsg('Erro ao exportar backup do Supabase: ' + (err?.message || 'Falha de conexão com a base de dados.'));
    } finally {
      setIsExportingSupabase(false);
    }
  };

  // Restore Backup to Supabase
  const handleRestoreSupabaseBackupFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportingJson(true);
    setErrorMsg(null);
    try {
      const backupData = await readLocalJsonFile(file);
      const result = await restoreSupabaseDatabaseBackup(backupData);

      setSuccessMsg(`${result.message} Recarregando aplicação...`);
      checkSupabaseHealth();
      setTimeout(() => window.location.reload(), 1400);
    } catch (err: any) {
      setErrorMsg('Erro ao restaurar backup no Supabase: ' + (err?.message || 'Arquivo inválido.'));
    } finally {
      setIsImportingJson(false);
      e.target.value = '';
    }
  };

  // Export full Excel sheet from Supabase database
  const handleExportExcelFromSupabase = async () => {
    setIsExportingExcel(true);
    setErrorMsg(null);
    try {
      let participants = await fetchParticipantsFromSupabaseDirect();
      if (!participants || participants.length === 0) {
        const res = await fetch('/api/participants');
        if (res.ok) participants = await res.json();
      }

      if (participants && participants.length > 0) {
        const nowStr = new Date().toISOString().split('T')[0];
        exportParticipantsToExcel(participants, `gincana_inscritos_supabase_${nowStr}`);
        setSuccessMsg(`Planilha Excel com ${participants.length} participantes exportada com sucesso!`);
      } else {
        setErrorMsg('Nenhum participante encontrado no Supabase para exportar.');
      }
    } catch (err: any) {
      setErrorMsg('Erro ao gerar planilha Excel: ' + (err?.message || ''));
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Audio Testing Preview Handler
  const handleTogglePreviewAudio = () => {
    if (!previewAudioRef.current) {
      const formatted = formatAudioUrl(backgroundMusicUrl);
      previewAudioRef.current = new Audio(formatted);
      previewAudioRef.current.volume = 0.85;
      previewAudioRef.current.onended = () => setIsPreviewAudioPlaying(false);
      previewAudioRef.current.onerror = () => {
        setIsPreviewAudioPlaying(false);
        setErrorMsg('Não foi possível reproduzir este áudio. Verifique o link ou formato do arquivo.');
      };
    }

    if (isPreviewAudioPlaying) {
      previewAudioRef.current.pause();
      setIsPreviewAudioPlaying(false);
    } else {
      const formatted = formatAudioUrl(backgroundMusicUrl);
      if (previewAudioRef.current.src !== formatted && !previewAudioRef.current.src.endsWith(formatted)) {
        previewAudioRef.current.src = formatted;
      }
      previewAudioRef.current.play().then(() => {
        setIsPreviewAudioPlaying(true);
      }).catch((e) => {
        console.warn('Preview audio error:', e);
        setIsPreviewAudioPlaying(false);
        setErrorMsg('Erro ao iniciar áudio. Certifique-se de que a URL é acessível publicamente.');
      });
    }
  };

  // Audio MP3 File Upload Handler
  const handleAudioFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    isDirtyRef.current = true;
    setAudioUploadProgress('Processando e enviando arquivo de áudio...');
    setErrorMsg(null);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = event.target?.result as string;
        if (!base64Data) {
          setErrorMsg('Erro ao ler arquivo de áudio.');
          setAudioUploadProgress(null);
          return;
        }

        // 1. Try server audio upload endpoint
        try {
          const res = await fetch('/api/audio/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              adminPassword: adminPasswordInput,
              filename: file.name,
              contentType: file.type || 'audio/mpeg',
              content: base64Data
            })
          });

          if (res.ok) {
            const data = await res.json();
            if (data.url) {
              setBackgroundMusicUrl(data.url);
              const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
              setBackgroundMusicTitle(cleanTitle);
              setBackgroundMusicEnabled(true);
              setSuccessMsg(`Hino "${file.name}" carregado e salvo com sucesso!`);
              setAudioUploadProgress(null);
              return;
            }
          }
        } catch (e) {
          console.warn('Server upload endpoint fallback to Data URL:', e);
        }

        // 2. Direct Fallback: Use base64 Data URL directly
        setBackgroundMusicUrl(base64Data);
        const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
        setBackgroundMusicTitle(cleanTitle);
        setBackgroundMusicEnabled(true);
        setSuccessMsg(`Hino "${file.name}" pronto para salvar!`);
        setAudioUploadProgress(null);
      };

      reader.onerror = () => {
        setErrorMsg('Falha ao ler o arquivo de áudio.');
        setAudioUploadProgress(null);
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      setErrorMsg('Erro no envio do áudio: ' + (err?.message || 'Falha.'));
      setAudioUploadProgress(null);
    }
  };

  // Congregation Handlers
  const handleAddChurch = () => {
    isDirtyRef.current = true;
    const clean = newChurchName.trim();
    if (!clean) return;
    if (congregationsList.includes(clean)) {
      setErrorMsg('Esta congregação já está na lista.');
      return;
    }
    setCongregationsList([...congregationsList, clean]);
    setNewChurchName('');
    setErrorMsg(null);
  };

  const handleRemoveChurch = (indexToRemove: number) => {
    isDirtyRef.current = true;
    setCongregationsList(congregationsList.filter((_, idx) => idx !== indexToRemove));
  };

  const handleRestoreDefaultChurches = () => {
    isDirtyRef.current = true;
    setCongregationsList(DEFAULT_CONGREGATIONS_LIST);
    setSuccessMsg('Lista padrão de congregações restaurada.');
  };

  // Teams Handlers
  const handleStartAddTeam = () => {
    setEditingTeamId(null);
    setTeamName('');
    setTeamMotto('');
    setTeamDescription('');
    setTeamColorPresetId('rose');
    setShowTeamForm(true);
  };

  const handleStartEditTeam = (team: EventTeam) => {
    setEditingTeamId(team.id);
    setTeamName(team.name);
    setTeamMotto(team.motto || '');
    setTeamDescription(team.description || '');
    const foundPreset = TEAM_COLOR_PRESETS.find((p) => p.color === team.color);
    setTeamColorPresetId(foundPreset ? foundPreset.id : 'rose');
    setShowTeamForm(true);
  };

  const handleSaveTeam = () => {
    isDirtyRef.current = true;
    const cleanName = teamName.trim();
    if (!cleanName) {
      setErrorMsg('O nome da equipe é obrigatório.');
      return;
    }

    const preset = TEAM_COLOR_PRESETS.find((p) => p.id === teamColorPresetId) || TEAM_COLOR_PRESETS[0];

    if (editingTeamId) {
      setTeamsList(
        teamsList.map((t) =>
          t.id === editingTeamId
            ? {
                ...t,
                name: cleanName,
                motto: teamMotto.trim() || undefined,
                description: teamDescription.trim() || undefined,
                color: preset.color,
                badgeBg: preset.badgeBg,
                badgeText: preset.badgeText
              }
            : t
        )
      );
      setSuccessMsg(`Equipe "${cleanName}" atualizada.`);
    } else {
      const newTeam: EventTeam = {
        id: 'team-' + Date.now(),
        name: cleanName,
        motto: teamMotto.trim() || undefined,
        description: teamDescription.trim() || undefined,
        color: preset.color,
        badgeBg: preset.badgeBg,
        badgeText: preset.badgeText,
        iconName: 'Sparkles'
      };
      setTeamsList([...teamsList, newTeam]);
      setSuccessMsg(`Equipe "${cleanName}" cadastrada com sucesso!`);
    }

    setShowTeamForm(false);
    setErrorMsg(null);
  };

  const handleRemoveTeam = (teamId: string) => {
    isDirtyRef.current = true;
    if (teamsList.length <= 1) {
      setErrorMsg('Deve haver pelo menos 1 equipe cadastrada no evento.');
      return;
    }
    setTeamsList(teamsList.filter((t) => t.id !== teamId));
    setSuccessMsg('Equipe removida com sucesso.');
  };

  const handleRestoreDefaultTeams = () => {
    isDirtyRef.current = true;
    setTeamsList(DEFAULT_TEAMS);
    setSuccessMsg('Lista padrão de equipes restaurada.');
  };

  // Google Maps URL change
  const handleEmbedUrlChange = (val: string) => {
    isDirtyRef.current = true;
    const match = val.match(/src=["']([^"']+)["']/);
    if (match && match[1]) {
      setGoogleMapsEmbedUrl(match[1]);
    } else {
      setGoogleMapsEmbedUrl(val);
    }
  };

  // Multiple Photo Files Upload & Server Sync
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');

  const handlePhotoFilesSelected = async (files: FileList) => {
    if (!files || files.length === 0) return;
    setIsProcessingPhotos(true);
    setErrorMsg(null);
    setUploadProgressText(`Processando 0 de ${files.length} mídias...`);

    const newItems: GalleryMediaItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgressText(`Otimizando mídia ${i + 1} de ${files.length}: ${file.name}...`);

      try {
        const isVideo = file.type.startsWith('video/');
        let finalUrl = '';
        let finalThumb = '';

        if (isVideo) {
          finalUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve((e.target?.result as string) || '');
            reader.onerror = () => resolve('');
            reader.readAsDataURL(file);
          });
          finalThumb = '';
        } else {
          finalUrl = await compressImageFile(file, 1000, 1000, 0.70);
          finalThumb = await createThumbnail(file, 260, 260, 0.55);
        }

        if (finalUrl) {
          const itemTitle = newPhotoTitle.trim() || file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
          newItems.push({
            id: 'media-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
            title: itemTitle,
            category: newPhotoCategory,
            type: isVideo ? 'video' : 'photo',
            url: finalUrl,
            thumbnailUrl: finalThumb || finalUrl,
            description: newPhotoDesc.trim() || (isVideo ? 'Vídeo gravado no evento' : 'Foto registrada no evento')
          });
        }
      } catch (err) {
        console.warn('Error processing photo:', file.name, err);
      }
    }

    if (newItems.length > 0) {
      setUploadProgressText('Salvando mídias no servidor e Supabase...');
      const combined = [...newItems, ...galleryList];
      const saved = await persistGalleryUpdate(combined);
      if (saved) {
        setSuccessMsg(`${newItems.length} foto(s)/vídeo(s) processados e salvos com sucesso na galeria!`);
        setNewPhotoTitle('');
        setNewPhotoDesc('');
        setNewPhotoUrl('');
        setSelectedFileName('');
      } else {
        setErrorMsg('Erro ao salvar as fotos no servidor.');
      }
    } else {
      setErrorMsg('Nenhuma imagem pôde ser processada. Verifique os arquivos selecionados.');
    }

    setIsProcessingPhotos(false);
    setUploadProgressText('');
  };

  const handlePhotoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handlePhotoFilesSelected(e.target.files);
    }
  };

  // Add Photo via URL or Google Drive Link
  const handleAddPhotoItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhotoUrl.trim()) {
      setErrorMsg('Envie um arquivo de imagem/vídeo ou insira o link/URL.');
      return;
    }

    const formatted = formatMediaUrl(newPhotoUrl.trim(), newPhotoType);
    const urlToSave = formatted.url;
    const thumbToSave = formatted.thumbnailUrl || formatted.url;
    const mediaType: 'photo' | 'video' = formatted.type;

    let defaultTitle = 'Foto do Evento';
    if (formatted.isFolder) {
      defaultTitle = 'Álbum no Google Drive (Fotos & Vídeos)';
    } else if (mediaType === 'video') {
      defaultTitle = 'Vídeo do Evento';
    }

    const title = newPhotoTitle.trim() || defaultTitle;
    const newItem: GalleryMediaItem = {
      id: 'media-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      title: title,
      category: newPhotoCategory,
      type: mediaType,
      url: urlToSave,
      thumbnailUrl: thumbToSave,
      description: newPhotoDesc.trim() || (formatted.isFolder ? 'Pasta completa com fotos e vídeos hospedados no Google Drive.' : mediaType === 'video' ? 'Vídeo gravado no evento' : 'Foto registrada no evento')
    };

    const combined = [newItem, ...galleryList];
    const saved = await persistGalleryUpdate(combined);
    if (saved) {
      setNewPhotoTitle('');
      setNewPhotoDesc('');
      setNewPhotoUrl('');
      setSelectedFileName('');
      setErrorMsg(null);
      setSuccessMsg(
        formatted.isFolder
          ? 'Pasta do Google Drive vinculada e salva com sucesso na galeria!'
          : formatted.provider === 'google-drive'
          ? 'Link do Google Drive processado e adicionado com sucesso!'
          : formatted.provider === 'youtube'
          ? 'Vídeo do YouTube integrado com sucesso!'
          : mediaType === 'video'
          ? 'Vídeo adicionado e salvo com sucesso na galeria!'
          : 'Foto adicionada e salva com sucesso na galeria!'
      );
    }
  };

  const handleRemovePhotoItem = async (idToRemove: string) => {
    const updated = galleryList.filter((item) => item.id !== idToRemove);
    const saved = await persistGalleryUpdate(updated);
    if (saved) {
      setSuccessMsg('Item excluído com sucesso da galeria!');
    }
  };

  const handleClearAllPhotos = async () => {
    if (window.confirm('Tem certeza que deseja apagar todas as fotos cadastradas na galeria?')) {
      const saved = await persistGalleryUpdate([]);
      if (saved) {
        setSuccessMsg('Todas as fotos foram removidas com sucesso.');
      }
    }
  };

  const persistGalleryUpdate = async (updatedList: GalleryMediaItem[]): Promise<boolean> => {
    setGalleryList(updatedList);
    try {
      const payload: Partial<EventSettings> = {
        ticketPrice: Number(ticketPrice),
        revenueGoal: Number(revenueGoal),
        eventDate: fromDatetimeLocalValue(eventDate),
        locationName,
        locationAddress,
        googleMapsEmbedUrl,
        congregations: congregationsList,
        galleryItems: updatedList,
        eventName,
        logoUrl,
        pixKey,
        whatsappGroupUrl,
        teams: teamsList,
        backgroundMusicUrl,
        backgroundMusicTitle,
        backgroundMusicEnabled
      };

      // Direct save to Supabase
      saveSettingsToSupabaseDirect(payload as EventSettings).catch(() => {});

      const res = await onUpdateSettings(payload, adminPasswordInput);
      const isOk = typeof res === 'boolean' ? res : res?.success;
      return Boolean(isOk);
    } catch (e) {
      console.warn('Failed to persist gallery update:', e);
      return false;
    }
  };

  // Logo file upload handler
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      isDirtyRef.current = true;
      setLogoFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Data = event.target?.result as string;
        if (base64Data) {
          setLogoUrl(base64Data);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    isDirtyRef.current = true;
    setLogoUrl('');
    setLogoFileName('');
  };

  // Main Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const isoEventDate = fromDatetimeLocalValue(eventDate);

      const payload: Partial<EventSettings> = {
        ticketPrice: Number(ticketPrice),
        revenueGoal: Number(revenueGoal),
        adminPassword: newAdminPassword.trim() ? newAdminPassword.trim() : undefined,
        eventDate: isoEventDate,
        locationName,
        locationAddress,
        googleMapsEmbedUrl,
        congregations: congregationsList,
        galleryItems: galleryList,
        eventName,
        logoUrl,
        pixKey,
        whatsappGroupUrl,
        teams: teamsList,
        backgroundMusicUrl,
        backgroundMusicTitle,
        backgroundMusicEnabled
      };

      // Save directly to Supabase as well
      saveSettingsToSupabaseDirect(payload as EventSettings).catch((err) => {
        console.warn('Supabase direct settings save notice:', err);
      });

      const res = await onUpdateSettings(payload, adminPasswordInput);

      const isOk = typeof res === 'boolean' ? res : res?.success;
      if (isOk) {
        isDirtyRef.current = false;
        setSuccessMsg('Configurações salvas com sucesso no Supabase e no servidor!');
        setNewAdminPassword('');
      } else {
        const errorDetail = typeof res === 'object' && res?.error ? res.error : 'Não foi possível salvar as alterações. Verifique sua senha de administrador.';
        setErrorMsg(errorDetail);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro de conexão ao salvar configurações.');
    } finally {
      setSaving(false);
    }
  };

  const filteredGallery = galleryList.filter((item) => item.category === activeGalleryTab);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Lock className="w-4 h-4" /> Área Restrita &bull; Painel de Controle
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Configurações Gerais do Evento</h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Gerencie os parâmetros, chaves PIX, data e hora, equipes, congregações, fotos e música de fundo.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onLockAdmin}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs flex items-center gap-2 transition-all border border-slate-700 cursor-pointer self-start sm:self-auto"
          >
            <Lock className="w-3.5 h-3.5" />
            Bloquear Painel
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-emerald-300 text-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-300 text-sm animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span className="font-semibold">{errorMsg}</span>
        </div>
      )}

      {/* Main Settings Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section: Identidade Visual e Nome do Evento */}
          <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4">
            <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" /> Identidade Visual & Nome do Evento
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Personalize o título da aplicação e a logomarca oficial exibida no cabeçalho e nos comprovantes.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Nome do Evento / Encontro
                </label>
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => {
                    isDirtyRef.current = true;
                    setEventName(e.target.value);
                  }}
                  placeholder="Ex: Somos Jóias Preciosas"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm font-bold focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Logomarca Oficial do Evento
                </label>
                <div className="flex items-center gap-3">
                  {logoUrl ? (
                    <div className="flex items-center gap-3 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl">
                      <img src={logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-contain bg-slate-950 p-1 border border-slate-800" />
                      <span className="text-xs text-slate-300 truncate max-w-[120px]">Logo ativa</span>
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="text-rose-400 hover:text-rose-300 p-1"
                        title="Remover logo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs text-amber-300 font-bold flex items-center gap-2 cursor-pointer transition-colors">
                      <Upload className="w-4 h-4 text-amber-400" />
                      <span>Selecionar Imagem do Logo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section: Backup da Base de Dados Supabase (PostgreSQL) */}
          <div className="bg-slate-950 border border-slate-800 p-5 sm:p-6 rounded-2xl space-y-5">
            <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                    <Database className="w-4 h-4" />
                  </span>
                  <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider">
                    Backup da Base de Dados Supabase (PostgreSQL)
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                  Gere e baixe uma cópia de segurança completa de todos os dados do Supabase (participantes cadastrados, comprovantes de pagamento, configurações do evento e equipes) diretamente para a memória do seu dispositivo (celular, tablet ou computador).
                </p>
              </div>

              {/* Supabase Status Badge */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <div className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                  supabaseHealth?.connected
                    ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-300'
                    : 'bg-slate-900 border-slate-700 text-slate-300'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${supabaseHealth?.connected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                  <span>
                    {supabaseHealth?.connected
                      ? `Supabase Conectado (${supabaseHealth.participantCount} inscritos)`
                      : 'Supabase Nuvem'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={checkSupabaseHealth}
                  disabled={isCheckingHealth}
                  className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-800 transition-colors cursor-pointer"
                  title="Atualizar status do Supabase"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCheckingHealth ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Action Buttons Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Button 1: Download JSON Backup (Main Action) */}
              <button
                type="button"
                onClick={handleDownloadSupabaseBackup}
                disabled={isExportingSupabase}
                className="p-4 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex flex-col items-center text-center gap-2 transition-all shadow-lg shadow-amber-500/10 cursor-pointer disabled:opacity-50 group active:scale-[0.98]"
              >
                <div className="p-2 rounded-lg bg-slate-950/20 group-hover:scale-110 transition-transform">
                  <Download className={`w-5 h-5 text-slate-950 ${isExportingSupabase ? 'animate-bounce' : ''}`} />
                </div>
                <span className="font-extrabold text-sm text-slate-950">
                  {isExportingSupabase ? 'Gerando Backup...' : 'Baixar Backup Supabase (.JSON)'}
                </span>
                <span className="text-[10px] text-slate-900/80 font-semibold leading-tight">
                  Salva arquivo .json com todos os inscritos e configurações no seu dispositivo
                </span>
              </button>

              {/* Button 2: Export Excel Sheet */}
              <button
                type="button"
                onClick={handleExportExcelFromSupabase}
                disabled={isExportingExcel}
                className="p-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/40 text-slate-200 font-bold text-xs flex flex-col items-center text-center gap-2 transition-all cursor-pointer disabled:opacity-50 group active:scale-[0.98]"
              >
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                </div>
                <span className="font-bold text-sm text-emerald-300">
                  {isExportingExcel ? 'Gerando Planilha...' : 'Exportar Planilha Excel (.XLSX)'}
                </span>
                <span className="text-[10px] text-slate-400 leading-tight">
                  Gera arquivo Excel formatado com lista completa para impressão ou conferência
                </span>
              </button>

              {/* Button 3: Restore Backup to Supabase */}
              <label className={`p-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/40 text-slate-200 font-bold text-xs flex flex-col items-center text-center gap-2 transition-all cursor-pointer group active:scale-[0.98] ${
                isImportingJson ? 'opacity-60 pointer-events-none' : ''
              }`}>
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform">
                  <Upload className={`w-5 h-5 text-cyan-400 ${isImportingJson ? 'animate-spin' : ''}`} />
                </div>
                <span className="font-bold text-sm text-cyan-300">
                  {isImportingJson ? 'Restaurando Base...' : 'Restaurar Backup no Supabase (.JSON)'}
                </span>
                <span className="text-[10px] text-slate-400 leading-tight">
                  Selecione um arquivo de backup (.json) para restaurar dados no Supabase
                </span>
                <input
                  type="file"
                  accept=".json,application/json"
                  disabled={isImportingJson}
                  onChange={handleRestoreSupabaseBackupFile}
                  className="hidden"
                />
              </label>
            </div>

            {/* Last Backup Confirmation Banner */}
            {lastBackupInfo && (
              <div className="p-3.5 bg-emerald-950/30 border border-emerald-700/40 rounded-xl flex items-start gap-3 text-xs text-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-emerald-300">
                    Backup baixado com sucesso para este dispositivo ({lastBackupInfo.time})!
                  </p>
                  <p className="text-[11px] text-slate-300">
                    Arquivo: <span className="font-mono text-amber-300 font-semibold">{lastBackupInfo.filename}</span> ({lastBackupInfo.sizeKb} KB) com <span className="font-bold text-white">{lastBackupInfo.count} participantes</span> incluídos. O arquivo já está disponível na sua pasta de Downloads.
                  </p>
                </div>
              </div>
            )}

            {/* SQL Migration & Schema Card */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Code className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      Estrutura do Banco & Colunas Supabase (SQL Editor)
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Adicione as colunas <code className="text-amber-300 font-mono">notes</code> e <code className="text-amber-300 font-mono">amount_paid</code> à sua tabela <code className="text-slate-200 font-mono">participants</code> no Supabase.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopySql(`ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS notes TEXT;\nALTER TABLE public.participants ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 20.00;`, 'alter')}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                  >
                    {copiedSql === 'alter' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSql === 'alter' ? 'Copiado!' : 'Copiar Comando SQL das Colunas'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowSqlGuide(!showSqlGuide)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer"
                  >
                    {showSqlGuide ? 'Ocultar Detalhes' : 'Ver Script Completo'}
                  </button>
                </div>
              </div>

              {/* Quick SQL snippet display */}
              <div className="relative group">
                <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] font-mono text-emerald-400 overflow-x-auto select-all">
                  <code>{`-- Comando rápido para criar as colunas de Observações e Valor Contribuído no Supabase:
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 20.00;`}</code>
                </pre>
              </div>

              {/* Expanded Complete Script */}
              {showSqlGuide && (
                <div className="pt-3 border-t border-slate-800 space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300">
                      Script SQL Completo (Tabelas, Colunas, RLS e Bucket de Comprovantes):
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopySql(SUPABASE_SQL_SETUP_SCRIPT, 'full')}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-bold rounded-lg border border-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {copiedSql === 'full' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSql === 'full' ? 'Script Copiado!' : 'Copiar Script Completo'}</span>
                    </button>
                  </div>
                  <pre className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-[10px] font-mono text-slate-300 max-h-56 overflow-y-auto select-all leading-relaxed">
                    <code>{SUPABASE_SQL_SETUP_SCRIPT}</code>
                  </pre>
                </div>
              )}
            </div>

            {/* Compatibility info pills */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                <span>Compatibilidade total de download:</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded-md text-[10px] text-slate-300 flex items-center gap-1">
                  <Smartphone className="w-3 h-3 text-amber-400" /> Celular (Android & iOS)
                </span>
                <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded-md text-[10px] text-slate-300 flex items-center gap-1">
                  <Smartphone className="w-3 h-3 text-cyan-400" /> Tablet & iPad
                </span>
                <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded-md text-[10px] text-slate-300 flex items-center gap-1">
                  <Laptop className="w-3 h-3 text-emerald-400" /> Computador / Desktop
                </span>
              </div>
            </div>
          </div>

          {/* Section: Hino CCB & Música Ambiente (.MP3) */}
          <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4">
            <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                  <Music className="w-4 h-4 text-amber-400" /> Hino CCB & Música Ambiente (.MP3)
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Configure o hino ou louvor em formato .MP3 a ser executado como música de fundo no aplicativo. Salvo diretamente no Supabase.
                </p>
              </div>

              {/* Enable / Disable Toggle */}
              <label className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl cursor-pointer self-start sm:self-auto">
                <input
                  type="checkbox"
                  checked={backgroundMusicEnabled}
                  onChange={(e) => {
                    isDirtyRef.current = true;
                    setBackgroundMusicEnabled(e.target.checked);
                  }}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
                <span className="text-xs font-bold text-white">Ativar Música no App</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Título do Hino */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  Título do Hino / Louvor
                </label>
                <input
                  type="text"
                  value={backgroundMusicTitle}
                  onChange={(e) => {
                    isDirtyRef.current = true;
                    setBackgroundMusicTitle(e.target.value);
                  }}
                  placeholder="Ex: Hino CCB • Sou Feliz com Jesus"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm font-semibold focus:outline-none focus:border-amber-500"
                />
                <p className="text-[11px] text-slate-400">
                  Nome exibido no player de áudio para os usuários.
                </p>
              </div>

              {/* Upload de Arquivo MP3 */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  Upload do Arquivo de Áudio (.MP3 / .M4A)
                </label>
                <div className="flex items-center gap-2">
                  <label className="flex-1 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs text-amber-300 font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm">
                    <Upload className="w-4 h-4 text-amber-400" />
                    <span>{audioUploadProgress ? 'Enviando Áudio...' : 'Selecionar Arquivo .MP3 do Aparelho'}</span>
                    <input
                      type="file"
                      accept="audio/mp3,audio/mpeg,audio/m4a,audio/wav,audio/ogg"
                      disabled={Boolean(audioUploadProgress)}
                      onChange={handleAudioFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-[11px] text-slate-400">
                  Faça o upload do hino gravado para salvar no Supabase e tocar em todos os dispositivos.
                </p>
              </div>
            </div>

            {/* URL / Link do Áudio (Google Drive ou Link Direto) */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-slate-300 block flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-amber-400" /> Ou Link do Áudio (Google Drive, Supabase Storage ou URL Direta .mp3)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={backgroundMusicUrl}
                  onChange={(e) => {
                    isDirtyRef.current = true;
                    setBackgroundMusicUrl(e.target.value);
                  }}
                  placeholder="https://drive.google.com/file/d/... ou /uploads/audio/... ou link .mp3"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-xs font-mono focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={handleTogglePreviewAudio}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                    isPreviewAudioPlaying
                      ? 'bg-rose-500 text-white hover:bg-rose-600'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  }`}
                >
                  {isPreviewAudioPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-slate-950" />}
                  <span>{isPreviewAudioPlaying ? 'Pausar Teste' : 'Testar Áudio'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Aceita links compartilháveis do Google Drive, Supabase Storage, CDN ou links de áudio direto.
              </p>
            </div>
          </div>

          {/* Section: Financial & Date Settings */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
              <DollarSign className="w-4 h-4 text-amber-400" /> Parâmetros Financeiros & Data do Evento
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Valor por participante */}
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-2">
                <label className="text-xs font-bold text-slate-300 block">
                  Valor da Taxa por Participante (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={ticketPrice}
                  onChange={(e) => {
                    isDirtyRef.current = true;
                    setTicketPrice(parseFloat(e.target.value) || 0);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-lg font-bold focus:outline-none focus:border-amber-500"
                  required
                />
                <p className="text-[11px] text-slate-400">
                  Calcula o total arrecadado no Dashboard conforme o número de inscritos.
                </p>
              </div>

              {/* Meta Financeira */}
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-2">
                <label className="text-xs font-bold text-slate-300 block">
                  Meta Financeira a Atingir (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={revenueGoal}
                  onChange={(e) => {
                    isDirtyRef.current = true;
                    setRevenueGoal(parseFloat(e.target.value) || 0);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-lg font-bold focus:outline-none focus:border-amber-500"
                  required
                />
                <p className="text-[11px] text-slate-400">
                  Meta exibida no indicador percentual de progresso do Dashboard.
                </p>
              </div>
            </div>

            {/* Chave PIX e Grupo do WhatsApp */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Chave PIX */}
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-2">
                <label className="text-xs font-bold text-slate-300 block flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-amber-400" /> Chave PIX para Pagamento
                </label>
                <input
                  type="text"
                  value={pixKey}
                  onChange={(e) => {
                    isDirtyRef.current = true;
                    setPixKey(e.target.value);
                  }}
                  placeholder="Ex: gincana.joias2026@gmail.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-amber-500"
                />
                <p className="text-[11px] text-slate-400">
                  Exibida nas instruções de pagamento e código PIX para os inscritos.
                </p>
              </div>

              {/* Link do Grupo do WhatsApp */}
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-2">
                <label className="text-xs font-bold text-slate-300 block flex items-center gap-1.5">
                  <MessageCircle className="w-4 h-4 text-emerald-400" /> Link do Grupo do WhatsApp (Comprovantes)
                </label>
                <input
                  type="url"
                  value={whatsappGroupUrl}
                  onChange={(e) => {
                    isDirtyRef.current = true;
                    setWhatsappGroupUrl(e.target.value);
                  }}
                  placeholder="https://chat.whatsapp.com/..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-amber-500"
                />
                <p className="text-[11px] text-slate-400">
                  Link para o qual os participantes são direcionados para enviar o comprovante.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Data do Evento */}
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-2">
                <label className="text-xs font-bold text-slate-300 block flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-amber-400" /> Data e Horário do Evento (Bahia)
                </label>
                <input
                  type="datetime-local"
                  value={eventDate}
                  onChange={(e) => {
                    isDirtyRef.current = true;
                    setEventDate(e.target.value);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
                  required
                />
                <p className="text-[11px] text-slate-400">
                  Configurado para 07 de Setembro de 2026 às 08:00h (Fuso da Bahia / Brasília).
                </p>
              </div>

              {/* Alterar Senha de Admin */}
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-2">
                <label className="text-xs font-bold text-slate-300 block flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-amber-400" /> Alterar Senha do Administrador
                </label>
                <input
                  type="password"
                  placeholder="Nova senha (deixe em branco p/ manter)"
                  value={newAdminPassword}
                  onChange={(e) => {
                    isDirtyRef.current = true;
                    setNewAdminPassword(e.target.value);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
                />
                <p className="text-[11px] text-slate-400">
                  Protege o acesso a todas as áreas restritas do sistema.
                </p>
              </div>
            </div>
          </div>

          {/* Section: Cadastro & Gerenciamento de Equipes */}
          <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" /> Cadastro & Gestão de Equipes da Gincana
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Cadastre novas equipes, personalize nomes, lemas, cores e gerencie a lista disponível para os inscritos.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRestoreDefaultTeams}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-amber-300 text-[11px] font-semibold flex items-center gap-1.5 border border-slate-800 transition-colors self-start sm:self-auto cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restaurar Padrão
                </button>

                {!showTeamForm && (
                  <button
                    type="button"
                    onClick={handleStartAddTeam}
                    className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/10 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Nova Equipe
                  </button>
                )}
              </div>
            </div>

            {/* Team Edit / Add Modal/Form */}
            {showTeamForm && (
              <div className="p-4 bg-slate-900/90 border border-amber-500/40 rounded-xl space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    {editingTeamId ? 'Editar Equipe' : 'Cadastrar Nova Equipe'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowTeamForm(false)}
                    className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1 font-semibold">Nome da Equipe *</label>
                    <input
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="Ex: Equipe Rubi"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500 font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1 font-semibold">Lema / Versículo (Opcional)</label>
                    <input
                      type="text"
                      value={teamMotto}
                      onChange={(e) => setTeamMotto(e.target.value)}
                      placeholder="Ex: Força, Coragem e Louvor"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-300 block mb-1 font-semibold">Descrição da Equipe</label>
                  <input
                    type="text"
                    value={teamDescription}
                    onChange={(e) => setTeamDescription(e.target.value)}
                    placeholder="Ex: Guerreiros determinados na busca da comunhão e da vitória."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Color Preset Selector */}
                <div>
                  <label className="text-[11px] text-slate-300 block mb-2 font-semibold">Tema de Cores da Equipe:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {TEAM_COLOR_PRESETS.map((preset) => {
                      const isSelected = teamColorPresetId === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setTeamColorPresetId(preset.id)}
                          className={`p-2 rounded-xl border flex items-center gap-2 transition-all cursor-pointer text-left ${
                            isSelected
                              ? 'border-amber-400 bg-amber-500/10 shadow-sm'
                              : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${preset.color} shrink-0 shadow`} />
                          <div className="overflow-hidden">
                            <p className="text-[11px] font-bold text-white truncate">{preset.name}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowTeamForm(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveTeam}
                    className="px-5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1 shadow-md shadow-amber-500/10 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {editingTeamId ? 'Salvar Equipe' : 'Cadastrar Equipe'}
                  </button>
                </div>
              </div>
            )}

            {/* List of Registered Teams */}
            <div>
              <p className="text-[11px] text-slate-400 mb-2 font-medium">
                Equipes ativas no sistema ({teamsList.length}):
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {teamsList.map((team) => (
                  <div
                    key={team.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col justify-between group hover:border-slate-700 relative overflow-hidden"
                  >
                    <div className={`h-1.5 w-full bg-gradient-to-r ${team.color} absolute top-0 left-0`} />
                    <div className="pt-1">
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="text-xs font-black text-white">{team.name}</h4>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEditTeam(team)}
                            className="p-1 rounded-md text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-colors"
                            title="Editar equipe"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveTeam(team.id)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                            title="Excluir equipe"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {team.motto && (
                        <p className="text-[10px] text-amber-300/90 font-medium italic mt-1">"{team.motto}"</p>
                      )}
                      {team.description && (
                        <p className="text-[10px] text-slate-400 line-clamp-2 mt-1">{team.description}</p>
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <span className={`text-[9px] px-2 py-0.5 rounded border font-medium ${team.badgeBg} ${team.badgeText}`}>
                        {team.name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section: Cadastro de Igrejas / Congregações */}
          <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                  <Church className="w-4 h-4 text-amber-400" /> Cadastro de Igrejas / Congregações
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Adicione ou remova congregações da lista de seleção para novos inscritos.
                </p>
              </div>

              <button
                type="button"
                onClick={handleRestoreDefaultChurches}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-amber-300 text-[11px] font-semibold flex items-center gap-1.5 border border-slate-800 transition-colors self-start sm:self-auto cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restaurar Padrão
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newChurchName}
                onChange={(e) => setNewChurchName(e.target.value)}
                placeholder="Nome da congregação (Ex: Vila Nova)"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={handleAddChurch}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/10 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Adicionar
              </button>
            </div>

            <div>
              <p className="text-[11px] text-slate-400 mb-2 font-medium">
                Congregações cadastradas ({congregationsList.length}):
              </p>
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
                {congregationsList.map((church, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-amber-200 text-xs font-semibold hover:border-amber-500/50 transition-colors"
                  >
                    <span>{church}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveChurch(idx)}
                      className="p-0.5 rounded-md hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Remover congregação"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Section: Cadastro de Localização & Google Maps */}
          <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-400" /> Cadastrar Localização no Google Maps
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Defina o nome do local, o endereço completo e o link de incorporação (embed) do mapa interativo.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-300 block mb-1 font-semibold">Nome do Local</label>
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => {
                    isDirtyRef.current = true;
                    setLocationName(e.target.value);
                  }}
                  placeholder="Ex: Espaço e Chácara Somos Jóias Preciosas"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1 font-semibold">Endereço Completo</label>
                <input
                  type="text"
                  value={locationAddress}
                  onChange={(e) => {
                    isDirtyRef.current = true;
                    setLocationAddress(e.target.value);
                  }}
                  placeholder="Ex: Fazenda Chico Pinto, Bairro Cedro. São Gonçalo dos Campos"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1 font-semibold flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-amber-400" /> URL do Mapa (Google Maps Embed)
              </label>
              <input
                type="text"
                value={googleMapsEmbedUrl}
                onChange={(e) => handleEmbedUrlChange(e.target.value)}
                placeholder="Cole o link src do Google Maps ou a tag <iframe src='...'>"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-amber-200 font-mono focus:outline-none focus:border-amber-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Dica: No Google Maps, clique em <strong>Compartilhar &gt; Incorporar um mapa</strong> e cole a URL do atributo <code>src="..."</code> ou a tag HTML completa.
              </p>
            </div>

            {/* Live Map Preview */}
            <div className="space-y-2 pt-2">
              <span className="text-[11px] font-bold text-slate-400 block">Pré-visualização do Mapa no Portal:</span>
              <div className="rounded-2xl overflow-hidden h-48 border border-slate-800 bg-slate-900">
                {googleMapsEmbedUrl && googleMapsEmbedUrl.trim() !== '' ? (
                  <iframe
                    title="Pré-visualização do Mapa"
                    src={googleMapsEmbedUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                    Nenhum mapa configurado
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section: Cadastro e Gestão de Fotos e Vídeos (Google Drive, ImgBB, YouTube) */}
          <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-amber-400" /> Fotos e Vídeos do Evento Anterior & Evento Atual
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Adicione links de pastas do Google Drive, fotos diretas, vídeos do YouTube ou faça upload do seu aparelho.
                </p>
              </div>

              {galleryList.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllPhotos}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 text-[11px] font-semibold flex items-center gap-1.5 border border-rose-500/30 transition-colors self-start sm:self-auto cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Limpar Todas as Fotos ({galleryList.length})
                </button>
              )}
            </div>

            {/* Form to add new photo */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
              <p className="text-xs font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" /> Cadastrar Nova Foto, Vídeo ou Pasta do Google Drive
              </p>

              {/* Upload Dropzone Box */}
              <div className="p-5 bg-slate-950 border-2 border-dashed border-amber-500/40 hover:border-amber-400 rounded-2xl text-center space-y-3 transition-colors">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">
                    {isProcessingPhotos ? (uploadProgressText || 'Processando e enviando mídias...') : 'Fazer Upload de Fotos e Vídeos do Dispositivo'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Selecione quantas fotos desejar (JPG, PNG, WEBP) ou vídeos curtos. As imagens são salvas e sincronizadas com o Supabase.
                  </p>
                </div>

                <label className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl cursor-pointer shadow-md transition-all active:scale-95">
                  <Upload className="w-4 h-4" />
                  <span>{isProcessingPhotos ? 'Processando Mídias...' : 'Selecionar Fotos / Vídeos do Aparelho'}</span>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    disabled={isProcessingPhotos}
                    onChange={handlePhotoFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {/* Category Selection */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Destino da Foto / Vídeo</label>
                  <select
                    value={newPhotoCategory}
                    onChange={(e) => setNewPhotoCategory(e.target.value as 'anterior' | 'atual')}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="anterior">Evento Anterior (Edição Passada)</option>
                    <option value="atual">Evento Atual (Edição 2026)</option>
                  </select>
                </div>

                {/* Type Selection */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Tipo de Mídia</label>
                  <select
                    value={newPhotoType}
                    onChange={(e) => setNewPhotoType(e.target.value as 'photo' | 'video')}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="photo">Foto / Imagem (Google Drive / ImgBB)</option>
                    <option value="video">Vídeo (YouTube / Vimeo / Drive)</option>
                  </select>
                </div>

                {/* Title */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Título (Opcional)</label>
                  <input
                    type="text"
                    value={newPhotoTitle}
                    onChange={(e) => setNewPhotoTitle(e.target.value)}
                    placeholder="Ex: Tocata da Juventude"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Link / URL Manual Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-300 block flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-amber-400" /> Cadastrar Link em Nuvem (Google Drive, ImgBB, YouTube, etc.)
                  </label>
                  <span className="text-[10px] text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    Suporta pastas e arquivos individuais
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPhotoUrl}
                    onChange={(e) => setNewPhotoUrl(e.target.value)}
                    placeholder="Cole o link da pasta ou foto do Google Drive (https://drive.google.com/drive/folders/...), ImgBB, YouTube..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddPhotoItem}
                    disabled={!newPhotoUrl.trim()}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar
                  </button>
                </div>

                {/* Cloud Hosting Quick Instructions Card */}
                <div className="mt-2 p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-2 text-[11px] text-slate-300">
                  <p className="font-bold text-amber-400 flex items-center gap-1.5">
                    💡 Dicas para links do Google Drive e fotos:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 text-[11px]">
                    <div className="p-2.5 bg-slate-900/90 rounded-lg border border-slate-800">
                      <p className="font-bold text-white mb-1 flex items-center gap-1">📁 Pasta do Google Drive</p>
                      <p className="text-slate-400 text-[10px] leading-relaxed">
                        Cole o link da pasta (ex: <code>drive.google.com/drive/folders/...</code>). O sistema cria um cartão interativo com acesso a todas as fotos e vídeos!
                      </p>
                    </div>
                    <div className="p-2.5 bg-slate-900/90 rounded-lg border border-slate-800">
                      <p className="font-bold text-white mb-1 flex items-center gap-1">🖼️ Foto do Google Drive</p>
                      <p className="text-slate-400 text-[10px] leading-relaxed">
                        Defina o compartilhamento como <strong>"Qualquer pessoa com o link"</strong> e cole o link do arquivo. Exibição em alta resolução!
                      </p>
                    </div>
                    <div className="p-2.5 bg-slate-900/90 rounded-lg border border-slate-800">
                      <p className="font-bold text-white mb-1 flex items-center gap-1">🎥 Vídeos (YouTube / Vimeo)</p>
                      <p className="text-slate-400 text-[10px] leading-relaxed">
                        Cole o link do YouTube, Vimeo ou Google Drive. O player é incorporado diretamente no modal da galeria!
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Descrição Curta (Opcional)</label>
                <input
                  type="text"
                  value={newPhotoDesc}
                  onChange={(e) => setNewPhotoDesc(e.target.value)}
                  placeholder="Ex: Momento especial dos jovens tocando juntos na chácara."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* List / Tabs of Existing Photos */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-300">
                  Fotos e Mídias Cadastradas ({galleryList.length}):
                </p>

                {/* Filter Tabs */}
                <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveGalleryTab('anterior')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      activeGalleryTab === 'anterior'
                        ? 'bg-amber-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Evento Anterior ({galleryList.filter((g) => g.category === 'anterior').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveGalleryTab('atual')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      activeGalleryTab === 'atual'
                        ? 'bg-amber-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Evento Atual ({galleryList.filter((g) => g.category === 'atual').length})
                  </button>
                </div>
              </div>

              {filteredGallery.length === 0 ? (
                <div className="p-6 text-center bg-slate-900/60 border border-slate-800 rounded-2xl text-slate-500 text-xs">
                  Nenhuma foto cadastrada nesta categoria ainda. Cadastre no formulário acima!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto p-1">
                  {filteredGallery.map((item) => (
                    <div
                      key={item.id}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex gap-3 items-center justify-between group hover:border-slate-700"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-14 h-14 rounded-lg bg-slate-950 overflow-hidden shrink-0 border border-slate-800 relative flex items-center justify-center">
                          {item.url.includes('/folders/') ? (
                            <FolderOpen className="w-7 h-7 text-amber-400" />
                          ) : item.thumbnailUrl && item.thumbnailUrl.trim() !== '' ? (
                            <img
                              src={item.thumbnailUrl}
                              alt={item.title}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full bg-slate-900 flex items-center justify-center text-slate-600">
                              <ImageIcon className="w-5 h-5" />
                            </div>
                          )}
                          {item.type === 'video' && (
                            <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center">
                              <Film className="w-4 h-4 text-amber-400" />
                            </div>
                          )}
                        </div>
                        <div className="overflow-hidden">
                          <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">{item.description}</p>
                          <span className="inline-block mt-1 text-[9px] px-2 py-0.5 bg-slate-950 text-amber-300 rounded border border-slate-800 font-mono">
                            {item.category === 'anterior' ? 'Evento Passado' : 'Edição 2026'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemovePhotoItem(item.id)}
                        className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/30 text-rose-400 transition-colors shrink-0 cursor-pointer"
                        title="Excluir item da galeria"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3.5 rounded-2xl bg-amber-500 text-slate-950 font-black text-sm hover:bg-amber-400 transition-all shadow-xl shadow-amber-500/20 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Salvando Alterações...' : 'Salvar Todas as Configurações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
