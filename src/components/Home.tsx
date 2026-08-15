import React, { useState, useEffect } from 'react';
import { Sparkles, Calendar, Clock, MapPin, Flag, Music, Trophy, Play, Image as ImageIcon, ChevronRight, UserPlus, FileCheck, ExternalLink, HeartHandshake, ShieldCheck } from 'lucide-react';
import { EventTeam, GalleryMediaItem } from '../types';

interface HomeProps {
  onGoToRegister: () => void;
  onGoToLookup: () => void;
  eventDateISO?: string;
  locationName?: string;
  locationAddress?: string;
  googleMapsEmbedUrl?: string;
  galleryItems?: GalleryMediaItem[];
}

// Teams list for the event
const TEAMS_LIST: EventTeam[] = [
  {
    id: 'rubi',
    name: 'Equipe Rubi',
    color: 'from-rose-600 to-red-500',
    badgeBg: 'bg-rose-500/20',
    badgeText: 'text-rose-300 border-rose-500/30',
    description: 'Conhecida pela garra, entusiasmo vibrante e forte união nas provas de esforço da Gincana.',
    motto: '"Brilhando com amor e perseverança!"',
    iconName: 'Gem'
  },
  {
    id: 'safira',
    name: 'Equipe Safira',
    color: 'from-sky-600 to-blue-500',
    badgeBg: 'bg-sky-500/20',
    badgeText: 'text-sky-300 border-sky-500/30',
    description: 'Destaca-se pela sabedoria, trabalho em equipe estratégico e harmonia nas atividades em conjunto.',
    motto: '"Firmes na fé, unidos no louvor!"',
    iconName: 'Sparkles'
  },
  {
    id: 'esmeralda',
    name: 'Equipe Esmeralda',
    color: 'from-emerald-600 to-teal-500',
    badgeBg: 'bg-emerald-500/20',
    badgeText: 'text-emerald-300 border-emerald-500/30',
    description: 'Marcada pela vitalidade, alegria constante, dinamismo nas tarefas e espírito de companheirismo.',
    motto: '"Esperança viva e comunhão em cada passo!"',
    iconName: 'Shield'
  },
  {
    id: 'diamante',
    name: 'Equipe Diamante',
    color: 'from-amber-500 to-yellow-400',
    badgeBg: 'bg-amber-500/20',
    badgeText: 'text-amber-300 border-amber-500/30',
    description: 'Resistentes e focados, reúnem músicos e jovens dispostos a dar o seu melhor com excelência.',
    motto: '"Inabaláveis em louvor e serviço!"',
    iconName: 'Award'
  }
];

// Media items (Imported/Inspired by gincanatocata7set.netlify.app)
const MEDIA_ITEMS: GalleryMediaItem[] = [
  {
    id: 'm1',
    title: 'Tocata em Conjunto - Louvor e Adoração',
    category: 'anterior',
    type: 'photo',
    url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
    description: 'Todos os instrumentistas reunidos em uma linda harmonia durante a Tocata da edição anterior.'
  },
  {
    id: 'm2',
    title: 'Gincana: Prova do Circuito e Equipes',
    category: 'anterior',
    type: 'photo',
    url: 'https://images.unsplash.com/photo-1526976668912-1a811878dd37?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1526976668912-1a811878dd37?auto=format&fit=crop&w=600&q=80',
    description: 'Momentos de muita descontração e superação das equipes no circuito de provas.'
  },
  {
    id: 'm3',
    title: 'Comunhão no Almoço Coletivo',
    category: 'anterior',
    type: 'photo',
    url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=600&q=80',
    description: 'Irmãos reunidos partilhando os alimentos trazidos com muito carinho e alegria.'
  },
  {
    id: 'm4',
    title: 'Apresentação Instrumental Especial',
    category: 'anterior',
    type: 'video',
    url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Placeholder video embed
    thumbnailUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=600&q=80',
    description: 'Trecho do hino especial tocado em conjunto na abertura do encontro.'
  },
  {
    id: 'm5',
    title: 'Entrega de Troféus e Medalhas',
    category: 'anterior',
    type: 'photo',
    url: 'https://images.unsplash.com/photo-1578269174936-2709b6aeb913?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1578269174936-2709b6aeb913?auto=format&fit=crop&w=600&q=80',
    description: 'Celebração e reconhecimento do esforço de cada equipe participante.'
  },
  {
    id: 'm6',
    title: 'Prévia da Edição Atual (2026)',
    category: 'atual',
    type: 'photo',
    url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=600&q=80',
    description: 'Preparativos a todo vapor para o grande dia! As fotos do evento atual serão publicadas aqui.'
  }
];

