import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Download,
  Eye,
  Check,
  X,
  Edit3,
  Trash2,
  FileText,
  Flag,
  Music,
  Utensils,
  AlertCircle,
  RefreshCw,
  User,
  Church,
  Calendar,
  Upload,
  Save,
  CheckCircle2,
  Sparkles,
  FileSpreadsheet,
  Printer,
  ChevronDown,
  DollarSign
} from 'lucide-react';
import { Participant, ProofStatus } from '../types';
import { exportParticipantsToExcel, exportParticipantsToPDF } from '../utils/exportUtils';
import {
  fetchParticipantsFromSupabaseDirect,
  saveParticipantToSupabaseDirect,
  deleteParticipantFromSupabaseDirect,
  exportSupabaseDatabaseBackup
} from '../lib/supabase';
import {
  isPdfDocument,
  getDisplayableProofUrl,
  openProofInNewTab,
  downloadProofFile
} from '../utils/proofViewer';

const DEFAULT_CONGREGATIONS = [
  'Central',
  'Tapera',
  'São Gonçalo dos Campos',
  'Capuchinhos',
  'Vila Nova',
  'Bela Vista',
  'Parque das Flores',
  'Jardim América',
  'São José'
];

const SUGGESTED_INSTRUMENTS = [
  'Violino',
  'Viola',
  'Violoncelo',
  'Órgão',
  'Canto',
  'Flauta',
  'Clarinete',
  'Saxofone Alto',
  'Saxofone Tenor',
  'Saxofone Soprano',
  'Trompete',
  'Trombone',
  'Euphonium / Bombardino',
  'Tuba'
];

const SUGGESTED_FOODS = [
  'Suco',
  'Refrigerante',
  'Bolo',
  'Salgados',
  'Torta Salgada',
  'Torta Doce',
  'Frutas',
  'Doces'
];

interface ParticipantManagementProps {
  onDataChanged: () => void;
  congregations?: string[];
}

