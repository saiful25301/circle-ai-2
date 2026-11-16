import { Conversation, Message, Customer, Ticket, DashboardStats, KnowledgeArticle } from '../types';

const API_BASE = '/api/v1';

export const api = {
  // Conversations
  async getConversations(): Promise<Conversation[]> {
    const res = await fetch(`${API_BASE}/conversations`);
    if (!res.ok) throw new Error('Failed to fetch conversations');
    return res.json();
  },

  async getConversation(id: string): Promise<Conversation> {
    const res = await fetch(`${API_BASE}/conversations/${id}`);
    if (!res.ok) throw new Error('Failed to fetch conversation');
    return res.json();
  },

  async createConversation(customer_id?: string, initial_message?: string): Promise<Conversation> {
    const res = await fetch(`${API_BASE}/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_id, initial_message, channel: 'webchat' }),
    });
    if (!res.ok) throw new Error('Failed to create conversation');
    return res.json();
  },

  async sendMessage(conversation_id: string, content: string, sender_type: 'customer' | 'human_agent' = 'customer', sender_name?: string): Promise<Message> {
    const res = await fetch(`${API_BASE}/conversations/${conversation_id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, sender_type, sender_name }),
    });
    if (!res.ok) throw new Error('Failed to post message');
    return res.json();
  },

  async updateConversationStatus(id: string, status: string, priority?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/conversations/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, priority }),
    });
    if (!res.ok) throw new Error('Failed to update status');
    return res.json();
  },

  // Customers
  async getCustomers(): Promise<Customer[]> {
    const res = await fetch(`${API_BASE}/customers`);
    if (!res.ok) throw new Error('Failed to fetch customers');
    return res.json();
  },

  async getCustomer(subscriber_id: string): Promise<Customer> {
    const res = await fetch(`${API_BASE}/customers/${subscriber_id}`);
    if (!res.ok) throw new Error('Failed to fetch customer');
    return res.json();
  },

  async diagnoseCustomer(subscriber_id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/customers/${subscriber_id}/diagnose`);
    if (!res.ok) throw new Error('Failed to diagnose customer');
    return res.json();
  },

  // Tickets
  async getTickets(): Promise<Ticket[]> {
    const res = await fetch(`${API_BASE}/tickets`);
    if (!res.ok) throw new Error('Failed to fetch tickets');
    return res.json();
  },

  async createTicket(payload: Partial<Ticket>): Promise<Ticket> {
    const res = await fetch(`${API_BASE}/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to create ticket');
    return res.json();
  },

  // Analytics
  async getAnalytics(): Promise<DashboardStats> {
    const res = await fetch(`${API_BASE}/analytics/overview`);
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
  },

  // Knowledge Base
  async getKnowledgeBase(): Promise<KnowledgeArticle[]> {
    const res = await fetch(`${API_BASE}/rag/articles`);
    if (!res.ok) throw new Error('Failed to fetch knowledge base');
    return res.json();
  },
};
