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
  sender_type: 'customer' | 'ai_agent' | 'human_agent' | 'system';
  sender_name?: string;
  content: string;
  tool_calls?: ToolCallItem[] | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  customer_id?: string;
  channel: string;
  status: 'ai_handling' | 'agent_handling' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
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
  content: string;
  keywords: string[];
}

export interface DashboardStats {
  total_conversations: number;
  active_conversations: number;
  ai_resolved_percentage: number;
  human_escalated_percentage: number;
  total_tickets: number;
  open_tickets: number;
  average_response_time_seconds: number;
  customer_satisfaction_score: number;
  top_issues: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
}
