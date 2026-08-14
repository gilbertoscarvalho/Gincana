export interface ActivitySelection {
  gincana: boolean;
  tocata: boolean;
  instrument?: string;
}

export type ProofStatus = 'Pendente' | 'Analisando' | 'Aprovado' | 'Rejeitado';

export interface Participant {
  id: string;
  fullName: string;
  firstName: string;
  congregation: string;
  age: number;
  foodOrDrink?: string;
  activities: ActivitySelection;
  proofUrl?: string | null;
  proofFileName?: string | null;
  proofFileType?: 'image' | 'pdf' | null;
  proofStatus: ProofStatus;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface ParticipantLookupQuery {
  firstName: string;
  congregation: string;
  age: number;
}

export interface EventSettings {
  ticketPrice: number;        // Taxa da gincana por pessoa em R$
  revenueGoal: number;        // Meta financeira total em R$
  adminPassword: string;      // Senha para liberar acesso de administrador
  eventDate: string;          // ISO string date para a contagem regressiva
  locationName: string;
  locationAddress: string;
  googleMapsEmbedUrl: string;
  congregations?: string[];   // Lista de igrejas/congregações cadastradas pelo admin
  galleryItems?: GalleryMediaItem[]; // Fotos e vídeos do evento anterior e atual
  eventName?: string;         // Nome/Título da Aplicação no topo
  logoUrl?: string;           // URL/Base64 da Logo da gincana
  proofPhoneNumber?: string;  // Número de telefone/WhatsApp para envio do comprovante
  blobReadWriteToken?: string; // Token de leitura/escrita do Vercel Blob (BLOB_READ_WRITE_TOKEN)
  blobAutoSync?: boolean;     // Habilitar sincronização automática com Vercel Blob
  blobStorageUrl?: string;    // URL do backup principal no Vercel Blob
  blobLastSyncAt?: string;    // Data da última sincronização com Vercel Blob
  theme?: 'dark' | 'light';   // Tema de cores da aplicação
}

export interface DashboardStats {
  totalParticipants: number;
  totalWithProof: number;
  totalPendingProof: number;
  totalApprovedProof: number;
  gincanaCount: number;
  tocataCount: number;
  foodContributionsCount: number;
  congregationsCount: Record<string, number>;
  ageGroups: {
    kids: number;     // 0-11
    teens: number;    // 12-17
    youth: number;    // 18-35
    adults: number;   // 36+
  };
  // Financial metrics for admin
  ticketPrice: number;
  revenueGoal: number;
  totalRevenueReceived: number; // Approved/attached proof participants * ticketPrice
  totalRevenuePending: number;  // Pending participants * ticketPrice
  goalProgressPercent: number;  // % of goal reached
  recentRegistrations: Participant[];
}

export interface EventTeam {
  id: string;
  name: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  description: string;
  motto: string;
  iconName: string;
}

export interface GalleryMediaItem {
  id: string;
  title: string;
  category: 'anterior' | 'atual'; // Último evento vs Edição atual
  type: 'photo' | 'video';
  url: string;
  thumbnailUrl: string;
  description: string;
}
