import React, { useEffect, useState, useRef } from 'react';
import {
  Users,
  FileCheck,
  Flag,
  Music,
  Utensils,
  RefreshCw,
  Sparkles,
  PieChart as PieIcon,
  BarChart as BarIcon,
  ShieldAlert,
  CheckCircle,
  DollarSign,
  Target,
  TrendingUp,
  AlertTriangle,
  Download,
  Printer,
  FileText
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { DashboardStats } from '../types';
import { exportDashboardToPDF } from '../utils/exportUtils';
import { fetchParticipantsFromSupabaseDirect, fetchSettingsFromSupabaseDirect } from '../lib/supabase';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [pdfSuccessBanner, setPdfSuccessBanner] = useState<string | null>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);

  const fetchStats = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      let data: DashboardStats | null = null;
      try {
        const res = await fetch('/api/stats', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        if (res.ok) {
          data = await res.json();
        }
      } catch (e) {}

      if (!data) {
        // Fallback: calculate stats directly from /api/participants or Supabase
        let participants: any[] = [];
        try {
          const partRes = await fetch('/api/participants', {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            }
          });
          if (partRes.ok) participants = await partRes.json();
        } catch {}

        if (!Array.isArray(participants) || participants.length === 0) {
          const directParticipants = await fetchParticipantsFromSupabaseDirect();
          if (directParticipants && directParticipants.length > 0) {
            participants = directParticipants;
          }
        }

        let settings = { ticketPrice: 20, revenueGoal: 2500 };
        try {
          const directSettings = await fetchSettingsFromSupabaseDirect();
          if (directSettings) {
            settings = {
              ticketPrice: directSettings.ticketPrice || 20,
              revenueGoal: directSettings.revenueGoal || 2500
            };
          }
        } catch {}

        const totalParticipants = participants.length;
        const totalWithProof = participants.filter((p) => p.proofUrl).length;
        const totalApprovedProof = participants.filter((p) => p.proofStatus === 'Aprovado').length;
        const totalPendingProof = participants.filter((p) => !p.proofUrl || p.proofStatus === 'Pendente').length;
        const gincanaCount = participants.filter((p) => p.activities?.gincana).length;
        const tocataCount = participants.filter((p) => p.activities?.tocata).length;
        const foodContributionsCount = participants.filter((p) => p.foodOrDrink && String(p.foodOrDrink).trim().length > 0).length;

        const congregationsCount: Record<string, number> = {};
        participants.forEach((p) => {
          const cong = p.congregation || 'Outras';
          congregationsCount[cong] = (congregationsCount[cong] || 0) + 1;
        });

        const ageGroups = { kids: 0, teens: 0, youth: 0, adults: 0 };
        participants.forEach((p) => {
          const age = Number(p.age) || 0;
          if (age <= 11) ageGroups.kids++;
          else if (age <= 17) ageGroups.teens++;
          else if (age <= 35) ageGroups.youth++;
          else ageGroups.adults++;
        });

        const ticketPrice = settings.ticketPrice || 20;
        const revenueGoal = settings.revenueGoal || 2500;
        const totalRevenueReceived = participants
          .filter((p) => p.proofStatus === 'Aprovado')
          .reduce((acc, p) => acc + (p.amountPaid !== undefined && p.amountPaid !== null ? Number(p.amountPaid) : ticketPrice), 0);
        const totalRevenuePending = participants
          .filter((p) => p.proofStatus !== 'Aprovado' && p.proofStatus !== 'Rejeitado')
          .reduce((acc, p) => acc + (p.amountPaid !== undefined && p.amountPaid !== null ? Number(p.amountPaid) : ticketPrice), 0);
        const goalProgressPercent = revenueGoal > 0 ? Math.min(100, Math.round((totalRevenueReceived / revenueGoal) * 100)) : 0;

        data = {
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
          recentRegistrations: participants.slice(0, 5)
        };
      }

      setStats(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (!isSilent) setError(err.message);
      } else {
        if (!isSilent) setError('Erro ao carregar dashboard.');
      }
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats(false);

    // Periodic refresh every 40 seconds when tab is active
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchStats(true);
      }
    }, 40000);

    const handleFocusOrVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchStats(true);
      }
    };

    window.addEventListener('focus', handleFocusOrVisibility);
    document.addEventListener('visibilitychange', handleFocusOrVisibility);
    window.addEventListener('ccb_participant_registered', () => fetchStats(true));

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocusOrVisibility);
      document.removeEventListener('visibilitychange', handleFocusOrVisibility);
      window.removeEventListener('ccb_participant_registered', () => fetchStats(true));
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

  const handleExportPDF = async () => {
    if (!stats || isExportingPDF) return;
    setIsExportingPDF(true);
    try {
      await exportDashboardToPDF(stats, dashboardRef.current);
      setPdfSuccessBanner('Relatório do Dashboard exportado em PDF com sucesso!');
      setTimeout(() => setPdfSuccessBanner(null), 5000);
    } catch (err: any) {
      console.error('Erro ao exportar PDF do dashboard:', err);
      alert('Ocorreu um erro ao gerar o PDF do Dashboard. Tente novamente.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div ref={dashboardRef} className="max-w-7xl mx-auto my-6 px-4 space-y-6 print:p-0 print:m-0 print:max-w-none">
      {/* PDF Success Banner */}
      {pdfSuccessBanner && (
        <div className="p-4 bg-emerald-500/15 border border-emerald-500/40 rounded-2xl flex items-center justify-between text-emerald-200 text-sm font-semibold shadow-lg animate-fade-in print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{pdfSuccessBanner}</span>
          </div>
          <button
            onClick={() => setPdfSuccessBanner(null)}
            className="text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-800/60 rounded-lg cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl print:bg-white print:border-slate-300 print:text-black">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400 print:text-amber-600" />
            <h2 className="text-2xl font-extrabold text-white print:text-slate-900">Dashboard do Administrador</h2>
          </div>
          <p className="text-xs text-slate-400 print:text-slate-600 mt-1">
            Métricas financeiras, receita recebida por comprovantes e meta do evento <strong>Somos Jóias Preciosas</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {/* PDF Export Button */}
          <button
            onClick={handleExportPDF}
            disabled={isExportingPDF}
            className={`inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black rounded-xl transition-all shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer disabled:opacity-50 disabled:pointer-events-none`}
            title="Exportar Dashboard completo em arquivo PDF"
          >
            {isExportingPDF ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                <span>Gerando PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-slate-950" />
                <span>Exportar PDF</span>
              </>
            )}
          </button>

          {/* Quick Print Button */}
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
            title="Imprimir visualização direta"
          >
            <Printer className="w-4 h-4 text-slate-400" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>

          {/* Refresh Data Button */}
          <button
            onClick={fetchStats}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            title="Atualizar dados em tempo real"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden md:inline">Atualizar</span>
          </button>
        </div>
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
