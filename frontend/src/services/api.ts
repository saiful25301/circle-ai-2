import {
  Conversation,
  Message,
  Customer,
  DashboardStats,
  KnowledgeArticle,
} from '../types';

const rawApiUrl = (import.meta as any).env?.VITE_API_URL || '/api/v1';
const API_BASE = rawApiUrl.endsWith('/api/v1') ? rawApiUrl : `${rawApiUrl.replace(/\/+$/, '')}/api/v1`;

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'agent' | 'supervisor' | 'noc_engineer';
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  role: 'admin' | 'agent' | 'supervisor' | 'noc_engineer';
  full_name: string;
  email: string;
}

class ApiClient {
  private tokenKey = 'circle_ai_access_token';
  private userKey = 'circle_ai_user_profile';

  // ---------------------------------------------------------------------------
  // Auth Token Management
  // ---------------------------------------------------------------------------
  getAuthToken(): string | null {
    try {
      return localStorage.getItem(this.tokenKey);
    } catch {
      return null;
    }
  }

  setAuthToken(token: string): void {
    try {
      localStorage.setItem(this.tokenKey, token);
    } catch (e) {
      console.warn('Could not store token:', e);
    }
  }

  getAuthUser(): AuthUser | null {
    try {
      const u = localStorage.getItem(this.userKey);
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  }

  setAuthUser(user: AuthUser): void {
    try {
      localStorage.setItem(this.userKey, JSON.stringify(user));
    } catch (e) {
      console.warn('Could not store user:', e);
    }
  }

  logout(): void {
    try {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);
    } catch (e) {
      console.warn('Error clearing credentials:', e);
    }
  }

  isAuthenticated(): boolean {
    return !!this.getAuthToken();
  }

