import { EventTeam } from '../types';

export const DEFAULT_TEAMS: EventTeam[] = [
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

export const TEAM_COLOR_PRESETS = [
  {
    id: 'rubi',
    label: 'Rubi (Vermelho)',
    color: 'from-rose-600 to-red-500',
    badgeBg: 'bg-rose-500/20',
    badgeText: 'text-rose-300 border-rose-500/30',
    previewDot: 'bg-rose-500'
  },
  {
    id: 'safira',
    label: 'Safira (Azul)',
    color: 'from-sky-600 to-blue-500',
    badgeBg: 'bg-sky-500/20',
    badgeText: 'text-sky-300 border-sky-500/30',
    previewDot: 'bg-sky-500'
  },
  {
    id: 'esmeralda',
    label: 'Esmeralda (Verde)',
    color: 'from-emerald-600 to-teal-500',
    badgeBg: 'bg-emerald-500/20',
    badgeText: 'text-emerald-300 border-emerald-500/30',
    previewDot: 'bg-emerald-500'
  },
  {
    id: 'diamante',
    label: 'Diamante (Dourado / Ouro)',
    color: 'from-amber-500 to-yellow-400',
    badgeBg: 'bg-amber-500/20',
    badgeText: 'text-amber-300 border-amber-500/30',
    previewDot: 'bg-amber-400'
  },
  {
    id: 'ametista',
    label: 'Ametista (Roxo / Violeta)',
    color: 'from-purple-600 to-indigo-500',
    badgeBg: 'bg-purple-500/20',
    badgeText: 'text-purple-300 border-purple-500/30',
    previewDot: 'bg-purple-500'
  },
  {
    id: 'topazio',
    label: 'Topázio (Laranja / Âmbar)',
    color: 'from-orange-600 to-amber-500',
    badgeBg: 'bg-orange-500/20',
    badgeText: 'text-orange-300 border-orange-500/30',
    previewDot: 'bg-orange-500'
  },
  {
    id: 'turquesa',
    label: 'Turquesa (Ciano / Azul Piscina)',
    color: 'from-cyan-600 to-teal-500',
    badgeBg: 'bg-cyan-500/20',
    badgeText: 'text-cyan-300 border-cyan-500/30',
    previewDot: 'bg-cyan-400'
  },
  {
    id: 'quartzo',
    label: 'Quartzo (Rosa / Pink)',
    color: 'from-pink-600 to-rose-400',
    badgeBg: 'bg-pink-500/20',
    badgeText: 'text-pink-300 border-pink-500/30',
    previewDot: 'bg-pink-400'
  },
  {
    id: 'perola',
    label: 'Pérola (Prata / Grafite)',
    color: 'from-slate-500 to-slate-400',
    badgeBg: 'bg-slate-500/20',
    badgeText: 'text-slate-200 border-slate-400/30',
    previewDot: 'bg-slate-300'
  }
];
