export type DashboardSection =
  | 'overview'
  | 'inbox'
  | 'ai_conversations'
  | 'human_conversations'
  | 'customers'
  | 'tickets'
  | 'ai_activity'
  | 'knowledge_base'
  | 'analytics'
  | 'settings';

export interface DashboardMetric {
  id: string;
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  subtext?: string;
  iconName: string;
}

export interface SubscriberContact {
  id: string;
  subscriberId: string; // e.g. CN-88214
  fullName: string;
  phone: string;
  email: string;
  zone: string;
  address: string;
  pppoeUsername: string;
  planName: string;
  bandwidthMbps: number;
  monthlyBillBdt: number;
  currentDueBdt: number;
  opticalPowerDbm: number;
  connectionStatus: 'online' | 'offline' | 'degraded';
  oltIp: string;
  ponPort: string;
  onuMac: string;
  joinDate: string;
}

export interface SupportTicketItem {
  id: string;
  ticketNumber: string;
  subscriberId: string;
  subscriberName: string;
  title: string;
  category: 'fiber_break' | 'optical_loss' | 'high_ping' | 'billing' | 'router_config';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assignedAgent: string;
  conversationId?: string;
  createdAt: string;
  updatedAt: string;
  slaRemainingHours: number;
}

export interface AIToolActivityLog {
  id: string;
  timestamp: string;
  conversationId: string;
  subscriberId: string;
  toolName: 'diagnose_onu_status' | 'check_subscriber_billing' | 'reboot_onu_session' | 'list_internet_plans';
  inputArgs: Record<string, any>;
  outputResult: Record<string, any>;
  executionTimeMs: number;
  geminiModel: string;
  confidenceScore: number;
  escalated: boolean;
}

export interface KBArticleItem {
  id: string;
  title: string;
  slug: string;
  category: 'troubleshooting' | 'billing' | 'router_setup' | 'bdix' | 'packages';
  views: number;
  citationsByAI: number;
  lastUpdated: string;
  author: string;
  summary: string;
  content: string;
}

export interface AgentMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'noc_engineer' | 'tier1_support';
  avatar: string;
  status: 'available' | 'busy' | 'offline';
  assignedChatsCount: number;
  resolvedTodayCount: number;
}