export const Home: React.FC<HomeProps> = ({
  onGoToRegister,
  onGoToLookup,
  eventDateISO = '2026-09-07T08:30:00.000Z',
  locationName = 'Espaço e Chácara "Somos Jóias Preciosas"',
  locationAddress = 'Fazenda Chico Pinto, Bairro Cedro. São Gonçalo dos Campos',
  googleMapsEmbedUrl,
  galleryItems
}) => {
  // Countdown Timer State & Salvador/BA Timezone Sync
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  const [activeMediaCategory, setActiveMediaCategory] = useState<'anterior' | 'atual'>('anterior');
  const [selectedImageModal, setSelectedImageModal] = useState<GalleryMediaItem | null>(null);

  useEffect(() => {
    let clockSkew = 0; // Difference between server time and local browser clock

    // Fetch internet server time in Salvador/Bahia timezone
    const syncServerTime = async () => {
      try {
        const fetchStart = Date.now();
        const res = await fetch('/api/time');
        if (res.ok) {
          const data = await res.json();
          const fetchEnd = Date.now();
          const rtt = fetchEnd - fetchStart;
          const estimatedServerNow = data.timestamp + Math.floor(rtt / 2);
          clockSkew = estimatedServerNow - fetchEnd;
        }
      } catch (err) {
        console.warn('Could not sync with server time, using local clock fallback:', err);
      }
    };

    syncServerTime();

    // Re-sync with server time every 30 seconds
    const syncInterval = setInterval(syncServerTime, 30000);

    // Target date in epoch milliseconds
    let targetDateMs = new Date(eventDateISO).getTime();
    if (isNaN(targetDateMs)) {
      // Fallback for date string
      targetDateMs = new Date('2026-09-07T08:30:00-03:00').getTime();
    }

    const updateTimer = () => {
      const currentClientMs = Date.now();
      const currentSyncedMs = currentClientMs + clockSkew;
      const difference = targetDateMs - currentSyncedMs;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(syncInterval);
    };
  }, [eventDateISO]);

  const currentMediaList = Array.isArray(galleryItems) ? galleryItems : MEDIA_ITEMS;
  const filteredMedia = currentMediaList.filter(m => m.category === activeMediaCategory);

  return (
    <div className="space-y-12 pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-b border-amber-500/20 py-12 sm:py-20 px-4">
        {/* Background Decorative Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs sm:text-sm font-bold shadow-lg">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            Grande Encontro do Ano • 07 de Setembro
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
            Evento <span className="bg-gradient-to-r from-amber-300 via-amber-200 to-amber-400 bg-clip-text text-transparent">"Somos Jóias Preciosas"</span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-300 font-medium leading-relaxed">
            Um dia inesquecível de comunhão, alegria e louvor com a realização da nossa tradicional <strong>Gincana Interativa</strong> e da emocionante <strong>Tocata Musical em Conjunto</strong>.
          </p>

          {/* Real-time Countdown Timer Bar */}
          <div className="pt-4 max-w-3xl mx-auto">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-400/90 mb-3 flex items-center justify-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" /> Contagem Regressiva para o Evento
            </p>
            <div className="grid grid-cols-4 gap-2 sm:gap-4 bg-slate-900/90 border border-amber-500/30 rounded-3xl p-4 sm:p-6 shadow-2xl backdrop-blur-md">
              <div className="bg-slate-950 p-3 sm:p-4 rounded-2xl border border-slate-800 text-center">
                <span className="text-3xl sm:text-5xl font-black text-amber-300 font-mono block">
                  {String(timeLeft.days).padStart(2, '0')}
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mt-1 block">Dias</span>
              </div>
              <div className="bg-slate-950 p-3 sm:p-4 rounded-2xl border border-slate-800 text-center">
                <span className="text-3xl sm:text-5xl font-black text-amber-300 font-mono block">
                  {String(timeLeft.hours).padStart(2, '0')}
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mt-1 block">Horas</span>
              </div>
              <div className="bg-slate-950 p-3 sm:p-4 rounded-2xl border border-slate-800 text-center">
                <span className="text-3xl sm:text-5xl font-black text-amber-300 font-mono block">
                  {String(timeLeft.minutes).padStart(2, '0')}
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mt-1 block">Minutos</span>
              </div>
              <div className="bg-slate-950 p-3 sm:p-4 rounded-2xl border border-slate-800 text-center">
                <span className="text-3xl sm:text-5xl font-black text-amber-300 font-mono block">
                  {String(timeLeft.seconds).padStart(2, '0')}
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-amber-400 font-mono uppercase tracking-wider mt-1 block">Segundos</span>
              </div>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onGoToRegister}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-amber-500 text-slate-950 font-black text-base hover:bg-amber-400 transition-all shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 group cursor-pointer"
            >
              <UserPlus className="w-5 h-5" />
              Fazer Minha Inscrição Agora
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={onGoToLookup}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-900 border border-amber-500/40 text-amber-300 font-bold text-base hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
            >
              <FileCheck className="w-5 h-5" />
              Já sou inscrito / Anexar Comprovante
            </button>
          </div>
        </div>
      </section>

      {/* Highlights & Event Activities Section */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-8 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Principais Atividades do Evento</h2>
          <p className="text-slate-400 text-sm">
            Tanto a Gincana quanto a Tocata foram planejadas para a integração e fortalecimento de todos os participantes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card Gincana */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 hover:border-amber-500/40 transition-all shadow-xl relative overflow-hidden group">
            <div className="p-3 bg-amber-500/20 text-amber-300 rounded-2xl w-fit">
              <Flag className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-white">1. A Gincana</h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              Atividades recreativas dinâmicas divididas por equipes coloridas. Provas de raciocínio, habilidades de cooperação, tarefas de arrecadação e agilidade que estimulam o trabalho em equipe, respeito e companheirismo entre todas as idades.
            </p>
            <ul className="text-xs text-slate-400 space-y-2 pt-2 border-t border-slate-800">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Inscrição individual com escolha de apoio com alimento/bebida.
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Taxa simbólica de participação para cobertura dos custos do evento.
              </li>
            </ul>
          </div>

          {/* Card Tocata */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 hover:border-amber-500/40 transition-all shadow-xl relative overflow-hidden group">
            <div className="p-3 bg-sky-500/20 text-sky-300 rounded-2xl w-fit">
              <Music className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-white">2. A Tocata Musical</h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              Momento especial de louvor e harmonização musical com instrumentistas de diversas congregações. Os participantes trazem seus instrumentos (violino, flauta, violão, saxofone, etc.) para tocar hinos em conjunto.
            </p>
            <ul className="text-xs text-slate-400 space-y-2 pt-2 border-t border-slate-800">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                Aberto a todos os níveis de conhecimento musical.
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                Participação sem custo adicional para os músicos.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Equipes Competidoras */}
      <section className="max-w-7xl mx-auto px-4 pt-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
            <div>
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                <Trophy className="w-4 h-4" /> Equipes da Gincana
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">Nossas Equipes em Competição</h2>
            </div>
            <span className="text-xs text-slate-400 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl self-start sm:self-auto">
              Cada participante é integrado à sua equipe no dia
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {TEAMS_LIST.map((team) => (
              <div
                key={team.id}
                className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-amber-500/40 transition-all space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${team.badgeBg} ${team.badgeText}`}>
                      {team.name}
                    </span>
                    <Sparkles className="w-4 h-4 text-amber-400" />
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{team.description}</p>
                </div>
                <div className="pt-3 border-t border-slate-800/80">
                  <span className="text-[11px] font-semibold text-amber-300/90 italic block">
                    {team.motto}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Painel Interativo de Mídia (Fotos e Vídeos) - Inspiração Netlify */}
      <section className="max-w-7xl mx-auto px-4 pt-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
                <ImageIcon className="w-7 h-7 text-amber-400" />
                Painel de Fotos & Vídeos
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Registros do último evento realizado e atualizações da edição atual
              </p>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs self-start sm:self-auto">
              <button
                onClick={() => setActiveMediaCategory('anterior')}
                className={`px-4 py-2 rounded-xl font-bold transition-all ${
                  activeMediaCategory === 'anterior'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Último Evento Realizado
              </button>
              <button
                onClick={() => setActiveMediaCategory('atual')}
                className={`px-4 py-2 rounded-xl font-bold transition-all ${
                  activeMediaCategory === 'atual'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Edição Atual (Pós-Evento)
              </button>
            </div>
          </div>

          {/* Media Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMedia.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedImageModal(item)}
                className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden group cursor-pointer hover:border-amber-500/50 transition-all flex flex-col"
              >
                <div className="relative h-48 overflow-hidden bg-slate-900">
                  {item.thumbnailUrl && item.thumbnailUrl.trim() !== '' ? (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-900 flex items-center justify-center text-slate-600">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                  )}
                  {item.type === 'video' && (
                    <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center">
                      <div className="p-3 bg-amber-500 text-slate-950 rounded-full shadow-lg group-hover:scale-110 transition-transform">
                        <Play className="w-6 h-6 fill-slate-950" />
                      </div>
                    </div>
                  )}
                  <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-md bg-slate-900/80 backdrop-blur-md text-amber-300 text-[10px] font-bold uppercase tracking-wider border border-slate-700">
                    {item.type === 'video' ? 'Vídeo' : 'Foto'}
                  </span>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                  <h4 className="font-bold text-sm text-white group-hover:text-amber-300 transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-400 line-clamp-2">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Localização do Evento & Mapa */}
      <section className="max-w-7xl mx-auto px-4 pt-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs font-bold border border-amber-500/20 mb-2">
                <MapPin className="w-4 h-4 text-amber-400" />
                Local e Endereço Oficial
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">{locationName}</h2>
              <p className="text-slate-300 text-sm mt-2 flex items-start gap-2">
                <MapPin className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                {locationAddress}
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Data do Evento:</span>
                <span className="font-bold text-amber-300">Segunda-feira, 07 de Setembro de 2026</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Horário de Início:</span>
                <span className="font-bold text-white">A partir das 08h30 (Recepção e Abertura)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">O que levar:</span>
                <span className="text-slate-200">Bebida/Alimento (se cadastrado) + Instrumento para Tocata</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationAddress)}`}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-3 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir no Google Maps
              </a>
            </div>
          </div>

          {/* Interactive Google Maps Frame */}
          <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden h-72 sm:h-80 relative shadow-inner">
            <iframe
              title="Google Maps Location"
              src={googleMapsEmbedUrl && googleMapsEmbedUrl.trim() !== '' ? googleMapsEmbedUrl : 'https://www.google.com/maps/embed?pb=!1m17!1m12!1m3!1d3896.670711455419!2d-38.93708902493298!3d-12.404963687860697!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m2!1m1!2zMTLCsDI0JzE3LjkiUyAzOMKwNTYnMDQuMyJX!5e0!3m2!1spt-BR!2sbr!4v1786794586966!5m2!1spt-BR!2sbr'}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen={false}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>

      {/* Lightbox Modal for Media */}
      {selectedImageModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl max-w-3xl w-full p-6 space-y-4 relative shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-lg">{selectedImageModal.title}</h3>
              <button
                onClick={() => setSelectedImageModal(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden bg-slate-950 flex justify-center max-h-[450px]">
              {selectedImageModal.type === 'video' ? (
                selectedImageModal.url && selectedImageModal.url.trim() !== '' ? (
                  <iframe
                    src={selectedImageModal.url}
                    title={selectedImageModal.title}
                    className="w-full h-80 rounded-2xl"
                    allowFullScreen
                  />
                ) : (
                  <div className="w-full h-80 flex items-center justify-center text-slate-500 text-xs">
                    Vídeo indisponível
                  </div>
                )
              ) : (
                selectedImageModal.url && selectedImageModal.url.trim() !== '' ? (
                  <img
                    src={selectedImageModal.url}
                    alt={selectedImageModal.title}
                    className="max-h-[420px] object-contain rounded-2xl"
                  />
                ) : (
                  <div className="p-8 text-slate-500 text-xs">Imagem indisponível</div>
                )
              )}
            </div>

            <p className="text-xs text-slate-300">{selectedImageModal.description}</p>
          </div>
        </div>
      )}
    </div>
  );
};
