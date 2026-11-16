export interface Customer {
  id: string;
  subscriber_id: string;
  full_name: string;
  phone: string;
  email?: string;
  address?: string;
  zone?: string;
  pppoe_username: string;
  plan_name: string;
  bandwidth_mbps: number;
  monthly_bill_bdt: number;
  current_due_bdt: number;
  olt_ip: string;
  pon_port: string;
  onu_mac: string;
  optical_power_dbm: number;
  connection_status: 'online' | 'offline' | 'degraded';
}

export interface ToolCallItem {
  tool_name: string;
  arguments: Record<string, any>;
  result: any;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'customer' | 'ai_agent' | 'human_agent' | 'system' | 'internal_note';
  sender_name?: string;
  content: string;
  tool_calls?: ToolCallItem[] | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  customer_id?: string;
  subscriber_id?: string;
  customer_name?: string;
  customer_phone?: string;
  channel: string;
  status: 'ai_handling' | 'agent_handling' | 'resolved' | 'closed' | 'waiting_for_agent' | 'human_takeover' | 'AI_ACTIVE' | 'open' | string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_ai_handled?: boolean;
  assigned_agent_id?: string | null;
  metadata_info?: Record<string, any>;
  created_at: string;
  updated_at: string;
  messages: Message[];
}

export interface Ticket {
  id: string;
  ticket_number: string;
  customer_id: string;
  conversation_id?: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assigned_to?: string | null;
  escalation_reason?: string | null;
  created_at: string;
  resolved_at?: string | null;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  slug?: string;
  category: string;
  summary?: string;
  content: string;
  keywords: string[];
  is_published?: boolean;
  author?: string;
  citations_count?: number;
  citationsByAI?: number;
  views?: number;
  views_count?: number;
  has_embedding?: boolean;
  chunk_count?: number;
  lastUpdated?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SemanticSearchResultItem {
  id: string;
  document_id: string;
  title: string;
  category: string;
  content?: string;
  snippet: string;
  similarity_score: number;
  source_reference: string;
}

export interface DashboardStats {
  time_range?: string;
  total_conversations: number;
  active_conversations: number;
  ai_handled_conversations?: number;
  human_handled_conversations?: number;
  ai_resolved_percentage: number;
  human_escalated_percentage: number;
  total_tickets: number;
  open_tickets: number;
  resolved_tickets?: number;
  active_agents_count?: number;
  average_response_time_seconds: number;
  average_response_time_ms?: number;
  customer_satisfaction_score: number;
  total_csat_ratings?: number;
  csat_distribution?: Record<string, number>;
  tool_execution_stats?: {
    total: number;
    success: number;
    failure: number;
    success_rate: number;
    top_tools?: Array<{
      tool_name: string;
      count: number;
      percentage: number;
    }>;
  };
  top_issues: Array<{
    category: string;
    raw_key?: string;
    count: number;
    percentage: number;
  }>;
  timeline_activity?: Array<{
    date: string;
    conversations: number;
    tickets: number;
    csat: number;
  }>;
  calculation_methodology?: Record<string, string>;
}
