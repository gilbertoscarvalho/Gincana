import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Participant, DashboardStats } from '../types';
import html2canvas from 'html2canvas';

/**
 * Format currency for reports
 */
const formatBRL = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

/**
 * Export participants to a beautifully structured Excel file (.xlsx)
 * with auto-sized columns and organized sheets.
 */
export const exportParticipantsToExcel = (
  participants: Participant[],
  fileNamePrefix: string = 'somos_joias_preciosas_inscritos'
) => {
  if (!participants || participants.length === 0) {
    alert('Nenhum participante disponível para exportar.');
    return;
  }

  const wb = XLSX.utils.book_new();

  // 1. Main Sheet: Full Participants List
  const mainData = participants.map((p, idx) => {
    let faixaEtaria = 'Criança (≤11)';
    if (p.age >= 12 && p.age <= 17) faixaEtaria = 'Adolescente (12-17)';
    else if (p.age >= 18 && p.age <= 35) faixaEtaria = 'Jovem (18-35)';
    else if (p.age >= 36) faixaEtaria = 'Adulto (36+)';

    return {
      'Nº': idx + 1,
      'Nome Completo': p.fullName,
      'Comum Congregação': p.congregation,
      'Idade': p.age,
      'Faixa Etária': faixaEtaria,
      'Gincana': p.activities?.gincana ? 'Sim' : 'Não',
      'Tocata': p.activities?.tocata ? 'Sim' : 'Não',
      'Instrumento': p.activities?.instrument || '-',
      'Alimento / Bebida': p.foodOrDrink || '-',
      'Comprovante Anexado': p.proofUrl ? 'Sim' : 'Não',
      'Status do Comprovante': p.proofStatus || 'Pendente',
      'Data de Cadastro': p.createdAt ? new Date(p.createdAt).toLocaleDateString('pt-BR') : '-',
      'Observações': p.notes || '-'
    };
  });

  const wsMain = XLSX.utils.json_to_sheet(mainData);

  // Auto-fit column widths
  const colWidths = [
    { wch: 6 },   // Nº
    { wch: 32 },  // Nome Completo
    { wch: 26 },  // Comum Congregação
    { wch: 8 },   // Idade
    { wch: 20 },  // Faixa Etária
    { wch: 10 },  // Gincana
    { wch: 10 },  // Tocata
    { wch: 22 },  // Instrumento
    { wch: 26 },  // Alimento / Bebida
    { wch: 20 },  // Comprovante Anexado
    { wch: 22 },  // Status do Comprovante
    { wch: 16 },  // Data de Cadastro
    { wch: 30 }   // Observações
  ];
  wsMain['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, wsMain, 'Lista de Inscritos');

  // 2. Sheet 2: Congregation Summary
  const congMap = new Map<string, { total: number; gincana: number; tocata: number; comComprovante: number }>();
  participants.forEach(p => {
    const cong = p.congregation || 'Não informada';
    const current = congMap.get(cong) || { total: 0, gincana: 0, tocata: 0, comComprovante: 0 };
    current.total += 1;
    if (p.activities?.gincana) current.gincana += 1;
    if (p.activities?.tocata) current.tocata += 1;
    if (p.proofUrl) current.comComprovante += 1;
    congMap.set(cong, current);
  });

  const congSummaryData = Array.from(congMap.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .map(([congregation, data], idx) => ({
      'Nº': idx + 1,
      'Comum Congregação': congregation,
      'Total Inscritos': data.total,
      'Gincana': data.gincana,
      'Tocata': data.tocata,
      'Com Comprovante': data.comComprovante,
      'Pendente Comprovante': data.total - data.comComprovante,
      '% Comprovante': data.total > 0 ? `${Math.round((data.comComprovante / data.total) * 100)}%` : '0%'
    }));

  const wsCong = XLSX.utils.json_to_sheet(congSummaryData);
  wsCong['!cols'] = [
    { wch: 6 },
    { wch: 28 },
    { wch: 16 },
    { wch: 12 },
    { wch: 12 },
    { wch: 18 },
    { wch: 20 },
    { wch: 16 }
  ];
  XLSX.utils.book_append_sheet(wb, wsCong, 'Por Congregação');

  // 3. Sheet 3: Foods & Drinks Breakdown
  const foodParticipants = participants.filter(p => p.foodOrDrink && p.foodOrDrink.trim().length > 0);
  const foodData = foodParticipants.map((p, idx) => ({
    'Nº': idx + 1,
    'Alimento / Bebida': p.foodOrDrink,
    'Responsável': p.fullName,
    'Comum Congregação': p.congregation
  }));

  if (foodData.length > 0) {
    const wsFood = XLSX.utils.json_to_sheet(foodData);
    wsFood['!cols'] = [{ wch: 6 }, { wch: 30 }, { wch: 30 }, { wch: 26 }];
    XLSX.utils.book_append_sheet(wb, wsFood, 'Alimentos e Bebidas');
  }

  // 4. Sheet 4: Tocata Musicians
  const tocataParticipants = participants.filter(p => p.activities?.tocata);
  const tocataData = tocataParticipants.map((p, idx) => ({
    'Nº': idx + 1,
    'Músico / Instrumentista': p.fullName,
    'Instrumento': p.activities?.instrument || 'Não especificado',
    'Comum Congregação': p.congregation,
    'Idade': p.age
  }));

  if (tocataData.length > 0) {
    const wsTocata = XLSX.utils.json_to_sheet(tocataData);
    wsTocata['!cols'] = [{ wch: 6 }, { wch: 30 }, { wch: 24 }, { wch: 26 }, { wch: 8 }];
    XLSX.utils.book_append_sheet(wb, wsTocata, 'Músicos Tocata');
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${fileNamePrefix}_${dateStr}.xlsx`);
};

/**
 * Export participants to a high-quality printable PDF file using jsPDF + autoTable
 */
export const exportParticipantsToPDF = (
  participants: Participant[],
  filterTitle: string = 'Todos os Registros'
) => {
  if (!participants || participants.length === 0) {
    alert('Nenhum participante disponível para exportar em PDF.');
    return;
  }

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const dateStr = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 60, 'F');

  doc.setFillColor(245, 158, 11); // amber-500 line
  doc.rect(0, 58, pageWidth, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('SOMOS JÓIAS PRECIOSAS - RELATÓRIO DE INSCRITOS', 20, 28);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(`Filtro: ${filterTitle}  |  Emissão: ${dateStr}  |  Total: ${participants.length} participante(s)`, 20, 46);

  // Summary KPI box
  const totalGincana = participants.filter(p => p.activities?.gincana).length;
  const totalTocata = participants.filter(p => p.activities?.tocata).length;
  const totalWithProof = participants.filter(p => p.proofUrl).length;
  const totalFood = participants.filter(p => p.foodOrDrink && p.foodOrDrink.trim().length > 0).length;

  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(20, 70, pageWidth - 40, 28, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85); // slate-700
  const summaryText = `Total: ${participants.length}  |  Gincana: ${totalGincana}  |  Tocata: ${totalTocata}  |  Com Comprovante: ${totalWithProof} (${participants.length > 0 ? Math.round((totalWithProof/participants.length)*100) : 0}%)  |  Alimentos/Bebidas: ${totalFood}`;
  doc.text(summaryText, 30, 88);

  // Table Data
  const headers = [
    '#',
    'Nome Completo',
    'Comum Congregação',
    'Idade',
    'Gincana',
    'Tocata',
    'Instrumento',
    'Alimento / Bebida',
    'Comprovante',
    'Observações'
  ];

  const bodyData = participants.map((p, idx) => [
    idx + 1,
    p.fullName,
    p.congregation,
    p.age,
    p.activities?.gincana ? 'Sim' : 'Não',
    p.activities?.tocata ? 'Sim' : 'Não',
    p.activities?.instrument || '-',
    p.foodOrDrink || '-',
    p.proofUrl ? `Sim (${p.proofStatus || 'OK'})` : 'Pendente',
    p.notes || '-'
  ]);

  autoTable(doc, {
    head: [headers],
    body: bodyData,
    startY: 108,
    margin: { left: 20, right: 20, bottom: 35 },
    styles: {
      fontSize: 8,
      cellPadding: 4,
      overflow: 'linebreak',
      valign: 'middle'
    },
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // slate-50
    },
    columnStyles: {
      0: { cellWidth: 22, halign: 'center' }, // #
      1: { cellWidth: 130 },                   // Nome
      2: { cellWidth: 100 },                   // Congregação
      3: { cellWidth: 32, halign: 'center' },  // Idade
      4: { cellWidth: 42, halign: 'center' },  // Gincana
      5: { cellWidth: 42, halign: 'center' },  // Tocata
      6: { cellWidth: 85 },                    // Instrumento
      7: { cellWidth: 100 },                   // Alimento
      8: { cellWidth: 85, halign: 'center' },  // Comprovante
      9: { cellWidth: 'auto' }                 // Observações
    },
    didDrawPage: (data) => {
      // Footer with page numbering
      const str = `Página ${data.pageNumber} de ${doc.getNumberOfPages()}  -  Evento Somos Jóias Preciosas`;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(str, pageWidth / 2, doc.internal.pageSize.getHeight() - 15, { align: 'center' });
    }
  });

  const fileDate = new Date().toISOString().slice(0, 10);
  doc.save(`relatorio_inscritos_somos_joias_preciosas_${fileDate}.pdf`);
};

/**
 * Export the Administrator Dashboard to PDF
 * Captures dashboard metrics, financial goals, charts, and summary tables.
 */
export const exportDashboardToPDF = async (
  stats: DashboardStats,
  elementToCapture?: HTMLElement | null
) => {
  if (!stats) {
    alert('Estatísticas não carregadas para exportação.');
    return;
  }

  // If a DOM element was passed and html2canvas is working, capture visual snapshot
  if (elementToCapture) {
    try {
      const canvas = await html2canvas(elementToCapture, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#0f172a'
      });

      const imgData = canvas.toDataURL('image/png');
      const doc = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'pt',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      const imgWidth = pageWidth - 40;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let position = 20;
      let heightLeft = imgHeight;

      doc.addImage(imgData, 'PNG', 20, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        doc.addPage();
        doc.addImage(imgData, 'PNG', 20, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileDate = new Date().toISOString().slice(0, 10);
      doc.save(`dashboard_administrador_somos_joias_preciosas_${fileDate}.pdf`);
      return;
    } catch (canvasErr) {
      console.warn('html2canvas capture had an issue, falling back to structured vector PDF generation:', canvasErr);
    }
  }

  // High-fidelity structured vector PDF generation for Dashboard
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const dateStr = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Top Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 75, 'F');
  doc.setFillColor(245, 158, 11); // amber-500
  doc.rect(0, 73, pageWidth, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('DASHBOARD DO ADMINISTRADOR - RELATÓRIO GERAL', 25, 34);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(203, 213, 225);
  doc.text(`Evento: Somos Jóias Preciosas  |  Emissão: ${dateStr}`, 25, 54);

  let curY = 95;

  // Financial Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text('1. BALANÇO FINANCEIRO & METAS', 25, curY);
  curY += 12;

  const finHeaders = ['Indicador', 'Valor', 'Detalhamento'];
  const finRows = [
    ['Receita Confirmada (Comprovantes)', formatBRL(stats.totalRevenueReceived), `${stats.totalWithProof} participante(s) com comprovante`],
    ['Receita Pendente (A Receber)', formatBRL(stats.totalRevenuePending), `${stats.totalPendingProof} participante(s) aguardando`],
    ['Meta Financeira Definida', formatBRL(stats.revenueGoal), 'Meta cadastrada nas configurações'],
    ['Progresso da Meta', `${stats.goalProgressPercent}%`, `${formatBRL(stats.totalRevenueReceived)} de ${formatBRL(stats.revenueGoal)}`],
    ['Taxa por Participante', formatBRL(stats.ticketPrice), 'Valor unitário da inscrição']
  ];

  autoTable(doc, {
    head: [finHeaders],
    body: finRows,
    startY: curY,
    margin: { left: 25, right: 25 },
    theme: 'grid',
    headStyles: { fillColor: [245, 158, 11], textColor: [15, 23, 42], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 5 }
  });

  curY = (doc as any).lastAutoTable.finalY + 25;

  // General KPIs Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text('2. INDICADORES GERAIS DE PARTICIPAÇÃO', 25, curY);
  curY += 12;

  const kpiHeaders = ['Métrica', 'Quantidade', 'Proporção'];
  const kpiRows = [
    ['Total de Participantes Cadastrados', `${stats.totalParticipants}`, '100%'],
    ['Participantes com Comprovante', `${stats.totalWithProof}`, `${stats.totalParticipants > 0 ? Math.round((stats.totalWithProof / stats.totalParticipants) * 100) : 0}% dos inscritos`],
    ['Inscritos na Gincana', `${stats.gincanaCount}`, `${stats.totalParticipants > 0 ? Math.round((stats.gincanaCount / stats.totalParticipants) * 100) : 0}% dos inscritos`],
    ['Músicos na Tocata', `${stats.tocataCount}`, `${stats.totalParticipants > 0 ? Math.round((stats.tocataCount / stats.totalParticipants) * 100) : 0}% dos inscritos`],
    ['Contribuições de Alimentos / Bebidas', `${stats.foodContributionsCount}`, 'Itens confirmados']
  ];

  autoTable(doc, {
    head: [kpiHeaders],
    body: kpiRows,
    startY: curY,
    margin: { left: 25, right: 25 },
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 5 }
  });

  curY = (doc as any).lastAutoTable.finalY + 25;

  // Congregations Summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text('3. INSCRIÇÕES POR COMUM CONGREGAÇÃO', 25, curY);
  curY += 12;

  const congEntries = Object.entries(stats.congregationsCount).sort((a, b) => b[1] - a[1]);
  const congHeaders = ['#', 'Comum Congregação', 'Inscritos', '% do Total'];
  const congRows = congEntries.map(([name, count], i) => [
    i + 1,
    name,
    count,
    `${stats.totalParticipants > 0 ? Math.round((count / stats.totalParticipants) * 100) : 0}%`
  ]);

  autoTable(doc, {
    head: [congHeaders],
    body: congRows,
    startY: curY,
    margin: { left: 25, right: 25 },
    theme: 'striped',
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 4 }
  });

  curY = (doc as any).lastAutoTable.finalY + 25;

  // Age Groups & Recent registrations
  if (curY > 650) {
    doc.addPage();
    curY = 40;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text('4. DISTRIBUIÇÃO POR FAIXA ETÁRIA', 25, curY);
  curY += 12;

  const ageHeaders = ['Faixa Etária', 'Quantidade', '% do Total'];
  const ageRows = [
    ['Crianças (≤ 11 anos)', stats.ageGroups.kids, `${stats.totalParticipants > 0 ? Math.round((stats.ageGroups.kids / stats.totalParticipants) * 100) : 0}%`],
    ['Adolescentes (12 a 17 anos)', stats.ageGroups.teens, `${stats.totalParticipants > 0 ? Math.round((stats.ageGroups.teens / stats.totalParticipants) * 100) : 0}%`],
    ['Jovens (18 a 35 anos)', stats.ageGroups.youth, `${stats.totalParticipants > 0 ? Math.round((stats.ageGroups.youth / stats.totalParticipants) * 100) : 0}%`],
    ['Adultos (36+ anos)', stats.ageGroups.adults, `${stats.totalParticipants > 0 ? Math.round((stats.ageGroups.adults / stats.totalParticipants) * 100) : 0}%`]
  ];

  autoTable(doc, {
    head: [ageHeaders],
    body: ageRows,
    startY: curY,
    margin: { left: 25, right: 25 },
    theme: 'grid',
    headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 5 }
  });

  // Footer for each page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Página ${i} de ${totalPages}  |  Relatório Oficial Somos Jóias Preciosas`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 15,
      { align: 'center' }
    );
  }

  const fileDate = new Date().toISOString().slice(0, 10);
  doc.save(`dashboard_administrador_somos_joias_preciosas_${fileDate}.pdf`);
};
