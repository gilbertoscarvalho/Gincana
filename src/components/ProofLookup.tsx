import React, { useState } from 'react';
import { Search, FileCheck, CheckCircle2, AlertCircle, Upload, FileText, User, Church, Calendar, ArrowRight, X, QrCode, Copy, Check, MessageCircle, ExternalLink } from 'lucide-react';
import { Participant } from '../types';

const DEFAULT_PIX_KEY = 'gincana.joias2026@gmail.com';
const DEFAULT_WHATSAPP_GROUP = 'https://chat.whatsapp.com/Bf4nIjDR6QCFXEuxm7S3gK';

interface ProofLookupProps {
  onUpdated: () => void;
  proofPhoneNumber?: string;
  pixKey?: string;
  whatsappGroupUrl?: string;
}

export const ProofLookup: React.FC<ProofLookupProps> = ({ onUpdated, pixKey, whatsappGroupUrl }) => {
  const activePixKey = pixKey || DEFAULT_PIX_KEY;
  const activeWhatsappGroup = whatsappGroupUrl || DEFAULT_WHATSAPP_GROUP;

  const [firstName, setFirstName] = useState('');
  const [congregation, setCongregation] = useState('');
  const [age, setAge] = useState<number | ''>('');

  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Participant[] | null>(null);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);

  // New proof attachment state
  const [proofFile, setProofFile] = useState<{
    url: string;
    name: string;
    type: 'image' | 'pdf';
  } | null>(null);

  const [isSavingProof, setIsSavingProof] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedGroupLink, setCopiedGroupLink] = useState(false);

  const handleCopyPix = () => {
    navigator.clipboard.writeText(activePixKey);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2500);
  };

  const handleCopyGroupLink = () => {
    navigator.clipboard.writeText(activeWhatsappGroup);
    setCopiedGroupLink(true);
    setTimeout(() => setCopiedGroupLink(false), 2500);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError(null);
    setSearchResults(null);
    setSelectedParticipant(null);
    setSaveSuccess(null);

    const cleanFirstName = firstName.trim();
    const cleanCongregation = congregation.trim();

    if (!cleanFirstName || !cleanCongregation || age === '') {
      setSearchError('Por favor preencha todos os 3 campos (Primeiro nome, Congregação e Idade).');
      return;
    }

    setIsSearching(true);

    try {
      let foundParticipants: Participant[] = [];

      // 1. Try server API first
      try {
        let res = await fetch('/api/participants/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: cleanFirstName,
            congregation: cleanCongregation,
            age: Number(age)
          })
        });

        if (!res.ok) {
          try {
            const fallbackRes = await fetch('/participants/lookup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                firstName: cleanFirstName,
                congregation: cleanCongregation,
                age: Number(age)
              })
            });
            if (fallbackRes.ok) res = fallbackRes;
          } catch {}
        }

        if (res.ok) {
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await res.json();
            if (data && Array.isArray(data.participants) && data.participants.length > 0) {
              foundParticipants = data.participants;
            }
          }
        }
      } catch (serverErr) {
        console.warn('Notice: Server lookup offline, searching local cache:', serverErr);
      }

      // 2. If not found or server offline, search in local browser storage
      if (foundParticipants.length === 0) {
        try {
          const localStored = localStorage.getItem('ccb_gincana_local_participants');
          if (localStored) {
            const list: Participant[] = JSON.parse(localStored);
            const searchFirst = cleanFirstName.toLowerCase();
            const searchCong = cleanCongregation.toLowerCase();
            const searchAge = Number(age);

            const matches = list.filter((p) => {
              const matchFirst =
                (p.firstName || '').toLowerCase() === searchFirst ||
                (p.fullName || '').toLowerCase().startsWith(searchFirst) ||
                (p.fullName || '').toLowerCase().includes(searchFirst);

              const matchCong =
                (p.congregation || '').toLowerCase().includes(searchCong) ||
                searchCong.includes((p.congregation || '').toLowerCase());

              const matchAge = Number(p.age) === searchAge;

              return matchFirst && matchCong && matchAge;
            });

            if (matches.length > 0) {
              foundParticipants = matches;
            }
          }
        } catch (localErr) {
          console.warn('Notice: Local search read error:', localErr);
        }
      }

      if (foundParticipants.length > 0) {
        setSearchResults(foundParticipants);
        if (foundParticipants.length === 1) {
          setSelectedParticipant(foundParticipants[0]);
        }
      } else {
        setSearchError('Nenhum cadastro foi encontrado com os dados informados. Verifique o primeiro nome, a comum congregação e a idade.');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setSearchError(err.message);
      } else {
        setSearchError('Erro ao buscar cadastro.');
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setSearchError('O arquivo é muito grande. Tamanho máximo permitido: 10MB.');
      return;
    }

    const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
    const isImg = file.type.startsWith('image/');

    if (!isPdf && !isImg) {
      setSearchError('Por favor envie uma Imagem (JPG, PNG) ou arquivo PDF.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      let finalUrl = reader.result as string;

      // Try uploading file directly to Vercel Blob
      try {
        const blobRes = await fetch('/api/blob/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: `comprovante_${Date.now()}_${file.name}`,
            content: finalUrl,
            contentType: isPdf ? 'application/pdf' : 'image/jpeg'
          })
        });
        if (blobRes.ok) {
          const blobData = await blobRes.json();
          if (blobData.url) {
            finalUrl = blobData.url;
          }
        }
      } catch (err) {
        console.warn('Note: Blob upload fallback to inline data:', err);
      }

      setProofFile({
        url: finalUrl,
        name: file.name,
        type: isPdf ? 'pdf' : 'image'
      });
      setSearchError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProof = async () => {
    if (!selectedParticipant) return;
    if (!proofFile) {
      setSearchError('Por favor selecione o arquivo do comprovante primeiro.');
      return;
    }

    setIsSavingProof(true);
    setSearchError(null);

    const updatedParticipant: Participant = {
      ...selectedParticipant,
      proofUrl: proofFile.url,
      proofFileName: proofFile.name,
      proofFileType: proofFile.type,
      proofStatus: 'Analisando',
      updatedAt: new Date().toISOString()
    };

    try {
      // 1. Send update to server
      try {
        let res = await fetch(`/api/participants/${selectedParticipant.id}/proof`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            proofUrl: proofFile.url,
            proofFileName: proofFile.name,
            proofFileType: proofFile.type
          })
        });

        if (!res.ok) {
          try {
            const fallbackRes = await fetch(`/participants/${selectedParticipant.id}/proof`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                proofUrl: proofFile.url,
                proofFileName: proofFile.name,
                proofFileType: proofFile.type
              })
            });
            if (fallbackRes.ok) res = fallbackRes;
          } catch {}
        }
      } catch (serverErr) {
        console.warn('Notice: Server proof update offline, saved locally:', serverErr);
      }

      // 2. Always persist locally & sync
      try {
        const stored = localStorage.getItem('ccb_gincana_local_participants');
        let currentList: Participant[] = stored ? JSON.parse(stored) : [];
        const idx = currentList.findIndex((p) => p.id === selectedParticipant.id);
        if (idx !== -1) {
          currentList[idx] = updatedParticipant;
        } else {
          currentList.unshift(updatedParticipant);
        }
        localStorage.setItem('ccb_gincana_local_participants', JSON.stringify(currentList));
      } catch (e) {}

      // 3. Dispatch update event for all components
      try {
        window.dispatchEvent(new CustomEvent('ccb_participant_registered', { detail: updatedParticipant }));
      } catch (e) {}

      setSelectedParticipant(updatedParticipant);
      setSaveSuccess('Comprovante enviado com sucesso! O status foi atualizado para Em Análise.');
      setProofFile(null);
      onUpdated();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setSearchError(err.message);
      } else {
        setSearchError('Erro ao salvar comprovante.');
      }
    } finally {
      setIsSavingProof(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto my-6 px-4">
      {/* Banner */}
      <div className="bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-900 border border-amber-500/30 rounded-3xl p-6 mb-6 shadow-xl">
        <h2 className="text-2xl font-extrabold text-amber-200 flex items-center gap-2">
          <FileCheck className="w-6 h-6 text-amber-400" />
          Anexar Comprovante de Pagamento
        </h2>
        <p className="text-slate-300 text-sm mt-1">
          Informe os seus dados cadastrais para reabrir sua ficha e enviar a foto ou PDF do comprovante do Pix/Pagamento.
        </p>
      </div>

      {/* PIX Payment Key Card */}
      <div className="bg-gradient-to-r from-amber-500/10 via-slate-950 to-emerald-500/10 border border-amber-500/40 rounded-3xl p-5 mb-6 space-y-3 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/20 text-amber-300 rounded-2xl border border-amber-500/30 shrink-0">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-amber-400 block">
                Chave PIX Oficial para Pagamento
              </span>
              <p className="text-sm font-extrabold text-white mt-0.5 flex items-center gap-1.5 flex-wrap">
                Chave PIX (E-mail):{' '}
                <span className="font-mono text-amber-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 select-all">
                  {activePixKey}
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyPix}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 ${
              copiedPix
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 scale-105'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 active:scale-95'
            }`}
          >
            {copiedPix ? (
              <>
                <Check className="w-4 h-4" />
                <span>Chave PIX Copiada!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copiar Chave PIX</span>
              </>
            )}
          </button>
        </div>

        <div className="pt-2.5 border-t border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2.5 text-xs text-slate-200">
            <MessageCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Envio do Comprovante via WhatsApp</span>
              <p className="text-xs text-slate-200 mt-0.5">
                O envio dos comprovantes deve ser feito no <strong className="text-emerald-300">Grupo Oficial do WhatsApp</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyGroupLink}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                copiedGroupLink
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              {copiedGroupLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedGroupLink ? 'Link Copiado!' : 'Copiar Link'}</span>
            </button>

            <a
              href={activeWhatsappGroup}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Entrar no Grupo</span>
            </a>
          </div>
        </div>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
        {searchError && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-2xl text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>{searchError}</div>
          </div>
        )}

        {saveSuccess && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-4 rounded-2xl text-sm flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>{saveSuccess}</div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* 1. Primeiro Nome */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              1. Primeiro Nome <span className="text-amber-400">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Ex: Mateus"
                required
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
              />
            </div>
          </div>

          {/* 2. Comum Congregação */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              2. Comum Congregação <span className="text-amber-400">*</span>
            </label>
            <div className="relative">
              <Church className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              <input
                type="text"
                value={congregation}
                onChange={(e) => setCongregation(e.target.value)}
                placeholder="Ex: Central"
                required
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
              />
            </div>
          </div>

          {/* 3. Idade */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              3. Idade <span className="text-amber-400">*</span>
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value === '' ? '' : parseInt(e.target.value))}
                placeholder="Ex: 19"
                required
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSearching}
          className="w-full py-3.5 rounded-2xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
        >
          {isSearching ? (
            <>
              <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              Buscando no banco de dados...
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              Localizar Meu Cadastro
            </>
          )}
        </button>
      </form>

      {/* Multiple Results Selector (If more than one match) */}
      {searchResults && searchResults.length > 1 && !selectedParticipant && (
        <div className="mt-6 bg-slate-900 border border-slate-800 rounded-3xl p-6">
          <h3 className="text-base font-bold text-amber-300 mb-3">
            Encontramos {searchResults.length} cadastros correspondentes. Selecione o seu:
          </h3>
          <div className="space-y-3">
            {searchResults.map((p) => (
              <div
                key={p.id}
                onClick={() => setSelectedParticipant(p)}
                className="p-4 bg-slate-950 border border-slate-800 hover:border-amber-500/50 rounded-2xl cursor-pointer transition-all flex items-center justify-between"
              >
                <div>
                  <p className="font-bold text-white">{p.fullName}</p>
                  <p className="text-xs text-slate-400">
                    Congregação: <strong className="text-slate-200">{p.congregation}</strong> • Idade: {p.age} anos
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-amber-400" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Participant Card & Attachment Section */}
      {selectedParticipant && (
        <div className="mt-6 bg-slate-900 border border-amber-500/40 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs text-amber-400 font-semibold uppercase tracking-wider">
                Cadastro Localizado
              </span>
              <h3 className="text-xl font-extrabold text-white">{selectedParticipant.fullName}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {selectedParticipant.congregation} • {selectedParticipant.age} anos
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${
                selectedParticipant.proofStatus === 'Aprovado'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : selectedParticipant.proofStatus === 'Analisando'
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              }`}
            >
              Status Comprovante: {selectedParticipant.proofStatus}
            </span>
          </div>

          {/* Current Proof Info if exists */}
          {selectedParticipant.proofUrl && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-amber-400" />
                <div>
                  <p className="text-xs text-slate-400">Comprovante atual anexado:</p>
                  <p className="text-sm font-semibold text-white">{selectedParticipant.proofFileName || 'comprovante.png'}</p>
                </div>
              </div>
              <a
                href={selectedParticipant.proofUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-amber-300 underline font-semibold"
              >
                Visualizar Arquivo
              </a>
            </div>
          )}

          {/* Upload New Proof File Box */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-amber-200">
              {selectedParticipant.proofUrl ? 'Substituir ou Atualizar Comprovante' : 'Anexar Foto ou PDF do Comprovante'}
            </label>

            {!proofFile ? (
              <div className="border-2 border-dashed border-amber-500/40 hover:border-amber-400 rounded-2xl p-6 text-center bg-slate-950 relative cursor-pointer group">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="flex flex-col items-center gap-2">
                  <div className="p-3 bg-amber-500/10 text-amber-400 rounded-full group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-bold text-amber-300">
                    Clique aqui para selecionar a Foto ou PDF do Comprovante
                  </span>
                  <span className="text-xs text-slate-400">
                    (Formatos suportados: PNG, JPG, WEBP, PDF - até 10MB)
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-slate-950 border border-emerald-500/40 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                  <FileText className="w-6 h-6 text-emerald-400 shrink-0" />
                  <div className="truncate">
                    <p className="text-sm font-bold text-white truncate">{proofFile.name}</p>
                    <p className="text-xs text-emerald-400">Arquivo pronto para ser salvo!</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setProofFile(null)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleSaveProof}
              disabled={isSavingProof || !proofFile}
              className="flex-1 py-3.5 rounded-2xl bg-amber-500 text-slate-950 font-extrabold hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSavingProof ? (
                <>
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  Salvando no Banco de Dados...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Salvar e Confirmar Comprovante
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
