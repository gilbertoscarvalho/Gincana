import React, { useState, useEffect } from 'react';
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
  Award
} from 'lucide-react';
import { EventSettings, GalleryMediaItem, EventTeam } from '../types';
import { DEFAULT_TEAMS } from '../constants/teams';
import { toDatetimeLocalValue, fromDatetimeLocalValue } from '../utils/date';
import { compressImageFile, createThumbnail, formatVideoEmbedUrl } from '../utils/media';
import {
  downloadLocalJsonBackup,
  readLocalJsonFile,
  FullBackupData
} from '../lib/vercelBlob';

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
  const [ticketPrice, setTicketPrice] = useState<number>(settings.ticketPrice || 25);
  const [revenueGoal, setRevenueGoal] = useState<number>(settings.revenueGoal || 2500);
  const [newAdminPassword, setNewAdminPassword] = useState<string>('');
  const [eventDate, setEventDate] = useState<string>(
    toDatetimeLocalValue(settings.eventDate)
  );
  const [locationName, setLocationName] = useState<string>(settings.locationName || '');
  const [locationAddress, setLocationAddress] = useState<string>(settings.locationAddress || '');
  const [googleMapsEmbedUrl, setGoogleMapsEmbedUrl] = useState<string>(
    settings.googleMapsEmbedUrl ||
      'https://www.google.com/maps/embed?pb=!1m17!1m12!1m3!1d3896.670711455419!2d-38.93708902493298!3d-12.404963687860697!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m2!1m1!2zMTLCsDI0JzE3LjkiUyAzOMKwNTYnMDQuMyJX!5e0!3m2!1spt-BR!2sbr!4v1786794586966!5m2!1spt-BR!2sbr'
  );

  // App Identity State (Title and Logo)
  const [eventName, setEventName] = useState<string>(settings.eventName || 'Somos Jóias Preciosas');
  const [logoUrl, setLogoUrl] = useState<string>(settings.logoUrl || '');
  const [logoFileName, setLogoFileName] = useState<string>('');

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
    Array.isArray(settings.congregations) ? settings.congregations : DEFAULT_CONGREGATIONS_LIST
  );
  const [newChurchName, setNewChurchName] = useState('');

  // Gallery Photos/Videos State
  const [galleryList, setGalleryList] = useState<GalleryMediaItem[]>(
    Array.isArray(settings.galleryItems) ? sanitizeGalleryList(settings.galleryItems) : DEFAULT_GALLERY_ITEMS
  );

  // Synchronize when parent settings change
  useEffect(() => {
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
      if (Array.isArray(settings.congregations)) setCongregationsList(settings.congregations);
      if (Array.isArray(settings.galleryItems)) setGalleryList(sanitizeGalleryList(settings.galleryItems));
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
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Local JSON Export
  const handleExportLocalJson = async () => {
    try {
      const res = await fetch('/api/backup/export');
      if (!res.ok) throw new Error('Falha ao exportar backup.');
      const data: FullBackupData = await res.json();
      downloadLocalJsonBackup(data, `backup_gincana_${new Date().toISOString().slice(0, 10)}.json`);
    } catch (err: any) {
      alert('Erro ao baixar arquivo JSON: ' + err.message);
    }
  };

  // Local JSON Import File
  const handleImportLocalJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('Deseja substituir a base de dados atual pelo arquivo JSON selecionado?')) {
      return;
    }

    try {
      const backupData = await readLocalJsonFile(file);
      const res = await fetch('/api/backup/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: backupData.settings,
          participants: backupData.participants
        })
      });

      if (res.ok) {
        alert('🎉 Base de dados restaurada com sucesso a partir do arquivo JSON local!');
        window.location.reload();
      } else {
        alert('Erro ao importar o arquivo JSON no servidor.');
      }
    } catch (err: any) {
      alert('Erro ao processar arquivo de backup: ' + err.message);
    }
  };

  // Helper to extract clean URL if admin pastes an entire <iframe> element
  const handleEmbedUrlChange = (val: string) => {
    if (val.includes('<iframe') && val.includes('src=')) {
      const match = val.match(/src=["']([^"']+)["']/);
      if (match && match[1]) {
        setGoogleMapsEmbedUrl(match[1]);
        return;
      }
    }
    setGoogleMapsEmbedUrl(val);
  };

  const handleAddChurch = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newChurchName.trim();
    if (!name) return;
    if (congregationsList.some((c) => c.toLowerCase() === name.toLowerCase())) {
      setErrorMsg('Esta congregação já está na lista.');
      return;
    }
    setCongregationsList([...congregationsList, name]);
    setNewChurchName('');
    setErrorMsg(null);
  };

  const handleRemoveChurch = (indexToRemove: number) => {
    setCongregationsList(congregationsList.filter((_, idx) => idx !== indexToRemove));
  };

  const handleRestoreDefaultChurches = () => {
    setCongregationsList(DEFAULT_CONGREGATIONS_LIST);
  };

  // Team Management Handlers
  const handleStartAddTeam = () => {
    setEditingTeamId(null);
    setTeamName('');
    setTeamMotto('');
    setTeamDescription('');
    setTeamColorPresetId('rose');
    setShowTeamForm(true);
    setErrorMsg(null);
  };

  const handleStartEditTeam = (team: EventTeam) => {
    setEditingTeamId(team.id);
    setTeamName(team.name);
    setTeamMotto(team.motto || '');
    setTeamDescription(team.description || '');
    const preset = TEAM_COLOR_PRESETS.find(p => p.badgeBg === team.badgeBg) || TEAM_COLOR_PRESETS[0];
    setTeamColorPresetId(preset.id);
    setShowTeamForm(true);
    setErrorMsg(null);
  };

  const handleSaveTeam = (e: React.FormEvent) => {
    e.preventDefault();
    const name = teamName.trim();
    if (!name) {
      setErrorMsg('O nome da equipe é obrigatório.');
      return;
    }

    const preset = TEAM_COLOR_PRESETS.find(p => p.id === teamColorPresetId) || TEAM_COLOR_PRESETS[0];

    if (editingTeamId) {
      // Update existing team
      const updated = teamsList.map(t => {
        if (t.id === editingTeamId) {
          return {
            ...t,
            name,
            motto: teamMotto.trim() || undefined,
            description: teamDescription.trim() || 'Equipe participante da Gincana & Tocata.',
            color: preset.color,
            badgeBg: preset.badgeBg,
            badgeText: preset.badgeText
          };
        }
        return t;
      });
      setTeamsList(updated);
      setSuccessMsg(`Equipe "${name}" atualizada com sucesso!`);
    } else {
      // Create new team
      const newId = 'team-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
      const newTeam: EventTeam = {
        id: newId,
        name,
        motto: teamMotto.trim() || undefined,
        description: teamDescription.trim() || 'Equipe participante da Gincana & Tocata.',
        color: preset.color,
        badgeBg: preset.badgeBg,
        badgeText: preset.badgeText,
        iconName: 'Gem'
      };
      setTeamsList([...teamsList, newTeam]);
      setSuccessMsg(`Equipe "${name}" cadastrada com sucesso!`);
    }

    setShowTeamForm(false);
    setEditingTeamId(null);
    setTeamName('');
    setTeamMotto('');
    setTeamDescription('');
  };

  const handleRemoveTeam = (teamId: string) => {
    const team = teamsList.find(t => t.id === teamId);
    if (!window.confirm(`Deseja realmente remover a equipe "${team?.name || 'selecionada'}"?`)) {
      return;
    }
    setTeamsList(teamsList.filter(t => t.id !== teamId));
    if (editingTeamId === teamId) {
      setShowTeamForm(false);
      setEditingTeamId(null);
    }
    setSuccessMsg('Equipe removida da lista.');
  };

  const handleRestoreDefaultTeams = () => {
    if (window.confirm('Deseja restaurar a lista padrão de equipes (Rubi, Safira, Esmeralda, Diamante)?')) {
      setTeamsList(DEFAULT_TEAMS);
      setShowTeamForm(false);
      setEditingTeamId(null);
      setSuccessMsg('Equipes padrão restauradas.');
    }
  };

  // Upload Logo file with compression
  const handleLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoFileName(file.name);
    try {
      const compressed = await compressImageFile(file, 400, 400, 0.85);
      setLogoUrl(compressed);
      setErrorMsg(null);
    } catch (e) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogoUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload local photo file with compression and instant addition option
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState<string>('');

  // Helper to persist gallery updates to backend immediately
  const persistGalleryUpdate = async (updatedList: GalleryMediaItem[]): Promise<boolean> => {
    setGalleryList(updatedList);
    try {
      const res = await onUpdateSettings(
        {
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
          teams: teamsList
        },
        adminPasswordInput
      );

      if (typeof res === 'object' && !res.success) {
        setErrorMsg(res.error || 'Erro ao salvar na galeria. Tente fotos menores.');
        return false;
      }
      return true;
    } catch (e: any) {
      console.warn('Auto-save of gallery:', e);
      setErrorMsg(e?.message || 'Erro ao salvar fotos na galeria.');
      return false;
    }
  };

  // Upload local photo files (Single or Batch) with compression
  const handlePhotoFilesSelected = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsProcessingPhotos(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const newItems: GalleryMediaItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgressText(`Processando mídia ${i + 1} de ${files.length}...`);

      if (file.type.startsWith('image/')) {
        try {
          const compressed = await compressImageFile(file, 1080, 1080, 0.74);
          const thumb = await createThumbnail(file, 320, 320, 0.65);
          const autoTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
          const formattedTitle = autoTitle.charAt(0).toUpperCase() + autoTitle.slice(1);

          newItems.push({
            id: 'media-' + Date.now() + '-' + Math.floor(Math.random() * 10000) + '-' + i,
            title: newPhotoTitle.trim() ? (files.length === 1 ? newPhotoTitle.trim() : `${newPhotoTitle.trim()} (${i + 1})`) : formattedTitle,
            category: newPhotoCategory,
            type: 'photo',
            url: compressed,
            thumbnailUrl: thumb || compressed,
            description: newPhotoDesc.trim() || 'Foto do evento'
          });
        } catch (err) {
          console.error('Error processing file:', file.name, err);
        }
      } else if (file.type.startsWith('video/')) {
        // Direct video file
        if (file.size > 25 * 1024 * 1024) {
          setErrorMsg(`O vídeo "${file.name}" tem mais de 25MB. Para vídeos longos, recomendamos cadastrar o link do YouTube/Vimeo.`);
          continue;
        }
        try {
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve((e.target?.result as string) || '');
            reader.onerror = () => resolve('');
            reader.readAsDataURL(file);
          });

          if (dataUrl) {
            const autoTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
            const formattedTitle = autoTitle.charAt(0).toUpperCase() + autoTitle.slice(1);

            newItems.push({
              id: 'media-' + Date.now() + '-' + Math.floor(Math.random() * 10000) + '-' + i,
              title: newPhotoTitle.trim() ? (files.length === 1 ? newPhotoTitle.trim() : `${newPhotoTitle.trim()} (${i + 1})`) : formattedTitle,
              category: newPhotoCategory,
              type: 'video',
              url: dataUrl,
              thumbnailUrl: '',
              description: newPhotoDesc.trim() || 'Vídeo gravado no evento'
            });
          }
        } catch (err) {
          console.error('Error processing video file:', file.name, err);
        }
      }
    }

    if (newItems.length > 0) {
      setUploadProgressText('Salvando fotos no servidor...');
      const combined = [...newItems, ...galleryList];
      const saved = await persistGalleryUpdate(combined);
      if (saved) {
        setNewPhotoTitle('');
        setNewPhotoDesc('');
        setNewPhotoUrl('');
        setSelectedFileName('');
        setSuccessMsg(
          newItems.length === 1
            ? 'Mídia enviada e salva com sucesso na galeria!'
            : `${newItems.length} fotos enviadas e salvas com sucesso na galeria!`
        );
      }
    } else {
      if (!errorMsg) {
        setErrorMsg('Nenhuma imagem ou vídeo válido pôde ser processado.');
      }
    }
    setIsProcessingPhotos(false);
    setUploadProgressText('');
  };

  const handlePhotoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handlePhotoFilesSelected(e.target.files);
    }
  };

  const handleAddPhotoItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhotoUrl.trim()) {
      setErrorMsg('Envie um arquivo de imagem/vídeo ou insira o link/URL.');
      return;
    }

    let urlToSave = newPhotoUrl.trim();
    let thumbToSave = newPhotoUrl.trim();
    let mediaType: 'photo' | 'video' = newPhotoType;

    // Detect if it is a video URL (YouTube, Vimeo, MP4, etc.)
    if (newPhotoType === 'video' || /youtube\.com|youtu\.be|vimeo\.com|\.mp4|\.webm/i.test(urlToSave)) {
      mediaType = 'video';
      const formatted = formatVideoEmbedUrl(urlToSave);
      if (formatted.isEmbed) {
        urlToSave = formatted.embedUrl;
        thumbToSave = formatted.thumbnailUrl || '';
      }
    }

    const title = newPhotoTitle.trim() || (mediaType === 'video' ? 'Vídeo do Evento' : 'Foto do Evento');
    const newItem: GalleryMediaItem = {
      id: 'media-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      title: title,
      category: newPhotoCategory,
      type: mediaType,
      url: urlToSave,
      thumbnailUrl: thumbToSave,
      description: newPhotoDesc.trim() || (mediaType === 'video' ? 'Vídeo gravado no evento' : 'Foto registrada no evento')
    };

    const combined = [newItem, ...galleryList];
    const saved = await persistGalleryUpdate(combined);
    if (saved) {
      setNewPhotoTitle('');
      setNewPhotoDesc('');
      setNewPhotoUrl('');
      setSelectedFileName('');
      setErrorMsg(null);
      setSuccessMsg(mediaType === 'video' ? 'Vídeo adicionado e salvo com sucesso na galeria!' : 'Foto adicionada e salva com sucesso na galeria!');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await onUpdateSettings(
        {
          ticketPrice: Number(ticketPrice),
          revenueGoal: Number(revenueGoal),
          adminPassword: newAdminPassword.trim() ? newAdminPassword.trim() : undefined,
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
          teams: teamsList
        },
        adminPasswordInput
      );

      const isOk = typeof res === 'boolean' ? res : res?.success;
      if (isOk) {
        setSuccessMsg('Configurações salvas com sucesso!');
        setNewAdminPassword('');
      } else {
        const errorDetail = (typeof res === 'object' && res?.error) ? res.error : 'Não foi possível salvar as alterações. Verifique sua senha de administrador.';
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
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/20 text-amber-300 rounded-2xl border border-amber-500/30">
              <Settings className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Configurações Gerais do Evento</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Gerencie valores, igrejas, fotos do evento e localização no Google Maps.
              </p>
            </div>
          </div>

          <button
            onClick={onLockAdmin}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-2 border border-slate-700 self-start sm:self-auto cursor-pointer"
          >
            <Lock className="w-4 h-4 text-amber-400" />
            Sair do Modo Admin
          </button>
        </div>

        {successMsg && (
          <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-emerald-300 text-sm flex items-center gap-3 animate-fade-in">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 bg-rose-500/20 border border-rose-500/40 rounded-2xl text-rose-300 text-sm flex items-center gap-3 animate-fade-in">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 0: App Identity (Name & Logo) */}
          <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                <Globe className="w-4 h-4 text-amber-400" /> Identidade Visual & Nome da Aplicação
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Personalize o nome do evento e a imagem da logo exibidos no cabeçalho superior da aplicação.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nome do Evento / Aplicação */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">
                  Nome da Aplicação / Título no Topo
                </label>
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="Ex: Somos Jóias Preciosas"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm font-bold focus:outline-none focus:border-amber-500"
                  required
                />
                <p className="text-[11px] text-slate-400">
                  Exibido no cabeçalho superior ao lado da logo do evento.
                </p>
              </div>

              {/* Upload ou URL da Logo */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">
                  Logo da Gincana (Imagem)
                </label>
                
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-900 border border-dashed border-slate-700 hover:border-amber-500 rounded-xl text-xs font-semibold text-amber-300 cursor-pointer transition-colors">
                      <Upload className="w-4 h-4 text-amber-400" />
                      <span>{logoFileName ? logoFileName : 'Enviar Imagem de Logo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFileUpload}
                        className="hidden"
                      />
                    </label>

                    {logoUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setLogoUrl('');
                          setLogoFileName('');
                        }}
                        className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/30 text-rose-400 transition-colors cursor-pointer"
                        title="Remover Logo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    value={logoUrl}
                    onChange={(e) => {
                      setLogoUrl(e.target.value);
                      setLogoFileName('');
                    }}
                    placeholder="Ou cole a URL da imagem da Logo (https://...)"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-200 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Logo Preview */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-4">
              <span className="text-[11px] font-bold text-slate-400">Pré-visualização do Topo:</span>
              <div className="flex items-center gap-3 bg-slate-900 px-4 py-2 rounded-2xl border border-slate-800">
                {logoUrl && logoUrl.trim() !== '' ? (
                  <div className="w-12 h-12 rounded-2xl overflow-hidden border border-amber-500/40 bg-slate-950 flex items-center justify-center p-0.5 shrink-0 shadow-md">
                    <img src={logoUrl} alt="Logo Preview" className="w-full h-full object-cover rounded-xl" />
                  </div>
                ) : (
                  <div className="p-2 bg-gradient-to-tr from-amber-500 to-amber-300 rounded-xl text-slate-950 font-bold shrink-0">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-extrabold text-white">{eventName || 'Somos Jóias Preciosas'}</h4>
                  <span className="text-[10px] text-amber-300 font-medium">Gincana & Tocata • 2026</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Backup Manual Local (.JSON) */}
          <div className="bg-slate-950/80 border border-slate-800 p-5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <span className="text-xs font-extrabold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                <Download className="w-4 h-4 text-amber-400" />
                Cópia de Segurança Local (.JSON)
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Você pode baixar uma cópia do banco de dados em formato JSON ou restaurar uma cópia salva no seu computador.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <button
                type="button"
                onClick={handleExportLocalJson}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Download className="w-4 h-4 text-amber-400" />
                Baixar Arquivo JSON Local
              </button>

              <label className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors">
                <Upload className="w-4 h-4 text-emerald-400" />
                Carregar Arquivo JSON Local
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportLocalJsonFile}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Section 1: Financial & Date Settings */}
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
                  onChange={(e) => setTicketPrice(parseFloat(e.target.value) || 0)}
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
                  onChange={(e) => setRevenueGoal(parseFloat(e.target.value) || 0)}
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
                  onChange={(e) => setPixKey(e.target.value)}
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
                  onChange={(e) => setWhatsappGroupUrl(e.target.value)}
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
                  <Calendar className="w-4 h-4 text-amber-400" /> Data e Horário do Evento
                </label>
                <input
                  type="datetime-local"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
                  required
                />
                <p className="text-[11px] text-slate-400">
                  Define o encerramento do relógio da contagem regressiva.
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
                  onChange={(e) => setNewAdminPassword(e.target.value)}
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

          {/* Section 2: Cadastro de Igrejas / Congregações */}
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

          {/* Section 3: Cadastro de Localização & Google Maps */}
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
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="Ex: Espaço e Chácara Somos Jóias Preciosas"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1 font-semibold">Endereço Completo</label>
                <input
                  type="text"
                  value={locationAddress}
                  onChange={(e) => setLocationAddress(e.target.value)}
                  placeholder="Ex: Rua das Flores, 700 - Bairro das Palmeiras"
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

          {/* Section 4: Cadastro e Gestão de Fotos do Evento (Anterior e Atual) */}
          <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-amber-400" /> Fotos do Evento Anterior & Evento Atual
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Faça o upload de fotos do seu dispositivo ou adicione vídeos via link para exibir na galeria inicial.
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
                <Plus className="w-4 h-4 text-amber-400" /> Cadastrar Nova Foto ou Vídeo
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
                    Selecione quantas fotos desejar (JPG, PNG, WEBP) ou vídeos curtos. As imagens são otimizadas automaticamente e salvas no servidor sem limite de 3 fotos.
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
                    <option value="photo">Foto / Imagem</option>
                    <option value="video">Vídeo Embed (YouTube/Vimeo)</option>
                  </select>
                </div>

                {/* Title */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Título (Opcional se enviar arquivo)</label>
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
                <label className="text-[11px] font-bold text-slate-400 block">Ou Cadastrar por Link / URL da Internet</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPhotoUrl}
                    onChange={(e) => setNewPhotoUrl(e.target.value)}
                    placeholder="Cole o link direto da imagem ou vídeo (https://...)"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddPhotoItem}
                    disabled={!newPhotoUrl.trim()}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar
                  </button>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Descrição Curta (Opcional)</label>
                <input
                  type="text"
                  value={newPhotoDesc}
                  onChange={(e) => setNewPhotoDesc(e.target.value)}
                  placeholder="Ex: Momento especial da orquestra tocando juntas no gramado da chácara."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* List / Tabs of Existing Photos */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-300">
                  Fotos Cadastradas ({galleryList.length}):
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
                  Nenhuma foto cadastrada nesta categoria ainda. Cadastre acima!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto p-1">
                  {filteredGallery.map((item) => (
                    <div
                      key={item.id}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex gap-3 items-center justify-between group hover:border-slate-700"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-14 h-14 rounded-lg bg-slate-950 overflow-hidden shrink-0 border border-slate-800 relative">
                          {item.thumbnailUrl && item.thumbnailUrl.trim() !== '' ? (
                            <img
                              src={item.thumbnailUrl}
                              alt={item.title}
                              className="w-full h-full object-cover"
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
                        title="Excluir foto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3.5 rounded-2xl bg-amber-500 text-slate-950 font-black text-sm hover:bg-amber-400 transition-all shadow-xl shadow-amber-500/20 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Salvando Alterações...' : 'Salvar Configurações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
