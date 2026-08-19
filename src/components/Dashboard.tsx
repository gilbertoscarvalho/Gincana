import React, { useEffect, useState } from 'react';
import { Users, FileCheck, Flag, Music, Utensils, RefreshCw, Sparkles, PieChart as PieIcon, BarChart as BarIcon, ShieldAlert, CheckCircle, DollarSign, Target, TrendingUp, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { DashboardStats, Participant, EventSettings } from '../types';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const computeLocalStats = (): DashboardStats => {
    let participants: Participant[] = [];
    try {
      const stored = localStorage.getItem('ccb_gincana_local_participants');
      if (stored) {
        participants = JSON.parse(stored);
      }
    } catch (e) {}

    let ticketPrice = 25.0;
    let revenueGoal = 2500.0;
    try {
      const storedSettings = localStorage.getItem('ccb_gincana_local_settings');
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings);
        if (parsed.ticketPrice) ticketPrice = Number(parsed.ticketPrice);
        if (parsed.revenueGoal) revenueGoal = Number(parsed.revenueGoal);
      }
    } catch (e) {}

    const totalParticipants = participants.length;
    const totalWithProof = participants.filter((p) => Boolean(p.proofUrl)).length;
    const totalPendingProof = participants.filter((p) => !p.proofUrl).length;
    const totalApprovedProof = participants.filter((p) => p.proofStatus === 'Aprovado').length;

    const gincanaCount = participants.filter((p) => p.activities?.gincana).length;
    const tocataCount = participants.filter((p) => p.activities?.tocata).length;
    const foodContributionsCount = participants.filter((p) => Boolean(p.foodOrDrink && p.foodOrDrink.trim())).length;

    const congregationsCount: Record<string, number> = {};
    participants.forEach((p) => {
      const cong = p.congregation || 'Outra';
      congregationsCount[cong] = (congregationsCount[cong] || 0) + 1;
    });

    const ageGroups = {
      kids: participants.filter((p) => p.age <= 11).length,
      teens: participants.filter((p) => p.age >= 12 && p.age <= 17).length,
      youth: participants.filter((p) => p.age >= 18 && p.age <= 35).length,
      adults: participants.filter((p) => p.age >= 36).length
    };

    const totalRevenueReceived = totalWithProof * ticketPrice;
    const totalRevenuePending = totalPendingProof * ticketPrice;
    const goalProgressPercent = revenueGoal > 0 ? Math.min(100, Math.round((totalRevenueReceived / revenueGoal) * 100)) : 0;

    const recentRegistrations = [...participants]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 10);

    return {
      totalParticipants,
      totalWithProof,
      totalPendingProof,
      totalApprovedProof,
      gincanaCount,
      tocataCount,
      foodContributionsCount,
      congregationsCount,
      ageGroups,
      ticketPrice,
      revenueGoal,
      totalRevenueReceived,
      totalRevenuePending,
      goalProgressPercent,
      recentRegistrations
    };
  };

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      let statsData: DashboardStats | null = null;
      try {
        const res = await fetch('/api/stats');
        if (res.ok) {
          statsData = await res.json();
        }
      } catch (fetchErr) {
        console.warn('Notice: Server stats endpoint offline, computing from local store:', fetchErr);
      }

      if (!statsData) {
        statsData = computeLocalStats();
      }

      setStats(statsData);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erro ao carregar dashboard.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    const handleDataUpdate = () => {
      fetchStats();
    };
    window.addEventListener('ccb_participant_registered', handleDataUpdate);
    window.addEventListener('storage', handleDataUpdate);

    return () => {
      window.removeEventListener('ccb_participant_registered', handleDataUpdate);
      window.removeEventListener('storage', handleDataUpdate);
    };
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto my-12 p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
        <p className="text-sm font-semibold">Carregando dados e contabilização do evento...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="max-w-4xl mx-auto my-8 p-6 bg-rose-500/10 border border-rose-500/30 rounded-3xl text-rose-300 text-center space-y-3">
        <ShieldAlert className="w-10 h-10 text-rose-400 mx-auto" />
        <p className="font-bold">{error || 'Não foi possível carregar os dados.'}</p>
        <button
          onClick={fetchStats}
          className="px-4 py-2 bg-slate-800 text-amber-300 rounded-xl text-xs font-bold hover:bg-slate-700"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  // Format data for Congregation Bar Chart
  const congregationData = Object.entries(stats.congregationsCount).map(([name, count]) => ({
    name,
    Inscritos: count
  }));

  // Format data for Proof Status Pie Chart
  const proofStatusData = [
    { name: 'Com comprovante (Realizado)', value: stats.totalWithProof, color: '#10b981' },
    { name: 'Aguardando Comprovante', value: stats.totalPendingProof, color: '#f59e0b' }
  ];

  // Format data for Age Groups Pie Chart
  const ageData = [
    { name: 'Crianças (≤11 anos)', value: stats.ageGroups.kids, color: '#3b82f6' },
    { name: 'Adolescentes (12-17)', value: stats.ageGroups.teens, color: '#f59e0b' },
    { name: 'Jovens (18-35)', value: stats.ageGroups.youth, color: '#10b981' },
    { name: 'Adultos (36+)', value: stats.ageGroups.adults, color: '#8b5cf6' }
  ].filter(item => item.value > 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="max-w-7xl mx-auto my-6 px-4 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="text-2xl font-extrabold text-white">Dashboard do Administrador</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Métricas financeiras, receita recebida por comprovantes e meta do evento <strong>Somos Jóias Preciosas</strong>
          </p>
        </div>
        <button
          onClick={fetchStats}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 text-xs font-bold rounded-xl transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar Dados
        </button>
      </div>

      {/* Financial Overview & Goal Progress (Exclusivo Admin) */}
      <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-amber-400" />
            Balanço Financeiro & Meta
          </h3>
          <span className="text-xs text-slate-400 bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
            Taxa cadastrada: <strong>{formatCurrency(stats.ticketPrice)}</strong> por participante
          </span>
        </div>

        {/* 3 Main Financial Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Receita Realizada (Comprovantes Inclusos) */}
          <div className="bg-slate-950 border border-emerald-500/30 rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-emerald-400 font-bold uppercase tracking-wider">
              <span>Receita Confirmada</span>
              <CheckCircle className="w-5 h-5" />
            </div>
            <div className="text-3xl font-black text-emerald-300">
              {formatCurrency(stats.totalRevenueReceived)}
            </div>
            <p className="text-[11px] text-slate-400">
              Obtida com {stats.totalWithProof} participante(s) que anexaram comprovante.
            </p>
          </div>

          {/* Receita Pendente (A Pagar) */}
          <div className="bg-slate-950 border border-amber-500/30 rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-amber-400 font-bold uppercase tracking-wider">
              <span>Receita Pendente (A Pagar)</span>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-3xl font-black text-amber-300">
              {formatCurrency(stats.totalRevenuePending)}
            </div>
            <p className="text-[11px] text-slate-400">
              Corresponde a {stats.totalPendingProof} participante(s) ainda sem comprovante.
            </p>
          </div>

          {/* Meta Financeira Cadastrada */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
              <span>Meta a Atingir</span>
              <Target className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-3xl font-black text-white">
              {formatCurrency(stats.revenueGoal)}
            </div>
            <p className="text-[11px] text-slate-400">
              Cadastrada no menu de Configurações do evento.
            </p>
          </div>
        </div>

        {/* Goal Progress Bar */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-300 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-amber-400" /> Progresso da Meta Financeira
            </span>
            <span className="text-amber-300 font-mono text-sm">
              {stats.goalProgressPercent}% Atingido ({formatCurrency(stats.totalRevenueReceived)} / {formatCurrency(stats.revenueGoal)})
            </span>
          </div>

          <div className="w-full h-4 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-1000 shadow-lg"
              style={{ width: `${Math.min(100, stats.goalProgressPercent)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Cadastrados Metric */}
        <div className="bg-gradient-to-br from-amber-500/20 via-slate-900 to-slate-900 border border-amber-500/40 rounded-3xl p-5 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
              Total Cadastrados
            </span>
            <div className="p-2.5 bg-amber-500/20 text-amber-300 rounded-2xl">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-4xl sm:text-5xl font-black text-amber-200 tracking-tight">
              {stats.totalParticipants}
            </span>
            <p className="text-xs text-amber-300/80 mt-1 font-medium">
              Participantes cadastrados
            </p>
          </div>
        </div>

        {/* Comprovantes Enviados */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Comprovantes
            </span>
            <div className="p-2.5 bg-emerald-500/20 text-emerald-300 rounded-2xl">
              <FileCheck className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-white">{stats.totalWithProof}</span>
            <span className="text-xs text-slate-400 ml-1">/ {stats.totalParticipants}</span>
            <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1 font-medium">
              <CheckCircle className="w-3.5 h-3.5" />
              {stats.totalParticipants > 0 
                ? Math.round((stats.totalWithProof / stats.totalParticipants) * 100) 
                : 0}% com comprovante
            </p>
          </div>
        </div>

        {/* Participantes Gincana */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Gincana
            </span>
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-2xl">
              <Flag className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-white">{stats.gincanaCount}</span>
            <p className="text-xs text-slate-400 mt-1">Inscritos nas provas</p>
          </div>
        </div>

        {/* Participantes Tocata */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Tocata
            </span>
            <div className="p-2.5 bg-sky-500/20 text-sky-400 rounded-2xl">
              <Music className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-white">{stats.tocataCount}</span>
            <p className="text-xs text-slate-400 mt-1">Instrumentistas / Músicos</p>
          </div>
        </div>

        {/* Alimentos / Bebidas */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Alimentos/Bebidas
            </span>
            <div className="p-2.5 bg-purple-500/20 text-purple-400 rounded-2xl">
              <Utensils className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-white">{stats.foodContributionsCount}</span>
            <p className="text-xs text-slate-400 mt-1">Contribuições confirmadas</p>
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Congregations Bar Chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <BarIcon className="w-5 h-5 text-amber-400" />
              Inscritos por Comum Congregação
            </h3>
            <span className="text-xs text-slate-400">
              {Object.keys(stats.congregationsCount).length} congregação(ões)
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={congregationData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} interval={0} angle={-15} textAnchor="end" />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                  cursor={{ fill: 'rgba(245, 158, 11, 0.1)' }}
                />
                <Bar dataKey="Inscritos" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Proof Status Donut Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-2">
              <PieIcon className="w-5 h-5 text-amber-400" />
              Inclusão de Comprovantes
            </h3>
            <p className="text-xs text-slate-400">Proporção dos pagamentos registrados</p>
          </div>

          <div className="h-56 w-full my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={proofStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {proofStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', color: '#cbd5e1' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-xs text-slate-300 flex justify-around">
            <div>
              <span className="text-slate-400 block">Com Comprovante:</span>
              <strong className="text-emerald-400 text-sm">{stats.totalWithProof}</strong>
            </div>
            <div className="w-px bg-slate-800" />
            <div>
              <span className="text-slate-400 block">Faltam Enviar:</span>
              <strong className="text-amber-400 text-sm">{stats.totalPendingProof}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Age Distribution & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Age Groups */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-amber-400" />
            Distribuição por Faixa Etária
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl text-center">
              <span className="text-xs text-slate-400 block">Crianças (≤11)</span>
              <span className="text-xl font-bold text-sky-400">{stats.ageGroups.kids}</span>
            </div>
            <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl text-center">
              <span className="text-xs text-slate-400 block">Adolescentes (12-17)</span>
              <span className="text-xl font-bold text-amber-400">{stats.ageGroups.teens}</span>
            </div>
            <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl text-center">
              <span className="text-xs text-slate-400 block">Jovens (18-35)</span>
              <span className="text-xl font-bold text-emerald-400">{stats.ageGroups.youth}</span>
            </div>
            <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl text-center">
              <span className="text-xs text-slate-400 block">Adultos (36+)</span>
              <span className="text-xl font-bold text-purple-400">{stats.ageGroups.adults}</span>
            </div>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={ageData} cx="50%" cy="50%" outerRadius={65} dataKey="value">
                  {ageData.map((entry, index) => (
                    <Cell key={`cell-age-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ultimas Inscrições */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white mb-3">Últimas Inscrições Registradas</h3>
            <div className="space-y-3">
              {stats.recentRegistrations.length === 0 ? (
                <p className="text-slate-500 text-xs py-6 text-center">Nenhuma inscrição registrada ainda.</p>
              ) : (
                stats.recentRegistrations.map((p) => (
                  <div key={p.id} className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-200 block">{p.fullName}</span>
                      <span className="text-slate-400">{p.congregation} • {p.age} anos</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md font-semibold ${
                      p.proofUrl ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {p.proofUrl ? 'Comprovante OK' : 'Sem Comprovante'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 mt-4 text-center">
            <span className="text-xs text-amber-300/80 font-medium">
              Dados atualizados em tempo real com o banco de dados
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