export const ParticipantManagement: React.FC<ParticipantManagementProps> = ({
  onDataChanged,
  congregations
}) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCongregation, setFilterCongregation] = useState('ALL');
  const [filterProofStatus, setFilterProofStatus] = useState<'ALL' | 'WITH_PROOF' | 'WITHOUT_PROOF'>('ALL');
  const [filterActivity, setFilterActivity] = useState<'ALL' | 'GINCANA' | 'TOCATA'>('ALL');

  // Success / Alert banner
  const [globalBanner, setGlobalBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal Proof State
  const [viewingProofParticipant, setViewingProofParticipant] = useState<Participant | null>(null);

  // Edit Modal State
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editAge, setEditAge] = useState<number | ''>('');
  const [editCongregationSelect, setEditCongregationSelect] = useState('');
  const [editCustomCongregation, setEditCustomCongregation] = useState('');
  const [editParticipatesGincana, setEditParticipatesGincana] = useState(true);
  const [editParticipatesTocata, setEditParticipatesTocata] = useState(false);
  const [editInstrument, setEditInstrument] = useState('');
  const [editFoodOrDrink, setEditFoodOrDrink] = useState('');
  const [editProofStatus, setEditProofStatus] = useState<ProofStatus>('Pendente');
  const [editNotes, setEditNotes] = useState('');
  const [editAmountPaid, setEditAmountPaid] = useState<string>('20.00');
  const [editProofFile, setEditProofFile] = useState<{
    url: string;
    name: string;
    type: 'image' | 'pdf';
  } | null>(null);
  const [editProofRemoved, setEditProofRemoved] = useState(false);

  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editModalError, setEditModalError] = useState<string | null>(null);

  // Export & Print State
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showPrintPreviewModal, setShowPrintPreviewModal] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const activeCongregationsList = congregations && congregations.length > 0
    ? congregations
    : DEFAULT_CONGREGATIONS;

  const lastParticipantsFetchRef = useRef<number>(0);

  const fetchParticipants = async (isSilent = false) => {
    const now = Date.now();
    if (isSilent && now - lastParticipantsFetchRef.current < 45000) {
      return;
    }
    lastParticipantsFetchRef.current = now;

    if (!isSilent) setLoading(true);
    try {
      let res = await fetch('/api/participants');
      if (!res.ok && (res.status === 404 || res.status === 500)) {
        try {
          const fallbackRes = await fetch('/participants');
          if (fallbackRes.ok) res = fallbackRes;
        } catch {}
      }

      let loaded = false;
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const sortedList = [...data].sort((a, b) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateB - dateA;
          });
          setParticipants(sortedList);
          loaded = true;
        }
      }

      if (!loaded) {
        const directList = await fetchParticipantsFromSupabaseDirect();
        if (directList) {
          const sortedList = [...directList].sort((a, b) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateB - dateA;
          });
          setParticipants(sortedList);
        } else if (res.ok) {
          setParticipants([]);
        }
      }
    } catch (err) {
      console.warn('Notice: Participants sync check fallback to Supabase:', err);
      const directList = await fetchParticipantsFromSupabaseDirect();
      if (directList) {
        const sortedList = [...directList].sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });
        setParticipants(sortedList);
      }
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchParticipants(false);

    // Periodic background sync every 90 seconds (conserving free tier bandwidth)
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchParticipants(true);
      }
    }, 90000);

    const handleFocusOrVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchParticipants(true);
      }
    };

    window.addEventListener('focus', handleFocusOrVisibility);
    document.addEventListener('visibilitychange', handleFocusOrVisibility);
    window.addEventListener('ccb_participant_registered', () => fetchParticipants(true));
    window.addEventListener('storage', () => fetchParticipants(true));

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocusOrVisibility);
      document.removeEventListener('visibilitychange', handleFocusOrVisibility);
      window.removeEventListener('ccb_participant_registered', () => fetchParticipants(true));
      window.removeEventListener('storage', () => fetchParticipants(true));
    };
  }, []);

  // Quick proof status update with optimistic UI and fallback routes
  const handleUpdateStatus = async (id: string, newStatus: ProofStatus) => {
    const targetParticipant = participants.find((p) => p.id === id);

    const updatedParticipantObj: Participant = targetParticipant
      ? {
          ...targetParticipant,
          proofStatus: newStatus,
          updatedAt: new Date().toISOString()
        }
      : {
          id,
          fullName: 'Participante',
          firstName: 'participante',
          congregation: 'Central',
          age: 18,
          foodOrDrink: '',
          activities: { gincana: true, tocata: false },
          proofUrl: null,
          proofFileName: null,
          proofFileType: null,
          proofStatus: newStatus,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

    // 1. Optimistic UI update immediately
    setParticipants((prev) => {
      const updated = prev.map((p) => (p.id === id ? updatedParticipantObj : p));
      try {
        localStorage.setItem('ccb_gincana_local_participants', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    if (viewingProofParticipant && viewingProofParticipant.id === id) {
      setViewingProofParticipant(updatedParticipantObj);
    }
    if (editingParticipant && editingParticipant.id === id) {
      setEditProofStatus(newStatus);
    }

    setGlobalBanner({
      type: 'success',
      message: `Status do comprovante de "${targetParticipant?.fullName || 'participante'}" atualizado para "${newStatus}".`
    });
    setTimeout(() => setGlobalBanner(null), 4000);
    onDataChanged();

    // 2. Direct Supabase update (Guaranteed immediate cloud sync)
    saveParticipantToSupabaseDirect(updatedParticipantObj).catch((err) => {
      console.warn('Notice saving status to Supabase directly:', err);
    });

    // 3. Server API persistence
    try {
      const payload = {
        id,
        proofStatus: newStatus,
        fullName: targetParticipant?.fullName,
        congregation: targetParticipant?.congregation,
        proofUrl: targetParticipant?.proofUrl,
        proofFileName: targetParticipant?.proofFileName,
        proofFileType: targetParticipant?.proofFileType
      };

      const res = await fetch(`/api/participants/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        // Fallback endpoint
        await fetch(`/api/participants/${encodeURIComponent(id)}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(() => {});
      }
    } catch (err) {
      console.warn('Notice syncing proof status to server:', err);
    }
  };

  // Open Edit Modal and fill form with participant data
  const handleOpenEditModal = (p: Participant) => {
    setEditingParticipant(p);
    setEditFullName(p.fullName);
    setEditAge(p.age);

    const isKnownCongregation = activeCongregationsList.includes(p.congregation);
    if (isKnownCongregation) {
      setEditCongregationSelect(p.congregation);
      setEditCustomCongregation('');
    } else {
      setEditCongregationSelect('Outra / Digitar Manualmente');
      setEditCustomCongregation(p.congregation);
    }

    setEditParticipatesGincana(Boolean(p.activities?.gincana));
    setEditParticipatesTocata(Boolean(p.activities?.tocata));
    setEditInstrument(p.activities?.instrument || '');
    setEditFoodOrDrink(p.foodOrDrink || '');
    setEditProofStatus(p.proofStatus || (p.proofUrl ? 'Analisando' : 'Pendente'));
    setEditNotes(p.notes || '');
    const initialAmount = p.amountPaid !== undefined && p.amountPaid !== null ? Number(p.amountPaid) : 20;
    setEditAmountPaid(isNaN(initialAmount) ? '20.00' : initialAmount.toString());
    setEditProofFile(null);
    setEditProofRemoved(false);
    setEditModalError(null);
  };

  // Close Edit Modal
  const handleCloseEditModal = () => {
    setEditingParticipant(null);
    setEditAmountPaid('20.00');
    setEditNotes('');
    setEditProofFile(null);
    setEditProofRemoved(false);
    setEditModalError(null);
  };

  // Image compression helper
  const compressImage = (dataUrl: string, maxDimension = 1200, quality = 0.7): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  // Handle new proof file selection in edit modal
  const handleEditProofFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/');

    if (!isPdf && !isImage) {
      setEditModalError('Por favor selecione uma imagem (PNG/JPG/WEBP) ou um documento PDF.');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setEditModalError('O arquivo selecionado é muito grande. O tamanho máximo permitido é de 8MB.');
      return;
    }

    setEditModalError(null);
    const reader = new FileReader();
    reader.onload = async (event) => {
      let rawBase64 = event.target?.result as string;
      if (isImage) {
        try {
          rawBase64 = await compressImage(rawBase64, 1200, 0.75);
        } catch (err) {
          console.warn('Could not compress image, keeping original:', err);
        }
      }

      setEditProofFile({
        url: rawBase64,
        name: file.name,
        type: isPdf ? 'pdf' : 'image'
      });
      setEditProofRemoved(false);
      // Automatically adjust status to Analisando if it was Pendente
      if (editProofStatus === 'Pendente') {
        setEditProofStatus('Analisando');
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit edit participant changes
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingParticipant) return;

    const cleanFullName = editFullName.trim();
    if (!cleanFullName) {
      setEditModalError('Por favor, informe o Nome Completo do participante.');
      return;
    }

    let finalCongregation = editCongregationSelect;
    if (editCongregationSelect === 'Outra / Digitar Manualmente') {
      finalCongregation = editCustomCongregation.trim();
      if (!finalCongregation) {
        setEditModalError('Por favor, digite o nome da Comum Congregação.');
        return;
      }
    }

    if (editAge === '' || Number(editAge) <= 0 || isNaN(Number(editAge))) {
      setEditModalError('Por favor, informe uma idade válida.');
      return;
    }

    setIsSavingEdit(true);
    setEditModalError(null);

    try {
      // Determine proof payload
      let finalProofUrl = editingParticipant.proofUrl;
      let finalProofFileName = editingParticipant.proofFileName;
      let finalProofFileType = editingParticipant.proofFileType;

      if (editProofFile) {
        finalProofUrl = editProofFile.url;
        finalProofFileName = editProofFile.name;
        finalProofFileType = editProofFile.type;
      } else if (editProofRemoved) {
        finalProofUrl = null;
        finalProofFileName = null;
        finalProofFileType = null;
      }

      const cleanAmountStr = String(editAmountPaid).trim().replace(',', '.');
      const parsedAmount = parseFloat(cleanAmountStr);
      const finalAmountPaid = isNaN(parsedAmount) ? 20 : Math.max(0, parsedAmount);

      const nameParts = cleanFullName.split(' ').filter(Boolean);
      const cleanFirstName = nameParts[0] ? nameParts[0].toLowerCase() : cleanFullName.toLowerCase();

      const payload = {
        id: editingParticipant.id,
        fullName: cleanFullName,
        full_name: cleanFullName,
        firstName: cleanFirstName,
        first_name: cleanFirstName,
        congregation: finalCongregation,
        age: Number(editAge),
        activities: {
          gincana: editParticipatesGincana,
          tocata: editParticipatesTocata,
          instrument: editParticipatesTocata ? editInstrument.trim() : '',
          notes: editNotes.trim(),
          amountPaid: finalAmountPaid,
          amount_paid: finalAmountPaid,
          fullName: cleanFullName,
          full_name: cleanFullName
        },
        foodOrDrink: editFoodOrDrink.trim(),
        proofStatus: editProofStatus,
        proofUrl: finalProofUrl,
        proofFileName: finalProofFileName,
        proofFileType: finalProofFileType,
        notes: editNotes.trim(),
        amountPaid: finalAmountPaid,
        amount_paid: finalAmountPaid
      };

      let res = await fetch(`/api/participants/${encodeURIComponent(editingParticipant.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        // Fallback route 1: POST /api/participants/:id/update
        res = await fetch(`/api/participants/${encodeURIComponent(editingParticipant.id)}/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) {
        // Fallback route 2: POST /api/participants/update
        res = await fetch(`/api/participants/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      let data: any = {};
      try {
        data = await res.json();
      } catch (e) {}

      const updatedItem: Participant = {
        ...editingParticipant,
        ...(data?.participant || {}),
        ...payload,
        fullName: cleanFullName,
        firstName: cleanFirstName,
        updatedAt: new Date().toISOString()
      };

      // Always persist to Supabase directly as safety measure
      await saveParticipantToSupabaseDirect(updatedItem).catch(() => {});

      setParticipants((prev) => {
        const updated = prev.map((p) => (p.id === editingParticipant.id ? updatedItem : p));
        return updated;
      });

      if (viewingProofParticipant && viewingProofParticipant.id === editingParticipant.id) {
        setViewingProofParticipant(updatedItem);
      }

      setGlobalBanner({
        type: 'success',
        message: `Cadastro de "${cleanFullName}" atualizado com sucesso!`
      });
      setTimeout(() => setGlobalBanner(null), 5000);

      onDataChanged();
      handleCloseEditModal();
    } catch (err: any) {
      console.error('Error saving participant edit:', err);
      setEditModalError(err?.message || 'Erro ao salvar alterações do participante.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete participant
  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o cadastro de "${name}"? Esta ação não pode ser desfeita.`)) return;

    try {
      // Direct deletion from Supabase table
      deleteParticipantFromSupabaseDirect(id).catch(() => {});

      let res = await fetch(`/api/participants/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        try {
          const fallbackRes = await fetch(`/api/participants/${id}/delete`, { method: 'POST' });
          if (fallbackRes.ok) res = fallbackRes;
        } catch {}
      }

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Falha ao excluir participante no servidor.');
      }

      setParticipants((prev) => {
        const updated = prev.filter((p) => p.id !== id);
        return updated;
      });
      setGlobalBanner({ type: 'success', message: `Participante "${name}" removido com sucesso.` });
      setTimeout(() => setGlobalBanner(null), 4000);
      onDataChanged();
    } catch (err: any) {
      console.error('Error deleting participant:', err);
      setGlobalBanner({ type: 'error', message: err?.message || 'Erro ao excluir participante.' });
      setTimeout(() => setGlobalBanner(null), 5000);
    }
  };

  // Filter list of congregations
  const congregationsList = Array.from(new Set(participants.map((p) => p.congregation)));

  const filteredParticipants = participants.filter((p) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      p.fullName.toLowerCase().includes(term) ||
      p.congregation.toLowerCase().includes(term) ||
      (p.foodOrDrink && p.foodOrDrink.toLowerCase().includes(term)) ||
      (p.activities?.instrument && p.activities.instrument.toLowerCase().includes(term));

    const matchesCongregation =
      filterCongregation === 'ALL' || p.congregation === filterCongregation;

    const matchesProof =
      filterProofStatus === 'ALL'
        ? true
        : filterProofStatus === 'WITH_PROOF'
        ? Boolean(p.proofUrl)
        : !p.proofUrl;

    const matchesActivity =
      filterActivity === 'ALL'
        ? true
        : filterActivity === 'GINCANA'
        ? p.activities?.gincana
        : p.activities?.tocata;

    return matchesSearch && matchesCongregation && matchesProof && matchesActivity;
  });

  // 1. Export Excel (.xlsx) with auto-formatted columns and multi-tab structure
  const handleExportExcel = () => {
    if (filteredParticipants.length === 0) return;
    setIsExportingExcel(true);
    try {
      exportParticipantsToExcel(filteredParticipants, 'somos_joias_preciosas_inscritos');
      setGlobalBanner({
        type: 'success',
        message: `Planilha Excel (.xlsx) exportada com sucesso! ${filteredParticipants.length} inscritos organizados em colunas e abas estruturadas.`
      });
      setTimeout(() => setGlobalBanner(null), 5000);
      setShowExportMenu(false);
    } catch (err: any) {
      console.error('Erro ao exportar Excel:', err);
      alert('Erro ao exportar planilha Excel: ' + (err?.message || 'Erro'));
    } finally {
      setIsExportingExcel(false);
    }
  };

  // 2. Export PDF (.pdf) with clean landscape vector table, summary KPI and pagination
  const handleExportPDF = () => {
    if (filteredParticipants.length === 0) return;
    setIsExportingPDF(true);
    try {
      let filterDesc = 'Todos os Registros';
      if (filterCongregation !== 'ALL') filterDesc = `Comum: ${filterCongregation}`;
      if (filterProofStatus === 'WITH_PROOF') filterDesc += ' | Com Comprovante';
      if (filterProofStatus === 'WITHOUT_PROOF') filterDesc += ' | Pendente Comprovante';
      if (filterActivity === 'GINCANA') filterDesc += ' | Gincana';
      if (filterActivity === 'TOCATA') filterDesc += ' | Tocata';

      exportParticipantsToPDF(filteredParticipants, filterDesc);
      setGlobalBanner({
        type: 'success',
        message: `Relatório em PDF (.pdf) gerado com sucesso para ${filteredParticipants.length} participante(s)!`
      });
      setTimeout(() => setGlobalBanner(null), 5000);
      setShowExportMenu(false);
    } catch (err: any) {
      console.error('Erro ao exportar PDF:', err);
      alert('Erro ao exportar PDF: ' + (err?.message || 'Erro'));
    } finally {
      setIsExportingPDF(false);
    }
  };

  // 3. Export CSV with semicolon (;) delimiter and UTF-8 BOM for Portuguese Excel
  const handleExportCSV = () => {
    if (filteredParticipants.length === 0) return;

    const headers = [
      'Nº',
      'Nome Completo',
      'Comum Congregação',
      'Idade',
      'Gincana',
      'Tocata',
      'Instrumento',
      'Alimento / Bebida',
      'Comprovante Enviado',
      'Status Comprovante',
      'Data de Cadastro',
      'Observações'
    ];

    const rows = filteredParticipants.map((p, i) => [
      i + 1,
      `"${p.fullName.replace(/"/g, '""')}"`,
      `"${p.congregation.replace(/"/g, '""')}"`,
      p.age,
      p.activities?.gincana ? 'Sim' : 'Não',
      p.activities?.tocata ? 'Sim' : 'Não',
      `"${(p.activities?.instrument || '').replace(/"/g, '""')}"`,
      `"${(p.foodOrDrink || '').replace(/"/g, '""')}"`,
      p.proofUrl ? 'Sim' : 'Não',
      p.proofStatus || 'Pendente',
      p.createdAt ? `"${new Date(p.createdAt).toLocaleDateString('pt-BR')}"` : '""',
      `"${(p.notes || '').replace(/"/g, '""')}"`
    ]);

    // Use semicolon for Brazilian Excel column auto-splitting
    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `somos_joias_preciosas_inscritos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setGlobalBanner({
      type: 'success',
      message: `Arquivo CSV formatado para Excel (delimitado por ;) exportado com sucesso!`
    });
    setTimeout(() => setGlobalBanner(null), 5000);
    setShowExportMenu(false);
  };

  return (
    <div className="max-w-7xl mx-auto my-6 px-4 space-y-6 print:p-0 print:m-0 print:max-w-none">
      {/* Global Success / Alert Banner */}
      {globalBanner && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between shadow-lg transition-all animate-fade-in print:hidden ${
            globalBanner.type === 'success'
              ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-200'
              : 'bg-rose-500/15 border border-rose-500/40 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {globalBanner.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span className="text-sm font-semibold">{globalBanner.message}</span>
          </div>
          <button
            onClick={() => setGlobalBanner(null)}
            className="p-1 hover:bg-slate-800/60 rounded-lg text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
              Lista e Gestão de Inscritos
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Exibindo <strong>{filteredParticipants.length}</strong> de <strong>{participants.length}</strong> participante(s) cadastrado(s)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Refresh */}
            <button
              onClick={fetchParticipants}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer"
              title="Atualizar lista"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Main Excel Export Button */}
            <button
              onClick={handleExportExcel}
              disabled={filteredParticipants.length === 0 || isExportingExcel}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              title="Exportar dados em planilha Excel (.xlsx) com colunas organizadas e abas separadas"
            >
              {isExportingExcel ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4" />
              )}
              <span>Exportar Excel (.xlsx)</span>
            </button>

            {/* PDF Export Button */}
            <button
              onClick={handleExportPDF}
              disabled={filteredParticipants.length === 0 || isExportingPDF}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              title="Exportar relatório formatado em PDF (.pdf)"
            >
              {isExportingPDF ? (
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              <span>Exportar PDF</span>
            </button>

            {/* Print Preview Button */}
            <button
              onClick={() => setShowPrintPreviewModal(true)}
              disabled={filteredParticipants.length === 0}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              title="Visualizar e Imprimir relatório em página A4"
            >
              <Printer className="w-4 h-4 text-slate-400" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>

            {/* Dropdown for More Options (CSV) */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors border border-slate-700 cursor-pointer"
                title="Mais opções de exportação"
              >
                <ChevronDown className="w-4 h-4" />
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-40 p-2 space-y-1">
                  <button
                    onClick={handleExportExcel}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-slate-800 rounded-xl flex items-center gap-2 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    Exportar Excel (.xlsx)
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-amber-300 hover:bg-slate-800 rounded-xl flex items-center gap-2 cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-amber-400" />
                    Exportar PDF (.pdf)
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 rounded-xl flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-slate-400" />
                    Exportar CSV (Padrão Excel ;)
                  </button>
                  <button
                    onClick={() => {
                      setShowExportMenu(false);
                      setShowPrintPreviewModal(true);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 rounded-xl flex items-center gap-2 cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-slate-400" />
                    Visualizar para Impressão
                  </button>
                  <button
                    onClick={async () => {
                      setShowExportMenu(false);
                      try {
                        const res = await exportSupabaseDatabaseBackup();
                        setGlobalBanner({
                          type: 'success',
                          message: `Backup da base Supabase salvo com sucesso no seu dispositivo! (${res.count} participantes em "${res.filename}", ${res.sizeKb} KB).`
                        });
                      } catch (e: any) {
                        setGlobalBanner({
                          type: 'error',
                          message: 'Erro ao gerar backup do Supabase: ' + (e?.message || '')
                        });
                      }
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-cyan-300 hover:bg-slate-800 rounded-xl flex items-center gap-2 cursor-pointer border-t border-slate-800/80 mt-1 pt-2"
                  >
                    <Save className="w-4 h-4 text-cyan-400" />
                    Baixar Backup Supabase (.JSON)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-800">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, congregação, alimento..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
            />
          </div>

          {/* Filter Congregation */}
          <div className="relative">
            <select
              value={filterCongregation}
              onChange={(e) => setFilterCongregation(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Todas as Congregações</option>
              {congregationsList.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Proof */}
          <div>
            <select
              value={filterProofStatus}
              onChange={(e) => setFilterProofStatus(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Todos os Status de Comprovante</option>
              <option value="WITH_PROOF">Com Comprovante Anexado</option>
              <option value="WITHOUT_PROOF">Pendente de Comprovante</option>
            </select>
          </div>

          {/* Filter Activity */}
          <div>
            <select
              value={filterActivity}
              onChange={(e) => setFilterActivity(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Todas as Atividades</option>
              <option value="GINCANA">Apenas Gincana</option>
              <option value="TOCATA">Apenas Tocata</option>
            </select>
          </div>
        </div>
      </div>

      {/* Participants Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500 mb-2" />
            Carregando participantes...
          </div>
        ) : filteredParticipants.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-amber-500/50" />
            <p className="font-semibold text-slate-300">Nenhum participante encontrado.</p>
            <p className="text-xs text-slate-500">Tente ajustar os filtros de busca.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-amber-300 uppercase tracking-wider font-bold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3.5">Participante</th>
                  <th className="px-4 py-3.5">Congregação</th>
                  <th className="px-4 py-3.5">Atividades</th>
                  <th className="px-4 py-3.5">Alimento/Bebida</th>
                  <th className="px-4 py-3.5">Contribuição</th>
                  <th className="px-4 py-3.5">Comprovante</th>
                  <th className="px-4 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredParticipants.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Name & Age */}
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-white text-sm flex items-center gap-1.5">
                        {p.fullName}
                        {p.notes && p.notes.trim().length > 0 && (
                          <span
                            title={`Observação: ${p.notes}`}
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-semibold cursor-help border border-amber-500/30"
                          >
                            <FileText className="w-2.5 h-2.5 mr-0.5" /> Obs
                          </span>
                        )}
                      </div>
                      <div className="text-slate-400 text-xs">{p.age} anos</div>
                    </td>

                    {/* Congregation */}
                    <td className="px-4 py-3.5 font-semibold text-amber-200">
                      {p.congregation}
                    </td>

                    {/* Activities */}
                    <td className="px-4 py-3.5 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {p.activities?.gincana && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-medium">
                            <Flag className="w-3 h-3" /> Gincana
                          </span>
                        )}
                        {p.activities?.tocata && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 font-medium">
                            <Music className="w-3 h-3" /> Tocata
                          </span>
                        )}
                      </div>
                      {p.activities?.instrument && (
                        <div className="text-[11px] text-slate-400 italic">
                          Inst: {p.activities.instrument}
                        </div>
                      )}
                    </td>

                    {/* Food or Drink */}
                    <td className="px-4 py-3.5">
                      {p.foodOrDrink ? (
                        <span className="flex items-center gap-1 text-slate-200 font-medium">
                          <Utensils className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          {p.foodOrDrink}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">Não informado</span>
                      )}
                    </td>

                    {/* Contribuição / Valor Pago */}
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-amber-300">
                        R$ {(p.amountPaid !== undefined && p.amountPaid !== null ? Number(p.amountPaid) : 20).toFixed(2).replace('.', ',')}
                      </div>
                      {Number(p.amountPaid ?? 20) === 0 ? (
                        <span className="text-[10px] text-slate-400 font-semibold">Isento</span>
                      ) : Number(p.amountPaid ?? 20) !== 20 ? (
                        <span className="text-[10px] text-amber-400 font-semibold">Valor Ajustado</span>
                      ) : (
                        <span className="text-[10px] text-slate-500">Padrão</span>
                      )}
                    </td>

                    {/* Proof Status Badge & Button */}
                    <td className="px-4 py-3.5">
                      {p.proofUrl ? (
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${
                              p.proofStatus === 'Aprovado'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : p.proofStatus === 'Analisando'
                                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                                : p.proofStatus === 'Rejeitado'
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            }`}
                          >
                            {p.proofStatus}
                          </span>
                          <button
                            onClick={() => setViewingProofParticipant(p)}
                            className="p-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg transition-colors cursor-pointer"
                            title="Ver Comprovante / Alterar Status"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-semibold text-[11px] border ${
                              p.proofStatus === 'Aprovado'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : p.proofStatus === 'Rejeitado'
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {p.proofStatus || 'Pendente'}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Actions: Edit & Delete */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(p)}
                          className="p-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-amber-500/30"
                          title="Editar Cadastro do Participante"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, p.fullName)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-500/30"
                          title="Excluir Participante"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* EDIT PARTICIPANT MODAL */}
      {editingParticipant && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-2xl w-full my-8 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/20 text-amber-300 rounded-2xl border border-amber-500/30">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Editar Cadastro de Participante</h3>
                  <p className="text-xs text-slate-400">
                    ID: <span className="font-mono text-amber-300">{editingParticipant.id}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseEditModal}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveEdit} className="p-6 overflow-y-auto flex-1 space-y-5 bg-slate-900">
              {editModalError && (
                <div className="bg-rose-500/15 border border-rose-500/40 text-rose-200 p-4 rounded-2xl text-xs flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>{editModalError}</div>
                </div>
              )}

              {/* 1. Informações Básicas */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Dados Pessoais
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Nome Completo */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Nome Completo <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      placeholder="Ex: João da Silva"
                      required
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
                    />
                  </div>

                  {/* Idade */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Idade <span className="text-amber-400">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="number"
                        value={editAge}
                        onChange={(e) => setEditAge(e.target.value === '' ? '' : parseInt(e.target.value))}
                        placeholder="Ex: 24"
                        required
                        min={1}
                        max={120}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-8 pr-3 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Comum Congregação */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Comum Congregação <span className="text-amber-400">*</span>
                  </label>
                  <div className="relative">
                    <Church className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                    <select
                      value={editCongregationSelect}
                      onChange={(e) => setEditCongregationSelect(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-8 pr-3 py-2.5 text-xs text-slate-100 focus:outline-none cursor-pointer"
                    >
                      {activeCongregationsList.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                      <option value="Outra / Digitar Manualmente">Outra / Digitar Manualmente</option>
                    </select>
                  </div>

                  {editCongregationSelect === 'Outra / Digitar Manualmente' && (
                    <input
                      type="text"
                      value={editCustomCongregation}
                      onChange={(e) => setEditCustomCongregation(e.target.value)}
                      placeholder="Digite o nome da Congregação..."
                      required
                      className="w-full mt-2 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
                    />
                  )}
                </div>
              </div>

              {/* 2. Atividades */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <Flag className="w-3.5 h-3.5" /> Atividades no Evento
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Gincana Card Checkbox */}
                  <label
                    className={`p-3 rounded-2xl border cursor-pointer flex items-center gap-3 transition-all ${
                      editParticipatesGincana
                        ? 'bg-amber-500/15 border-amber-500/50 text-amber-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={editParticipatesGincana}
                      onChange={(e) => setEditParticipatesGincana(e.target.checked)}
                      className="hidden"
                    />
                    <div
                      className={`w-5 h-5 rounded-lg border flex items-center justify-center ${
                        editParticipatesGincana
                          ? 'bg-amber-500 border-amber-500 text-slate-950 font-bold'
                          : 'border-slate-700 bg-slate-900'
                      }`}
                    >
                      {editParticipatesGincana && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1">
                        <Flag className="w-3.5 h-3.5 text-amber-400" /> Participar da Gincana
                      </div>
                      <div className="text-[11px] text-slate-400">Jogos e dinâmicas em equipe</div>
                    </div>
                  </label>

                  {/* Tocata Card Checkbox */}
                  <label
                    className={`p-3 rounded-2xl border cursor-pointer flex items-center gap-3 transition-all ${
                      editParticipatesTocata
                        ? 'bg-sky-500/15 border-sky-500/50 text-sky-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={editParticipatesTocata}
                      onChange={(e) => setEditParticipatesTocata(e.target.checked)}
                      className="hidden"
                    />
                    <div
                      className={`w-5 h-5 rounded-lg border flex items-center justify-center ${
                        editParticipatesTocata
                          ? 'bg-sky-500 border-sky-500 text-slate-950 font-bold'
                          : 'border-slate-700 bg-slate-900'
                      }`}
                    >
                      {editParticipatesTocata && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1">
                        <Music className="w-3.5 h-3.5 text-sky-400" /> Participar da Tocata
                      </div>
                      <div className="text-[11px] text-slate-400">Hinos com instrumento musical ou canto</div>
                    </div>
                  </label>
                </div>

                {/* Instrument field if Tocata is enabled */}
                {editParticipatesTocata && (
                  <div className="bg-slate-950/80 p-3 rounded-2xl border border-sky-500/20 space-y-2">
                    <label className="block text-xs font-semibold text-sky-300">
                      Instrumento Musical ou Canto
                    </label>
                    <input
                      type="text"
                      value={editInstrument}
                      onChange={(e) => setEditInstrument(e.target.value)}
                      placeholder="Ex: Violino, Órgão, Canto, Trombone..."
                      className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
                    />

                    {/* Quick suggestion tags */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Sugestões:</span>
                      {SUGGESTED_INSTRUMENTS.slice(0, 7).map((inst) => (
                        <button
                          key={inst}
                          type="button"
                          onClick={() => setEditInstrument(inst)}
                          className="px-2 py-0.5 bg-slate-900 hover:bg-sky-500/20 border border-slate-800 hover:border-sky-500/40 text-[10px] text-slate-300 hover:text-sky-300 rounded-md transition-colors cursor-pointer"
                        >
                          {inst}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Alimento ou Bebida */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5 text-purple-400" /> Alimento / Bebida para o Evento
                </h4>
                <div>
                  <input
                    type="text"
                    value={editFoodOrDrink}
                    onChange={(e) => setEditFoodOrDrink(e.target.value)}
                    placeholder="Ex: Suco de Maracujá 2L, Bolo de Cenoura, Refrigerante..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap pt-2">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Comuns:</span>
                    {SUGGESTED_FOODS.map((food) => (
                      <button
                        key={food}
                        type="button"
                        onClick={() => setEditFoodOrDrink(food)}
                        className="px-2 py-0.5 bg-slate-950 hover:bg-purple-500/20 border border-slate-800 hover:border-purple-500/40 text-[10px] text-slate-300 hover:text-purple-300 rounded-md transition-colors cursor-pointer"
                      >
                        {food}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4. Status do Comprovante e Valor de Pagamento */}
              <div className="space-y-4 pt-3 border-t border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Status do Comprovante & Valor Contribuído
                </h4>

                {/* Valor Contribuído pelo Participante */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-emerald-400" /> Valor Contribuído (R$)
                    </label>
                    <span className="text-[11px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                      Padrão de Inscrição: <strong>R$ 20,00</strong>
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                    <div className="relative w-full sm:w-44">
                      <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">R$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={editAmountPaid}
                        onChange={(e) => {
                          const val = e.target.value;
                          // Allow digits, comma and dot
                          if (val === '' || /^[0-9]*[.,]?[0-9]{0,2}$/.test(val)) {
                            setEditAmountPaid(val);
                          }
                        }}
                        onBlur={() => {
                          const trimmed = editAmountPaid.trim();
                          if (trimmed === '') {
                            setEditAmountPaid('0.00');
                          } else {
                            const num = parseFloat(trimmed.replace(',', '.'));
                            if (!isNaN(num)) {
                              setEditAmountPaid(num.toFixed(2));
                            }
                          }
                        }}
                        placeholder="20.00"
                        className="w-full bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-xl pl-9 pr-3 py-2 text-sm font-black text-amber-300 focus:outline-none"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                      {[
                        { label: 'R$ 20,00 (Padrão)', val: 20 },
                        { label: 'R$ 25,00', val: 25 },
                        { label: 'R$ 30,00', val: 30 },
                        { label: 'R$ 50,00', val: 50 },
                        { label: 'Isento (R$ 0)', val: 0 }
                      ].map((preset) => {
                        const curNum = parseFloat(String(editAmountPaid).replace(',', '.'));
                        const isSelected = !isNaN(curNum) && Math.abs(curNum - preset.val) < 0.001;
                        return (
                          <button
                            key={preset.val}
                            type="button"
                            onClick={() => setEditAmountPaid(preset.val.toFixed(2))}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-amber-500/25 text-amber-300 border-amber-500 shadow-sm'
                                : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                            }`}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    O administrador pode ajustar livremente este valor. Ele será sincronizado diretamente na base Supabase e atualizará a receita geral do evento.
                  </p>
                </div>

                {/* Status Selector Pills */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Status Atual da Inscrição
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['Pendente', 'Analisando', 'Aprovado', 'Rejeitado'] as ProofStatus[]).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setEditProofStatus(st)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                          editProofStatus === st
                            ? st === 'Aprovado'
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                              : st === 'Analisando'
                              ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-md shadow-sky-500/20'
                              : st === 'Rejeitado'
                              ? 'bg-rose-500 text-slate-950 border-rose-400 shadow-md shadow-rose-500/20'
                              : 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comprovante atual / novo / remover */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">Arquivo de Comprovante:</span>
                    {((editingParticipant.proofUrl && !editProofRemoved) || editProofFile) && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditProofFile(null);
                          setEditProofRemoved(true);
                        }}
                        className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" /> Remover Comprovante
                      </button>
                    )}
                  </div>

                  {/* Preview if exists */}
                  {!editProofRemoved && (editProofFile || editingParticipant.proofUrl) ? (
                    <div className="flex items-center gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
                      {editProofFile?.type === 'pdf' || (!editProofFile && editingParticipant.proofFileType === 'pdf') ? (
                        <FileText className="w-8 h-8 text-amber-400 shrink-0" />
                      ) : (
                        <img
                          src={editProofFile?.url || editingParticipant.proofUrl || ''}
                          alt="Comprovante"
                          className="w-12 h-12 object-cover rounded-lg border border-slate-700 shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">
                          {editProofFile?.name || editingParticipant.proofFileName || 'comprovante_pagamento'}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {editProofFile ? 'Novo arquivo anexado' : 'Arquivo atual salvo'}
                        </p>
                      </div>
                      {(editingParticipant.proofUrl && !editProofFile) && (
                        <a
                          href={editingParticipant.proofUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-xs"
                          title="Abrir em nova aba"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">Nenhum comprovante anexado atualmente.</p>
                  )}

                  {/* Input upload file */}
                  <div>
                    <label className="inline-flex items-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 hover:border-amber-500/60 rounded-xl text-xs font-bold transition-colors cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      {editingParticipant.proofUrl && !editProofRemoved ? 'Substituir por Novo Arquivo' : 'Anexar Comprovante'}
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleEditProofFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* 5. Observações Internas */}
              <div className="space-y-2 pt-3 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Observações / Anotações Administrativas
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {editNotes.length} caracteres
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Ex: Pagamento confirmado via Pix em dinheiro, precisa de carona, observação alimentar especial, etc..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none resize-none leading-relaxed"
                />
                <p className="text-[11px] text-slate-500">
                  As anotações administrativas são salvas diretamente no cadastro do participante no Supabase e ficam visíveis na tabela e relatórios.
                </p>
              </div>

              {/* Footer Controls inside Form */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3 sticky bottom-0 bg-slate-900/95 py-2">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSavingEdit ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Salvar Alterações
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Proof Viewer Modal */}
      {viewingProofParticipant && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-white">Comprovante de Pagamento</h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${
                      viewingProofParticipant.proofStatus === 'Aprovado'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : viewingProofParticipant.proofStatus === 'Analisando'
                        ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                        : viewingProofParticipant.proofStatus === 'Rejeitado'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}
                  >
                    {viewingProofParticipant.proofStatus}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  <strong className="text-slate-200">{viewingProofParticipant.fullName}</strong> • {viewingProofParticipant.congregation} • {viewingProofParticipant.age} anos
                </p>
              </div>
              <button
                onClick={() => setViewingProofParticipant(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content / Preview */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center bg-slate-950 min-h-[320px]">
              {viewingProofParticipant.proofUrl ? (
                isPdfDocument(
                  viewingProofParticipant.proofFileType,
                  viewingProofParticipant.proofFileName,
                  viewingProofParticipant.proofUrl
                ) ? (
                  <div className="w-full flex flex-col items-center space-y-3">
                    {/* Embedded PDF Viewer */}
                    <div className="w-full h-[420px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-inner relative">
                      <iframe
                        src={getDisplayableProofUrl(viewingProofParticipant.proofUrl)}
                        title="Visualizador de PDF do Comprovante"
                        className="w-full h-full border-0 bg-white"
                      />
                    </div>

                    {/* PDF Actions & Info */}
                    <div className="flex flex-wrap items-center justify-between gap-2 w-full pt-1">
                      <div className="flex items-center gap-2 text-xs text-slate-300">
                        <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="font-semibold truncate max-w-[200px] sm:max-w-xs">
                          {viewingProofParticipant.proofFileName || 'comprovante.pdf'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openProofInNewTab(
                              viewingProofParticipant.proofUrl,
                              viewingProofParticipant.proofFileName || 'comprovante.pdf'
                            )
                          }
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-xl font-bold text-xs cursor-pointer transition-colors flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" /> Abrir em Nova Aba
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            downloadProofFile(
                              viewingProofParticipant.proofUrl,
                              viewingProofParticipant.proofFileName || 'comprovante.pdf'
                            )
                          }
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold text-xs cursor-pointer transition-colors flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" /> Baixar PDF
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-center space-y-3">
                    <div className="max-h-[420px] w-full flex items-center justify-center p-2 rounded-2xl border border-slate-800 bg-slate-900/50">
                      <img
                        src={getDisplayableProofUrl(viewingProofParticipant.proofUrl)}
                        alt="Comprovante de pagamento"
                        className="max-h-[390px] max-w-full object-contain rounded-xl shadow-lg"
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 w-full pt-1">
                      <span className="text-xs text-slate-400 truncate">
                        {viewingProofParticipant.proofFileName || 'imagem_comprovante'}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openProofInNewTab(
                              viewingProofParticipant.proofUrl,
                              viewingProofParticipant.proofFileName || 'comprovante.png'
                            )
                          }
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-xl font-bold text-xs cursor-pointer transition-colors flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" /> Ver Imagem Completa
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            downloadProofFile(
                              viewingProofParticipant.proofUrl,
                              viewingProofParticipant.proofFileName || 'comprovante.png'
                            )
                          }
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold text-xs cursor-pointer transition-colors flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" /> Baixar Imagem
                        </button>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div className="text-center py-10">
                  <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm font-semibold">Nenhum comprovante anexado a este participante.</p>
                  <p className="text-slate-500 text-xs mt-1">O participante pode anexar o comprovante na tela de consulta de comprovante.</p>
                </div>
              )}
            </div>

            {/* Modal Footer Controls with all 4 status states */}
            <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Alterar Status para:</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(viewingProofParticipant.id, 'Aprovado')}
                  className={`px-3 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                    viewingProofParticipant.proofStatus === 'Aprovado'
                      ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-400'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                  }`}
                >
                  <Check className="w-4 h-4" /> Aprovar
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateStatus(viewingProofParticipant.id, 'Analisando')}
                  className={`px-3 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                    viewingProofParticipant.proofStatus === 'Analisando'
                      ? 'bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/20 ring-2 ring-sky-400'
                      : 'bg-sky-500/20 text-sky-300 border border-sky-500/40 hover:bg-sky-500/30'
                  }`}
                >
                  <RefreshCw className="w-4 h-4" /> Em Análise
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateStatus(viewingProofParticipant.id, 'Rejeitado')}
                  className={`px-3 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                    viewingProofParticipant.proofStatus === 'Rejeitado'
                      ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20 ring-2 ring-rose-400'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                  }`}
                >
                  <X className="w-4 h-4" /> Rejeitar
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateStatus(viewingProofParticipant.id, 'Pendente')}
                  className={`px-3 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                    viewingProofParticipant.proofStatus === 'Pendente'
                      ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 ring-2 ring-amber-400'
                      : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  Pendente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable Report Modal */}
      {showPrintPreviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-6 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-3xl max-w-6xl w-full max-h-[95vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
            {/* Top Toolbar (Hidden on Print) */}
            <div className="p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 print:hidden">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white">Visualização de Impressão do Relatório</h3>
                  <p className="text-xs text-slate-400">Pronto para imprimir em folha A4 ou salvar como PDF no navegador</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <Printer className="w-4 h-4" /> Imprimir / Salvar PDF
                </button>
                <button
                  onClick={handleExportExcel}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Excel (.xlsx)
                </button>
                <button
                  onClick={() => setShowPrintPreviewModal(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Printable Body */}
            <div className="p-6 sm:p-10 overflow-y-auto flex-1 bg-white print:p-0">
              {/* Official Header */}
              <div className="border-b-2 border-slate-900 pb-4 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
                <div>
                  <div className="inline-block px-2.5 py-0.5 bg-amber-100 text-amber-900 rounded font-bold text-xs mb-1 uppercase tracking-wider">
                    Evento Oficial
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    SOMOS JÓIAS PRECIOSAS
                  </h1>
                  <p className="text-xs text-slate-600 font-semibold mt-0.5">
                    Relatório Oficial de Participantes Inscritos na Gincana e Tocata
                  </p>
                </div>
                <div className="text-right text-xs text-slate-600 space-y-0.5">
                  <p><strong>Emissão:</strong> {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                  <p><strong>Registros Listados:</strong> {filteredParticipants.length} participante(s)</p>
                  {filterCongregation !== 'ALL' && <p><strong>Filtro Comum:</strong> {filterCongregation}</p>}
                </div>
              </div>

              {/* KPI Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <span className="text-[11px] font-bold text-slate-500 block uppercase">Total Inscritos</span>
                  <strong className="text-2xl font-black text-slate-900">{filteredParticipants.length}</strong>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <span className="text-[11px] font-bold text-slate-500 block uppercase">Gincana</span>
                  <strong className="text-2xl font-black text-amber-700">
                    {filteredParticipants.filter(p => p.activities?.gincana).length}
                  </strong>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <span className="text-[11px] font-bold text-slate-500 block uppercase">Tocata</span>
                  <strong className="text-2xl font-black text-sky-700">
                    {filteredParticipants.filter(p => p.activities?.tocata).length}
                  </strong>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <span className="text-[11px] font-bold text-slate-500 block uppercase">Com Comprovante</span>
                  <strong className="text-2xl font-black text-emerald-700">
                    {filteredParticipants.filter(p => p.proofUrl).length}
                  </strong>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center col-span-2 sm:col-span-1">
                  <span className="text-[11px] font-bold text-slate-500 block uppercase">Mantimentos</span>
                  <strong className="text-2xl font-black text-purple-700">
                    {filteredParticipants.filter(p => p.foodOrDrink && p.foodOrDrink.trim().length > 0).length}
                  </strong>
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold">
                      <th className="py-2.5 px-2 border-b border-slate-800 text-center w-10">#</th>
                      <th className="py-2.5 px-3 border-b border-slate-800">Nome Completo</th>
                      <th className="py-2.5 px-3 border-b border-slate-800">Comum Congregação</th>
                      <th className="py-2.5 px-2 border-b border-slate-800 text-center w-12">Idade</th>
                      <th className="py-2.5 px-2 border-b border-slate-800 text-center w-16">Gincana</th>
                      <th className="py-2.5 px-2 border-b border-slate-800 text-center w-16">Tocata</th>
                      <th className="py-2.5 px-3 border-b border-slate-800">Instrumento</th>
                      <th className="py-2.5 px-3 border-b border-slate-800">Alimento / Bebida</th>
                      <th className="py-2.5 px-3 border-b border-slate-800 text-right">Valor (R$)</th>
                      <th className="py-2.5 px-3 border-b border-slate-800 text-center">Comprovante</th>
                      <th className="py-2.5 px-3 border-b border-slate-800">Observações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredParticipants.map((p, index) => (
                      <tr key={p.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                        <td className="py-2 px-2 text-center font-bold text-slate-500">{index + 1}</td>
                        <td className="py-2 px-3 font-bold text-slate-900">{p.fullName}</td>
                        <td className="py-2 px-3 text-slate-700">{p.congregation}</td>
                        <td className="py-2 px-2 text-center text-slate-700">{p.age}</td>
                        <td className="py-2 px-2 text-center">
                          {p.activities?.gincana ? (
                            <span className="font-bold text-amber-700">Sim</span>
                          ) : (
                            <span className="text-slate-400">Não</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center">
                          {p.activities?.tocata ? (
                            <span className="font-bold text-sky-700">Sim</span>
                          ) : (
                            <span className="text-slate-400">Não</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-700 font-medium">
                          {p.activities?.instrument || '-'}
                        </td>
                        <td className="py-2 px-3 text-slate-700 font-medium">
                          {p.foodOrDrink || '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">
                          R$ {(p.amountPaid !== undefined && p.amountPaid !== null ? Number(p.amountPaid) : 20).toFixed(2).replace('.', ',')}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {p.proofUrl ? (
                            <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Sim ({p.proofStatus})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-amber-100 text-amber-800 border border-amber-300">
                              Pendente
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-500 italic text-[11px]">
                          {p.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Document Footer */}
              <div className="mt-8 pt-4 border-t border-slate-300 text-center text-xs text-slate-500 flex justify-between items-center">
                <span>Relatório Gerado Eletronicamente — Evento Somos Jóias Preciosas</span>
                <span>Página 1</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
