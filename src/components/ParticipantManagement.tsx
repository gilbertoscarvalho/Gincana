import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, Eye, Check, X, Edit3, Trash2, FileText, Flag, Music, Utensils, AlertCircle, RefreshCw } from 'lucide-react';
import { Participant, ProofStatus } from '../types';

interface ParticipantManagementProps {
  onDataChanged: () => void;
}

export const ParticipantManagement: React.FC<ParticipantManagementProps> = ({ onDataChanged }) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCongregation, setFilterCongregation] = useState('ALL');
  const [filterProofStatus, setFilterProofStatus] = useState<'ALL' | 'WITH_PROOF' | 'WITHOUT_PROOF'>('ALL');
  const [filterActivity, setFilterActivity] = useState<'ALL' | 'GINCANA' | 'TOCATA'>('ALL');

  // Modal Proof State
  const [viewingProofParticipant, setViewingProofParticipant] = useState<Participant | null>(null);

  // Edit Modal State
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);

  const fetchParticipants = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/participants');
      if (res.ok) {
        const data = await res.json();
        setParticipants(data);
      }
    } catch (err) {
      console.error('Error fetching participants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParticipants();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: ProofStatus) => {
    try {
      const res = await fetch(`/api/participants/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proofStatus: newStatus })
      });

      if (res.ok) {
        setParticipants((prev) =>
          prev.map((p) => (p.id === id ? { ...p, proofStatus: newStatus } : p))
        );
        if (viewingProofParticipant && viewingProofParticipant.id === id) {
          setViewingProofParticipant((prev) => prev ? { ...prev, proofStatus: newStatus } : null);
        }
        onDataChanged();
      }
    } catch (err) {
      console.error('Error updating proof status:', err);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o cadastro de "${name}"?`)) return;

    try {
      const res = await fetch(`/api/participants/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setParticipants((prev) => prev.filter((p) => p.id !== id));
        onDataChanged();
      }
    } catch (err) {
      console.error('Error deleting participant:', err);
    }
  };

  // Filter logic
  const congregationsList = Array.from(new Set(participants.map((p) => p.congregation)));

  const filteredParticipants = participants.filter((p) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      p.fullName.toLowerCase().includes(term) ||
      p.congregation.toLowerCase().includes(term) ||
      (p.foodOrDrink && p.foodOrDrink.toLowerCase().includes(term));

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
        ? p.activities.gincana
        : p.activities.tocata;

    return matchesSearch && matchesCongregation && matchesProof && matchesActivity;
  });

  // Export to CSV
  const exportToCSV = () => {
    if (filteredParticipants.length === 0) return;

    const headers = [
      'Nome Completo',
      'Comum Congregacao',
      'Idade',
      'Gincana',
      'Tocata',
      'Instrumento',
      'Alimento/Bebida',
      'Comprovante Enviado',
      'Status Comprovante'
    ];

    const rows = filteredParticipants.map((p) => [
      `"${p.fullName.replace(/"/g, '""')}"`,
      `"${p.congregation.replace(/"/g, '""')}"`,
      p.age,
      p.activities.gincana ? 'Sim' : 'Nao',
      p.activities.tocata ? 'Sim' : 'Nao',
      `"${(p.activities.instrument || '').replace(/"/g, '""')}"`,
      `"${(p.foodOrDrink || '').replace(/"/g, '""')}"`,
      p.proofUrl ? 'Sim' : 'Nao',
      p.proofStatus
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `somos_joias_preciosas_inscritos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto my-6 px-4 space-y-6">
      {/* Header & Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-white">Lista e Gestão de Inscritos</h2>
            <p className="text-xs text-slate-400 mt-1">
              Exibindo <strong>{filteredParticipants.length}</strong> de <strong>{participants.length}</strong> participante(s) cadastrado(s)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchParticipants}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
              title="Atualizar lista"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={exportToCSV}
              disabled={filteredParticipants.length === 0}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Exportar CSV / Excel
            </button>
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
                <option key={c} value={c}>{c}</option>
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
                  <th className="px-4 py-3.5">Comprovante</th>
                  <th className="px-4 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredParticipants.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Name & Age */}
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-white text-sm">{p.fullName}</div>
                      <div className="text-slate-400 text-xs">{p.age} anos</div>
                    </td>

                    {/* Congregation */}
                    <td className="px-4 py-3.5 font-semibold text-amber-200">
                      {p.congregation}
                    </td>

                    {/* Activities */}
                    <td className="px-4 py-3.5 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {p.activities.gincana && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-medium">
                            <Flag className="w-3 h-3" /> Gincana
                          </span>
                        )}
                        {p.activities.tocata && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 font-medium">
                            <Music className="w-3 h-3" /> Tocata
                          </span>
                        )}
                      </div>
                      {p.activities.instrument && (
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

                    {/* Proof Status Badge & Button */}
                    <td className="px-4 py-3.5">
                      {p.proofUrl ? (
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${
                              p.proofStatus === 'Aprovado'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : p.proofStatus === 'Analisando'
                                ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            }`}
                          >
                            {p.proofStatus}
                          </span>
                          <button
                            onClick={() => setViewingProofParticipant(p)}
                            className="p-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg transition-colors"
                            title="Ver Comprovante"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full font-semibold text-[11px] bg-slate-800 text-slate-400 border border-slate-700">
                          Pendente
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleDelete(p.id, p.fullName)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Excluir"
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

      {/* Proof Viewer Modal */}
      {viewingProofParticipant && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Comprovante de Pagamento</h3>
                <p className="text-xs text-slate-400">
                  {viewingProofParticipant.fullName} • {viewingProofParticipant.congregation}
                </p>
              </div>
              <button
                onClick={() => setViewingProofParticipant(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center bg-slate-950 min-h-[280px]">
              {viewingProofParticipant.proofUrl ? (
                viewingProofParticipant.proofFileType === 'pdf' ? (
                  <div className="text-center space-y-3">
                    <FileText className="w-16 h-16 text-amber-400 mx-auto" />
                    <p className="text-sm font-semibold text-white">
                      {viewingProofParticipant.proofFileName || 'comprovante.pdf'}
                    </p>
                    <a
                      href={viewingProofParticipant.proofUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-slate-950 rounded-xl font-bold text-xs"
                    >
                      <Download className="w-4 h-4" /> Abrir PDF Completo
                    </a>
                  </div>
                ) : viewingProofParticipant.proofUrl && viewingProofParticipant.proofUrl.trim() !== '' ? (
                  <img
                    src={viewingProofParticipant.proofUrl}
                    alt="Comprovante"
                    className="max-h-[380px] object-contain rounded-2xl border border-slate-800 shadow-md"
                  />
                ) : (
                  <p className="text-slate-500 text-xs">Sem visualização de imagem disponível.</p>
                )
              ) : (
                <p className="text-slate-500 text-xs">Nenhum comprovante anexado.</p>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="p-5 border-t border-slate-800 bg-slate-900 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Status Atual:</span>
                <span className="font-bold text-amber-300 text-xs">{viewingProofParticipant.proofStatus}</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleUpdateStatus(viewingProofParticipant.id, 'Aprovado')}
                  className="px-3.5 py-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-xl font-bold text-xs hover:bg-emerald-500/30 transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Aprovar
                </button>
                <button
                  onClick={() => handleUpdateStatus(viewingProofParticipant.id, 'Rejeitado')}
                  className="px-3.5 py-2 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-xl font-bold text-xs hover:bg-rose-500/30 transition-colors flex items-center gap-1.5"
                >
                  <X className="w-4 h-4" /> Rejeitar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
