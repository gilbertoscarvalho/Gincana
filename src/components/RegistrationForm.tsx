import React, { useState } from 'react';
import { User, Church, Calendar, Utensils, Flag, Music, Upload, CheckCircle2, AlertCircle, FileText, X, QrCode, Copy, Check, Phone, MessageCircle } from 'lucide-react';
import { Participant } from '../types';

const PIX_KEY = 'gincana.joias2026@igreja.org.br';

interface RegistrationFormProps {
  congregations?: string[];
  proofPhoneNumber?: string;
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

export const RegistrationForm: React.FC<RegistrationFormProps> = ({ congregations, proofPhoneNumber, onSuccess, onGoToLookup }) => {
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
  const [copiedPhone, setCopiedPhone] = useState(false);

  const handleCopyPix = () => {
    navigator.clipboard.writeText(PIX_KEY);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2500);
  };

  const handleCopyPhone = () => {
    if (!proofPhoneNumber) return;
    navigator.clipboard.writeText(proofPhoneNumber);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2500);
  };

  // File handle (convert to Base64)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('O arquivo é muito grande. Tamanho máximo permitido: 10MB.');
      return;
    }

    const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
    const isImg = file.type.startsWith('image/');

    if (!isPdf && !isImg) {
      setErrorMsg('Formato inválido. Por favor envie uma Imagem (JPG, PNG) ou arquivo PDF.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setProofFile({
        url: reader.result as string,
        name: file.name,
        type: isPdf ? 'pdf' : 'image'
      });
      setErrorMsg(null);
    };
    reader.readAsDataURL(file);
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
        proofFileType: proofFile ? proofFile.type : null
      };

      const res = await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao efetuar cadastro.');
      }

      setRegisteredSuccess(data.participant);
      onSuccess(data.participant);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Erro desconhecido ao cadastrar.');
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
                <div>
                  <strong>Lembrete sobre o pagamento e comprovante:</strong>
                  <p className="mt-1">
                    Chave PIX (E-mail) para transferência: <strong className="font-mono text-amber-300">{PIX_KEY}</strong>
                  </p>
                  {proofPhoneNumber && (
                    <p className="mt-1 text-emerald-300 font-semibold flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                      <span>Telefone para envio do comprovante: <strong className="font-mono">{proofPhoneNumber}</strong></span>
                    </p>
                  )}
                  <p className="mt-1">
                    A qualquer momento você pode anexar acionando a opção <strong>"Anexar Comprovante"</strong> no topo e informando:
                  </p>
                  <ul className="list-disc list-inside mt-1.5 space-y-0.5 font-semibold text-amber-300">
                    <li>Primeiro nome: <u className="capitalize">{firstName}</u></li>
                    <li>Congregação: <u>{registeredSuccess.congregation}</u></li>
                    <li>Idade: <u>{registeredSuccess.age} anos</u></li>
                  </ul>
                </div>
              </div>

              <div className="pt-2 border-t border-amber-500/20 flex flex-wrap items-center justify-end gap-2">
                {proofPhoneNumber && (
                  <a
                    href={`https://wa.me/55${proofPhoneNumber.replace(/\D/g, '')}?text=Ol%C3%A1!%20Acabei%20de%20fazer%20minha%20inscri%C3%A7%C3%A3o%20na%20Gincana%20(${encodeURIComponent(firstName)})%20e%20estou%20enviando%20o%20comprovante.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Enviar Comprovante via WhatsApp</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={handleCopyPix}
                  className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                    copiedPix
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  }`}
                >
                  {copiedPix ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedPix ? 'Chave PIX Copiada!' : 'Copiar Chave PIX'}</span>
                </button>
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
                      {PIX_KEY}
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

            {proofPhoneNumber && (
              <div className="pt-2.5 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2.5 text-xs text-slate-200">
                  <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Telefone para envio do comprovante</span>
                    <strong className="text-emerald-300 font-mono text-xs sm:text-sm">{proofPhoneNumber}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyPhone}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      copiedPhone
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {copiedPhone ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPhone ? 'Copiado!' : 'Copiar Telefone'}</span>
                  </button>

                  <a
                    href={`https://wa.me/55${proofPhoneNumber.replace(/\D/g, '')}?text=Ol%C3%A1!%20Estou%20enviando%20meu%20comprovante%20de%20pagamento%20da%20Gincana.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
            )}
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