  private getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  // ---------------------------------------------------------------------------
  // Authentication Endpoints
  // ---------------------------------------------------------------------------
  async login(email: string, password: string): Promise<LoginResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err.detail || err.error?.message || 'Login failed. Please check credentials.';
      throw new Error(msg);
    }

    const data: LoginResponse = await res.json();
    this.setAuthToken(data.access_token);
    this.setAuthUser({
      id: '',
      email: data.email,
      full_name: data.full_name,
      role: data.role,
    });
    return data;
  }

  async getMe(): Promise<AuthUser> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Unauthenticated');
    const user = await res.json();
    this.setAuthUser(user);
    return user;
  }

  // ---------------------------------------------------------------------------
  // Conversations & Messages (Persisted in DB)
  // ---------------------------------------------------------------------------
  async getConversations(statusFilter?: string): Promise<Conversation[]> {
    const query = statusFilter && statusFilter !== 'all' ? `?status_filter=${statusFilter}` : '';
    const res = await fetch(`${API_BASE}/conversations${query}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch conversations from database');
    return res.json();
  }

  async getConversation(id: string): Promise<Conversation> {
    const res = await fetch(`${API_BASE}/conversations/${id}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch conversation');
    return res.json();
  }

  async createConversation(customerId?: string, initialMessage?: string, channel = 'webchat'): Promise<Conversation> {
    const res = await fetch(`${API_BASE}/conversations`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        customer_id: customerId,
        initial_message: initialMessage,
        channel,
      }),
    });
    if (!res.ok) throw new Error('Failed to create conversation');
    return res.json();
  }

  async getConversationCounts(): Promise<{ pending: number; active: number; resolved: number; ai_active: number }> {
    const res = await fetch(`${API_BASE}/conversations/counts`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch conversation counts');
    return res.json();
  }

  async assignConversation(conversationId: string, agentId: string): Promise<Conversation> {
    const res = await fetch(`${API_BASE}/conversations/${conversationId}/assign`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ agent_id: agentId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to assign conversation');
    }
    return res.json();
  }

  async transferConversation(conversationId: string, toAgentId: string, reason: string): Promise<Conversation> {
    const res = await fetch(`${API_BASE}/conversations/${conversationId}/transfer`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ to_agent_id: toAgentId, reason }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to transfer conversation');
    }
    return res.json();
  }

  async handbackToAI(conversationId: string): Promise<Conversation> {
    const res = await fetch(`${API_BASE}/conversations/${conversationId}/handback`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to hand back conversation to AI');
    }
    return res.json();
  }

  async sendMessage(
    conversationId: string,
    content: string,
    senderType: 'customer' | 'human_agent' | 'ai_agent' | 'system' | 'internal_note' = 'customer',
    senderName?: string
  ): Promise<Message> {
    const res = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        content,
        sender_type: senderType,
        sender_name: senderName,
      }),
    });
    if (!res.ok) throw new Error('Failed to post message to conversation');
    return res.json();
  }

  async updateConversationStatus(
    id: string,
    status: string,
    priority?: string,
    assignedAgentId?: string
  ): Promise<Conversation> {
    const res = await fetch(`${API_BASE}/conversations/${id}/status`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({
        status,
        priority,
        assigned_agent_id: assignedAgentId,
      }),
    });
    if (!res.ok) throw new Error('Failed to update conversation status');
    return res.json();
  }

  // ---------------------------------------------------------------------------
  // Customers & ISP Telemetry
  // ---------------------------------------------------------------------------
  async getCustomers(statusFilter?: string, search?: string): Promise<Customer[]> {
    const params = new URLSearchParams();
    if (statusFilter && statusFilter !== 'all') params.append('status_filter', statusFilter);
    if (search) params.append('search', search);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/customers${query}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch subscribers');
    return res.json();
  }

  async getCustomer(subscriberId: string): Promise<Customer> {
    const res = await fetch(`${API_BASE}/customers/${subscriberId}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Subscriber not found');
    return res.json();
  }

  async rebootCustomer(subscriberId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/customers/${subscriberId}/reboot`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Reboot failed');
    }
    return res.json();
  }

  async diagnoseCustomer(subscriberId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/customers/${subscriberId}/diagnose`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to diagnose subscriber connection');
    return res.json();
  }

  // ---------------------------------------------------------------------------
  // Complaint Tickets
  // ---------------------------------------------------------------------------
  async getTickets(statusFilter?: string): Promise<any[]> {
    const query = statusFilter && statusFilter !== 'all' ? `?status_filter=${statusFilter}` : '';
    const res = await fetch(`${API_BASE}/tickets${query}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch tickets');
    return res.json();
  }

  async createTicket(payload: {
    customer_id: string;
    conversation_id?: string;
    title: string;
    description: string;
    category: string;
    priority: string;
    assigned_to?: string;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/tickets`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to create ticket');
    }
    return res.json();
  }

  async updateTicketStatus(
    ticketId: string,
    status?: string,
    priority?: string,
    assignedTo?: string
  ): Promise<any> {
    const res = await fetch(`${API_BASE}/tickets/${ticketId}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({
        status,
        priority,
        assigned_to: assignedTo,
      }),
    });
    if (!res.ok) throw new Error('Failed to update ticket');
    return res.json();
  }

  // ---------------------------------------------------------------------------
  // Analytics & Reports
  // ---------------------------------------------------------------------------
  async getAnalytics(timeRange: 'today' | 'last_7_days' | 'last_30_days' | 'all_time' = 'last_30_days'): Promise<DashboardStats> {
    const res = await fetch(`${API_BASE}/analytics/overview?time_range=${timeRange}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
  }

  async submitConversationFeedback(
    conversationId: string,
    payload: { rating: number; feedback_text?: string; customer_sentiment?: string }
  ): Promise<any> {
    const res = await fetch(`${API_BASE}/conversations/${conversationId}/feedback`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to submit customer feedback');
    }
    return res.json();
  }

  // ---------------------------------------------------------------------------
  // Knowledge Base & RAG
  // ---------------------------------------------------------------------------
  async getKnowledgeBase(category?: string, search?: string, includeUnpublished = true): Promise<KnowledgeArticle[]> {
    const params = new URLSearchParams();
    if (category && category !== 'all') params.append('category', category);
    if (search) params.append('search', search);
    if (includeUnpublished) params.append('include_unpublished', 'true');

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/rag/articles${query}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch knowledge base');
    return res.json();
  }

  async getKnowledgeArticle(id: string): Promise<KnowledgeArticle> {
    const res = await fetch(`${API_BASE}/rag/articles/${id}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch knowledge article');
    return res.json();
  }

  async createKnowledgeArticle(payload: {
    title: string;
    category: string;
    content: string;
    summary?: string;
    keywords?: string[];
    is_published?: boolean;
    author?: string;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/rag/articles`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to create knowledge article');
    }
    return res.json();
  }

  async updateKnowledgeArticle(
    id: string,
    payload: {
      title?: string;
      category?: string;
      content?: string;
      summary?: string;
      keywords?: string[];
      is_published?: boolean;
      author?: string;
    }
  ): Promise<any> {
    const res = await fetch(`${API_BASE}/rag/articles/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update knowledge article');
    }
    return res.json();
  }

  async deleteKnowledgeArticle(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/rag/articles/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to delete knowledge article');
    }
    return res.json();
  }

  async toggleKnowledgeArticleActive(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/rag/articles/${id}/toggle-active`, {
      method: 'PATCH',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to toggle article status');
    }
    return res.json();
  }

  async uploadKnowledgeArticleFile(file: File, category = 'troubleshooting', author = 'NOC Field Engineering'): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    formData.append('author', author);

    const token = this.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}/rag/articles/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to upload document file');
    }
    return res.json();
  }

  async searchKnowledgeBaseSemantic(
    query: string,
    category?: string,
    topK = 5,
    minScore = 0.2
  ): Promise<any[]> {
    const res = await fetch(`${API_BASE}/rag/search/semantic`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        query,
        category: category && category !== 'all' ? category : undefined,
        top_k: topK,
        min_score: minScore,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to perform semantic search');
    }
    return res.json();
  }

  // ---------------------------------------------------------------------------
  // AI Tool Logs
  // ---------------------------------------------------------------------------
  async getAILogs(paramsOrLimit?: number | {
    search?: string;
    toolName?: string;
    escalatedOnly?: boolean;
    limit?: number;
  }): Promise<any[]> {
    const queryParams = new URLSearchParams();
    if (typeof paramsOrLimit === 'number') {
      queryParams.append('limit', String(paramsOrLimit));
    } else if (paramsOrLimit) {
      if (paramsOrLimit.search) queryParams.append('search', paramsOrLimit.search);
      if (paramsOrLimit.toolName && paramsOrLimit.toolName !== 'all') queryParams.append('tool_name', paramsOrLimit.toolName);
      if (paramsOrLimit.escalatedOnly) queryParams.append('escalated_only', 'true');
      queryParams.append('limit', String(paramsOrLimit.limit || 100));
    } else {
      queryParams.append('limit', '100');
    }

    const res = await fetch(`${API_BASE}/ai/logs?${queryParams.toString()}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new Error('Access denied: Admin or Supervisor role required to view AI audit logs.');
      }
      throw new Error('Failed to fetch AI tool execution logs');
    }
    return res.json();
  }

  // ---------------------------------------------------------------------------
  // Agents & ISP Packages
  // ---------------------------------------------------------------------------
  async getAgents(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/agents`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch agents');
    return res.json();
  }

  async updateAgentStatus(agentId: string, status: 'online' | 'busy' | 'offline'): Promise<any> {
    const res = await fetch(`${API_BASE}/agents/${agentId}/status`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Failed to update agent status');
    return res.json();
  }

  async getPackages(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/packages`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch internet packages');
    return res.json();
  }
}

export const api = new ApiClient();
