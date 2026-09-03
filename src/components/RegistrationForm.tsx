import React, { useState } from 'react';
import { User, Church, Calendar, Utensils, Flag, Music, Upload, CheckCircle2, AlertCircle, FileText, X, QrCode, Copy, Check, MessageCircle, ExternalLink } from 'lucide-react';
import { Participant } from '../types';
import { saveParticipantToSupabaseDirect, uploadFileToSupabaseStorage } from '../lib/supabase';

const DEFAULT_PIX_KEY = 'gincana.joias2026@gmail.com';
const DEFAULT_WHATSAPP_GROUP = 'https://chat.whatsapp.com/Bf4nIjDR6QCFXEuxm7S3gK';

interface RegistrationFormProps {
  congregations?: string[];
  proofPhoneNumber?: string;
  pixKey?: string;
  whatsappGroupUrl?: string;
  onSuccess: (newParticipant: Participant) => void;
  onGoToLookup: () => void;
}

const DEFAULT_CONGREGATIONS = [
  'Central',
  'Jardim Primavera',
  'Vila Nova',
  'Bela Vista',
  'Parque das Flores',
  'Jardim América',
  'São José',
  'Outra / Digitar Manualmente'
];

export const RegistrationForm: React.FC<RegistrationFormProps> = ({
  congregations,
  pixKey,
  whatsappGroupUrl,
  onSuccess,
  onGoToLookup
}) => {
  const activePixKey = pixKey || DEFAULT_PIX_KEY;
  const activeWhatsappGroup = whatsappGroupUrl || DEFAULT_WHATSAPP_GROUP;

  const congregationOptions = congregations && congregations.length > 0 
    ? [...congregations, 'Outra / Digitar Manualmente'] 
    : DEFAULT_CONGREGATIONS;

  const [fullName, setFullName] = useState('');
  const [congregationSelect, setCongregationSelect] = useState(congregationOptions[0] || 'Central');
  const [customCongregation, setCustomCongregation] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [foodOrDrink, setFoodOrDrink] = useState('');
  
  // Activities
  const [participatesGincana, setParticipatesGincana] = useState(true);
  const [participatesTocata, setParticipatesTocata] = useState(false);
  const [instrument, setInstrument] = useState('');

  // Proof File State
  const [proofFile, setProofFile] = useState<{
    url: string;
    name: string;
    type: 'image' | 'pdf';
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [registeredSuccess, setRegisteredSuccess] = useState<Participant | null>(null);
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

  // Helper to compress uploaded images for small payload sizes
  // Compress image to small JPEG Blob (< 150 KB) to radically eliminate bandwidth / egress consumption
  const compressImageToBlob = (file: File, maxDimension = 1200, quality = 0.75): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
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
            canvas.toBlob(
              (blob) => resolve(blob || file),
              'image/jpeg',
              quality
            );
          } else {
            resolve(file);
          }
        };
        img.onerror = () => resolve(file);
        img.src = reader.result as string;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  };

  // File handle: Compresses file and uploads directly to Supabase Storage CDN (Zero Base64 in PostgreSQL!)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg('O arquivo é muito grande. Tamanho máximo permitido: 15MB.');
      return;
    }

    const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
    const isImg = file.type.startsWith('image/');

    if (!isPdf && !isImg) {
      setErrorMsg('Formato inválido. Por favor envie uma Imagem (JPG, PNG) ou arquivo PDF.');
      return;
    }

    setErrorMsg(null);

    try {
      let uploadPayload: Blob = file;
      if (isImg) {
        uploadPayload = await compressImageToBlob(file, 1200, 0.75);
      }

      // 1. Direct upload to Supabase Storage 'comprovantes' bucket
      let publicUrl = await uploadFileToSupabaseStorage(uploadPayload, `comp_${Date.now()}_${file.name}`);

      // 2. Fallback upload to server proxy if direct bucket upload had network block
      if (!publicUrl) {
        try {
          const formData = new FormData();
          formData.append('file', uploadPayload, file.name);
          const serverRes = await fetch('/api/upload/proof', {
            method: 'POST',
            body: formData
          });
          if (serverRes.ok) {
            const serverData = await serverRes.json();
            if (serverData.url) {
              publicUrl = serverData.url;
            }
          }
        } catch {}
      }

      // 3. Fallback to blob upload endpoint
      if (!publicUrl) {
        try {
          const base64Str = await new Promise<string>((res) => {
            const r = new FileReader();
            r.onload = () => res(r.result as string);
            r.readAsDataURL(uploadPayload);
          });
          const blobRes = await fetch('/api/blob/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: `comprovante_${Date.now()}_${file.name}`,
              content: base64Str,
              contentType: isPdf ? 'application/pdf' : 'image/jpeg'
            })
          });
          if (blobRes.ok) {
            const blobData = await blobRes.json();
            if (blobData.url) publicUrl = blobData.url;
          }
        } catch {}
      }

      // Safe fallback if completely offline
      if (!publicUrl) {
        const localPreviewUrl = URL.createObjectURL(uploadPayload);
        publicUrl = localPreviewUrl;
      }

      setProofFile({
        url: publicUrl,
        name: file.name,
        type: isPdf ? 'pdf' : 'image'
      });
    } catch (err: any) {
      console.warn('Erro ao processar comprovante:', err);
      setErrorMsg('Não foi possível processar o arquivo. Tente novamente.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanName = fullName.trim();
    if (!cleanName) {
      setErrorMsg('Por favor informe o Nome Completo.');
      return;
    }

    const isCustom = congregationSelect === 'Outra / Digitar Manualmente' || congregationSelect === 'Outra (Especifique abaixo)';
    const finalCongregation = isCustom ? customCongregation.trim() : congregationSelect;

    if (!finalCongregation) {
      setErrorMsg('Por favor selecione ou informe a Comum Congregação.');
      return;
    }

    if (age === '' || Number(age) <= 0) {
      setErrorMsg('Por favor informe uma idade válida.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        fullName: cleanName,
        congregation: finalCongregation,
        age: Number(age),
        foodOrDrink: foodOrDrink.trim(),
        activities: {
          gincana: participatesGincana,
          tocata: participatesTocata,
          instrument: participatesTocata ? instrument.trim() : ''
        },
        proofUrl: proofFile ? proofFile.url : null,
        proofFileName: proofFile ? proofFile.name : null,
        proofFileType: proofFile ? proofFile.type : null,
        amountPaid: 20,
        amount_paid: 20,
        notes: ''
      };

      let participantData: any = null;

      let res = await fetch('/api/participants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        cache: 'no-store',
        body: JSON.stringify(payload)
      });

      if (!res.ok && (res.status === 404 || res.status === 502 || res.status === 503 || res.status === 500)) {
        try {
          const fallbackRes = await fetch('/participants', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            },
            cache: 'no-store',
            body: JSON.stringify(payload)
          });
          if (fallbackRes.ok) {
            res = fallbackRes;
          }
        } catch {}
      }

      if (res.ok) {
        const data = await res.json();
        participantData = data.participant;
      } else {
        // Fallback directly to Supabase table
        const newLocalParticipant: Participant = {
          id: 'p-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
          fullName: payload.fullName,
          firstName: payload.fullName.split(' ')[0].toLowerCase(),
          congregation: payload.congregation,
          age: payload.age,
          foodOrDrink: payload.foodOrDrink,
          activities: payload.activities,
          proofUrl: payload.proofUrl,
          proofFileName: payload.proofFileName,
          proofFileType: payload.proofFileType,
          proofStatus: payload.proofUrl ? 'Analisando' : 'Pendente',
          amountPaid: 20,
          notes: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const directSaved = await saveParticipantToSupabaseDirect(newLocalParticipant);
        if (directSaved) {
          participantData = newLocalParticipant;
        } else {
          const errText = await res.text();
          let errMsg = 'Não foi possível concluir o cadastro no servidor. Verifique sua conexão e tente novamente.';
          try {
            const parsedErr = JSON.parse(errText);
            if (parsedErr.error) errMsg = parsedErr.error;
          } catch {
            if (errText && errText.length < 200 && !errText.includes('FUNCTION_INVOCATION_FAILED')) {
              errMsg = errText;
            }
          }
          throw new Error(errMsg);
        }
      }

      if (!participantData) {
        throw new Error('Não foi possível obter a confirmação do cadastro no servidor.');
      }

      // Guarantee immediate direct persistence to Supabase in parallel
      saveParticipantToSupabaseDirect(participantData).catch(() => {});

      // Notify all tabs and components
      try {
        window.dispatchEvent(new CustomEvent('ccb_participant_registered', { detail: participantData }));
      } catch (e) {}

      setRegisteredSuccess(participantData);
      onSuccess(participantData);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Erro desconhecido ao cadastrar. Verifique sua conexão e tente novamente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setRegisteredSuccess(null);
    setFullName('');
    setAge('');
    setFoodOrDrink('');
    setParticipatesGincana(true);
    setParticipatesTocata(false);
    setInstrument('');
    setProofFile(null);
    setErrorMsg(null);
  };

  if (registeredSuccess) {
    const firstName = registeredSuccess.firstName;
    return (
      <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 text-white shadow-2xl my-6">
        <div className="text-center space-y-4">
          <div className="inline-flex p-4 bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-amber-200">
            Inscrição Realizada com Sucesso!
          </h2>
          <p className="text-slate-300">
            Seja bem-vindo(a) ao evento <strong className="text-amber-300">"Somos Jóias Preciosas"</strong>!
          </p>

          {/* Details Box */}
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 text-left text-sm space-y-2 mt-6">
            <div className="flex justify-between border-b border-slate-700/60 pb-2">
              <span className="text-slate-400">Nome Completo:</span>
              <span className="font-semibold text-white">{registeredSuccess.fullName}</span>
            </div>
            <div className="flex justify-between border-b border-slate-700/60 pb-2">
              <span className="text-slate-400">Comum Congregação:</span>
              <span className="font-semibold text-amber-300">{registeredSuccess.congregation}</span>
            </div>
            <div className="flex justify-between border-b border-slate-700/60 pb-2">
              <span className="text-slate-400">Idade:</span>
              <span className="font-semibold text-white">{registeredSuccess.age} anos</span>
            </div>
            {registeredSuccess.foodOrDrink && (
              <div className="flex justify-between border-b border-slate-700/60 pb-2">
                <span className="text-slate-400">Alimento/Bebida:</span>
                <span className="font-semibold text-amber-200">{registeredSuccess.foodOrDrink}</span>
              </div>
            )}
            <div className="flex justify-between pt-1">
              <span className="text-slate-400">Comprovante de Pagamento:</span>
              <span className={`font-semibold px-2.5 py-0.5 rounded-md text-xs ${
                registeredSuccess.proofUrl 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {registeredSuccess.proofUrl ? 'Anexado / Em Análise' : 'Pendente de envio'}
              </span>
            </div>
          </div>

          {!registeredSuccess.proofUrl && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-xs text-amber-200 text-left space-y-3">
              <div className="flex gap-3 items-start">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1.5 flex-1">
                  <strong className="text-amber-300 text-sm block">Lembrete sobre o pagamento e envio do comprovante:</strong>
                  <p className="text-xs text-slate-200">
                    Chave PIX (E-mail) para transferência: <strong className="font-mono text-amber-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 select-all">{activePixKey}</strong>
                  </p>
                  <p className="text-xs text-emerald-300 font-semibold flex items-center gap-1.5">
                    <MessageCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>O envio do comprovante deve ser feito no <strong>Grupo Oficial do WhatsApp</strong>.</span>
                  </p>
                  <p className="text-xs text-slate-300">
                    A qualquer momento você também pode anexar diretamente no sistema acionando a opção <strong>"Anexar Comprovante"</strong> no topo e informando seu primeiro nome, congregação e idade.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-amber-500/20 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCopyPix}
                  className="px-3.5 py-2 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {copiedPix ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPix ? 'PIX Copiado!' : 'Copiar Chave PIX'}</span>
                </button>

                <a
                  href={activeWhatsappGroup}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Entrar no Grupo do WhatsApp</span>
                </a>
              </div>
            </div>
          )}

          <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleReset}
              className="px-6 py-3 rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20"
            >
              Fazer Novo Cadastro
            </button>
            {!registeredSuccess.proofUrl && (
              <button
                onClick={onGoToLookup}
                className="px-6 py-3 rounded-xl bg-slate-800 text-amber-300 border border-amber-500/30 font-semibold hover:bg-slate-700 transition-all"
              >
                Anexar Comprovante Agora
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto my-6 px-4">
      {/* Header Info Banner */}
      <div className="bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-900 border border-amber-500/30 rounded-3xl p-6 mb-6 shadow-xl">
        <h2 className="text-2xl font-extrabold text-amber-200 flex items-center gap-2">
          <User className="w-6 h-6 text-amber-400" />
          Ficha de Cadastro de Participante
        </h2>
        <p className="text-slate-300 text-sm mt-1">
          Preencha os dados abaixo para participar do evento <strong>Somos Jóias Preciosas</strong> (Gincana e Tocata).
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-2xl text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>{errorMsg}</div>
          </div>
        )}

        {/* Informações Pessoais */}
        <div className="space-y-4">
          <h3 className="text-sm uppercase tracking-wider font-bold text-amber-400 border-b border-slate-800 pb-2">
            1. Dados Pessoais
          </h3>

          {/* Nome Completo */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-1">
              Nome Completo <span className="text-amber-400">*</span>
            </label>
            <div className="relative">
              <User className="w-5 h-5 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ex: João da Silva Santos"
                required
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-11 pr-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Comum Congregação */}
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-1">
                Comum Congregação <span className="text-amber-400">*</span>
              </label>
              <div className="relative">
                <Church className="w-5 h-5 text-slate-500 absolute left-3.5 top-3.5 z-10 pointer-events-none" />
                <select
                  value={congregationSelect}
                  onChange={(e) => setCongregationSelect(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-11 pr-4 py-3 text-slate-100 focus:outline-none transition-colors appearance-none cursor-pointer"
                >
                  {congregationOptions.map((cong) => (
                    <option key={cong} value={cong}>
                      {cong}
                    </option>
                  ))}
                </select>
              </div>

              {(congregationSelect === 'Outra / Digitar Manualmente' || congregationSelect === 'Outra (Especifique abaixo)') && (
                <input
                  type="text"
                  value={customCongregation}
                  onChange={(e) => setCustomCongregation(e.target.value)}
                  placeholder="Digite o nome da sua Congregação..."
                  className="mt-2 w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none animate-fade-in text-sm"
                  required
                />
              )}
            </div>

            {/* Idade */}
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-1">
                Idade <span className="text-amber-400">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-5 h-5 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={age}
                  onChange={(e) => setAge(e.target.value === '' ? '' : parseInt(e.target.value))}
                  placeholder="Ex: 18"
                  required
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-11 pr-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Atividades & Contribuição */}
        <div className="space-y-4 pt-2">
          <h3 className="text-sm uppercase tracking-wider font-bold text-amber-400 border-b border-slate-800 pb-2">
            2. Atividades no Evento
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Gincana Checkbox Card */}
            <label className={`cursor-pointer p-4 rounded-2xl border transition-all flex items-start gap-3 ${
              participatesGincana 
                ? 'bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-500/5' 
                : 'bg-slate-950 border-slate-800 hover:border-slate-700'
            }`}>
              <input
                type="checkbox"
                checked={participatesGincana}
                onChange={(e) => setParticipatesGincana(e.target.checked)}
                className="mt-1 w-5 h-5 rounded text-amber-500 focus:ring-amber-500 bg-slate-900 border-slate-700 cursor-pointer"
              />
              <div>
                <div className="flex items-center gap-1.5 font-bold text-white text-base">
                  <Flag className="w-4 h-4 text-amber-400" />
                  Participar da Gincana
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Atividades recreativas, tarefas em equipe e provas competitivas.
                </p>
              </div>
            </label>

            {/* Tocata Checkbox Card */}
            <label className={`cursor-pointer p-4 rounded-2xl border transition-all flex items-start gap-3 ${
              participatesTocata 
                ? 'bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-500/5' 
                : 'bg-slate-950 border-slate-800 hover:border-slate-700'
            }`}>
              <input
                type="checkbox"
                checked={participatesTocata}
                onChange={(e) => setParticipatesTocata(e.target.checked)}
                className="mt-1 w-5 h-5 rounded text-amber-500 focus:ring-amber-500 bg-slate-900 border-slate-700 cursor-pointer"
              />
              <div>
                <div className="flex items-center gap-1.5 font-bold text-white text-base">
                  <Music className="w-4 h-4 text-amber-400" />
                  Participar da Tocata
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Apresentação e comunhão musical em conjunto.
                </p>
              </div>
            </label>
          </div>

          {participatesTocata && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 transition-all">
              <label className="block text-xs font-semibold text-amber-300 mb-1">
                Qual instrumento você irá tocar? (Opcional)
              </label>
              <input
                type="text"
                value={instrument}
                onChange={(e) => setInstrument(e.target.value)}
                placeholder="Ex: Violino, Flauta, Saxofone, Violão..."
                className="w-full bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
              />
            </div>
          )}

          {/* Alimento ou Bebida */}
          <div className="pt-2">
            <label className="block text-sm font-semibold text-slate-200 mb-1">
              Alimento ou Bebida que vai levar <span className="text-slate-500 text-xs font-normal">(Não obrigatório)</span>
            </label>
            <div className="relative">
              <Utensils className="w-5 h-5 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={foodOrDrink}
                onChange={(e) => setFoodOrDrink(e.target.value)}
                placeholder="Ex: Refrigerante 2L, Torta salgada, Bolo, Pacote de Pão de Forma..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-11 pr-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Comprovante de Pagamento */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-sm uppercase tracking-wider font-bold text-amber-400">
              3. Comprovante de Pagamento da Gincana
            </h3>
            <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
              Pode anexar agora ou depois
            </span>
          </div>

          {/* PIX Payment Key Card */}
          <div className="bg-gradient-to-r from-amber-500/10 via-slate-950 to-emerald-500/10 border border-amber-500/40 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500/20 text-amber-300 rounded-2xl border border-amber-500/30 shrink-0">
                  <QrCode className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-amber-400 block">
                    Pagamento da Taxa de Inscrição via PIX
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
            <p className="text-[11px] text-slate-300 leading-relaxed border-t border-slate-800/80 pt-2">
              Copie a chave acima para realizar o pagamento no aplicativo do seu banco e em seguida anexe a foto ou PDF do comprovante abaixo.
            </p>

            <div className="pt-2.5 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
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

          <p className="text-xs text-slate-300">
            Envie a foto (JPG/PNG) ou PDF do seu comprovante de pagamento da taxa da gincana. Caso prefira realizar o pagamento e anexar em outro momento, pode concluir a inscrição normalmente e anexar depois.
          </p>

          {!proofFile ? (
            <div className="border-2 border-dashed border-slate-700 hover:border-amber-500/60 rounded-2xl p-6 text-center transition-all bg-slate-950/60 group cursor-pointer relative">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="flex flex-col items-center gap-2">
                <div className="p-3 bg-slate-800 rounded-full group-hover:bg-amber-500/20 text-slate-400 group-hover:text-amber-400 transition-colors">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-amber-300 group-hover:underline">
                    Clique aqui para selecionar o arquivo
                  </span>
                  <span className="text-sm text-slate-400"> ou arraste o arquivo até aqui</span>
                </div>
                <p className="text-xs text-slate-500">
                  Formatos aceitos: Imagens (PNG, JPG) ou arquivos PDF (Máx. 10MB)
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-slate-950 border border-amber-500/40 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="p-2.5 bg-amber-500/20 text-amber-300 rounded-xl shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="truncate">
                  <p className="text-sm font-semibold text-white truncate">{proofFile.name}</p>
                  <p className="text-xs text-emerald-400 flex items-center gap-1 font-medium mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Arquivo pronto para envio ({proofFile.type.toUpperCase()})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProofFile(null)}
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors shrink-0"
                title="Remover arquivo"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 rounded-2xl bg-amber-500 text-slate-950 font-extrabold text-lg hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all shadow-xl shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                Efetuando Cadastro...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Finalizar Cadastro
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
