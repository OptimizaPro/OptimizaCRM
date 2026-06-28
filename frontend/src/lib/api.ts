const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface RequestOptions extends RequestInit {
  token?: string;
  orgId?: string;
  _retry?: boolean;
}

// ── Token refresh state ───────────────────────────────────────────────────────
// Holds the in-flight refresh promise so concurrent 401s share one refresh call.
let _refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(refreshToken: string): Promise<string> {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = fetch(`${API_URL}/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: refreshToken }),
  })
    .then(async (res) => {
      if (!res.ok) throw new Error("Refresh failed");
      const data = await res.json();
      // Update persisted store with new tokens (import at call-time to avoid circular dep at module load)
      const { useAuthStore } = await import("@/store/auth");
      const { user, organization, tokens } = useAuthStore.getState();
      if (user && organization && tokens) {
        useAuthStore.getState().setAuth(user, organization, {
          access:  data.access,
          refresh: data.refresh ?? refreshToken, // simplejwt rotates refresh token
        });
      }
      return data.access as string;
    })
    .finally(() => { _refreshPromise = null; });

  return _refreshPromise;
}

class ApiClient {
  private getHeaders(options: RequestOptions = {}): HeadersInit {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (options.token) {
      headers["Authorization"] = `Bearer ${options.token}`;
    }
    if (options.orgId) {
      headers["X-Organization-ID"] = options.orgId;
    }
    return headers;
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { token, orgId, _retry, ...fetchOptions } = options;
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...fetchOptions,
      headers: {
        ...this.getHeaders({ token, orgId }),
        ...(fetchOptions.headers as Record<string, string>),
      },
    });

    // ── Auto-refresh on 401 ──────────────────────────────────────────────────
    if (response.status === 401 && !_retry) {
      try {
        const { useAuthStore } = await import("@/store/auth");
        const { tokens, logout } = useAuthStore.getState();
        if (tokens?.refresh) {
          const newAccess = await refreshAccessToken(tokens.refresh);
          return this.request<T>(endpoint, { ...options, token: newAccess, _retry: true });
        }
        logout();
      } catch {
        const { useAuthStore } = await import("@/store/auth");
        useAuthStore.getState().logout();
      }
      throw new Error("Sesión expirada. Por favor inicia sesión de nuevo.");
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Request failed" }));
      throw new Error(error.message || error.error || `HTTP ${response.status}`);
    }

    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      return response.json();
    }
    return response.text() as unknown as T;
  }

  get<T>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  post<T>(endpoint: string, data?: unknown, options?: RequestOptions) {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  patch<T>(endpoint: string, data?: unknown, options?: RequestOptions) {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  delete<T>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }

  async upload<T>(endpoint: string, formData: FormData, options: RequestOptions = {}): Promise<T> {
    const { token, orgId } = options;
    const headers: Record<string, string> = {};
    if (token)  headers["Authorization"]    = `Bearer ${token}`;
    if (orgId)  headers["X-Organization-ID"] = orgId;
    const response = await fetch(`${API_URL}${endpoint}`, { method: "POST", headers, body: formData });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Request failed" }));
      throw new Error(error.message || error.error || `HTTP ${response.status}`);
    }
    return response.json();
  }

  async download(endpoint: string, filename: string, options: RequestOptions = {}): Promise<void> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: this.getHeaders(options) as HeadersInit,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

export const api = new ApiClient();

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role?: string;
  current_organization?: Organization;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

export interface Membership {
  id: string;
  role: string;
  organization: Organization;
}

export interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  company: string;
  title: string;
  source: string;
  status: string;
  score: number;
  notes: string;
  email_opens: number;
  link_clicks: number;
  page_visits: number;
  engagement_score: number;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: string;
  churn_risk: number;
  lifetime_value: string;
  address: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Opportunity {
  id: string;
  title: string;
  stage: string;
  amount: string;
  probability: number;
  expected_close_date: string | null;
  description: string;
  lost_reason: string;
  customer_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  due_date: string | null;
}

export interface PipelineStage {
  id: string;
  name: string;
  slug: string;
  order: number;
  color: string;
  probability: number;
  sla_hours: number | null;
  is_won: boolean;
  is_lost: boolean;
}

export interface PipelineTemplate {
  id: string;
  name: string;
  description: string;
  pipeline_type: 'sales' | 'post_sale' | 'loyalty' | 'custom';
  color: string;
  is_active: boolean;
  is_default: boolean;
  stages: PipelineStage[];
  opportunity_count: number;
  created_at: string;
}

export interface DashboardData {
  revenue: { total: number; monthly: number; pipeline_value: number };
  sales: {
    total_leads: number;
    converted_leads: number;
    open_opportunities: number;
    won_deals: number;
    lost_deals: number;
  };
  conversion: { lead_conversion_rate: number; win_rate: number };
  customers: { total: number; active: number; at_risk: number };
  tasks: { pending: number; overdue: number; completed_this_month: number };
  recent_activities: Array<{
    id: string;
    activity_type: string;
    subject: string;
    created_at: string;
    user__email: string;
  }>;
}

export interface IntegrationLog {
  id: string;
  direction: 'inbound' | 'outbound';
  contact: string;
  message_type: string;
  content: string;
  status: string;
  created_at: string;
}

export interface Integration {
  id: string;
  channel_type: 'whatsapp' | 'email' | 'facebook' | 'instagram' | 'telegram' | 'sms';
  channel_type_display: string;
  name: string;
  config: Record<string, string>;
  status: 'disconnected' | 'connected' | 'error' | 'pending';
  status_display: string;
  is_active: boolean;
  connected_at: string | null;
  last_sync_at: string | null;
  error_message: string;
  recent_logs: IntegrationLog[];
  created_at: string;
}

export interface MembershipDetail {
  id: string;
  role: string;
  is_active: boolean;
  joined_at: string;
  user: User;
}

export const settingsApi = {
  updateProfile: (token: string, orgId: string, data: Partial<Pick<User, 'first_name' | 'last_name' | 'email'>>) =>
    api.patch<User>('/auth/me/', data, { token, orgId }),

  changePassword: (token: string, orgId: string, data: { current_password: string; new_password: string }) =>
    api.post<{ message: string }>('/auth/change-password/', data, { token, orgId }),

  updateOrganization: (token: string, orgId: string, data: Partial<Organization>) =>
    api.patch<Organization>(`/organizations/${orgId}/`, data, { token, orgId }),

  getMembers: (token: string, orgId: string) =>
    api.get<MembershipDetail[]>(`/organizations/${orgId}/members/`, { token, orgId }),

  inviteMember: (token: string, orgId: string, data: { email: string; role: string; first_name?: string; last_name?: string }) =>
    api.post<MembershipDetail>(`/organizations/${orgId}/members/`, data, { token, orgId }),

  updateMemberRole: (token: string, orgId: string, membershipId: string, role: string) =>
    api.patch<MembershipDetail>(`/organizations/${orgId}/members/${membershipId}/`, { role }, { token, orgId }),

  removeMember: (token: string, orgId: string, membershipId: string) =>
    api.delete(`/organizations/${orgId}/members/${membershipId}/`, { token, orgId }),
};

export const authApi = {
  register: (data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    organization_name: string;
  }) => api.post<{ user: User; organization: Organization; tokens: AuthTokens }>("/auth/register/", data),

  login: (data: { email: string; password: string }) =>
    api.post<{ user: User; memberships: Membership[]; tokens: AuthTokens }>("/auth/login/", data),

  logout: (refresh: string, token: string, orgId: string) =>
    api.post("/auth/logout/", { refresh }, { token, orgId }),

  me: (token: string, orgId: string) => api.get<User>("/auth/me/", { token, orgId }),

  forgotPassword: (email: string) =>
    api.post<{ message: string }>("/auth/forgot-password/", { email }),
};

export interface SalesGoal {
  id: string;
  user: string;
  user_name: string;
  period: "monthly" | "quarterly";
  year: number;
  month: number | null;
  quarter: number | null;
  target_revenue: string;
  target_deals: number;
}

export interface TeamMember {
  user_id: string;
  name: string;
  role: string;
  leads_assigned: number;
  leads_converted: number;
  deals_won: number;
  deals_won_month: number;
  revenue: number;
  revenue_month: number;
  tasks_completed: number;
  target_revenue: number;
  target_deals: number;
  attainment_pct: number | null;
}

export interface StageData {
  stage: string;
  count: number;
  value: number;
  avg_deal_size: number;
  weighted_value: number;
  avg_probability: number;
}

export interface CloseRateData {
  period: string;
  new_leads: number;
  deals_won: number;
  close_rate: number;
}

export const goalsApi = {
  getAll: (token: string, orgId: string) =>
    api.get<{ results: SalesGoal[] }>("/goals/", { token, orgId }),

  create: (token: string, orgId: string, data: Partial<SalesGoal>) =>
    api.post<SalesGoal>("/goals/", data, { token, orgId }),

  update: (token: string, orgId: string, id: string, data: Partial<SalesGoal>) =>
    api.patch<SalesGoal>(`/goals/${id}/`, data, { token, orgId }),

  delete: (token: string, orgId: string, id: string) =>
    api.delete(`/goals/${id}/`, { token, orgId }),
};

export const crmApi = {
  getDashboard: (token: string, orgId: string) =>
    api.get<DashboardData>("/dashboard/", { token, orgId }),

  getLeads: (token: string, orgId: string, params?: string) =>
    api.get<PaginatedResponse<Lead>>(`/leads/${params ? `?${params}` : ""}`, { token, orgId }),

  createLead: (token: string, orgId: string, data: Partial<Lead>) =>
    api.post<Lead>("/leads/", data, { token, orgId }),

  updateLead: (token: string, orgId: string, id: string, data: Partial<Lead>) =>
    api.patch<Lead>(`/leads/${id}/`, data, { token, orgId }),

  deleteLead: (token: string, orgId: string, id: string) =>
    api.delete(`/leads/${id}/`, { token, orgId }),

  getCustomers: (token: string, orgId: string, params?: string) =>
    api.get<PaginatedResponse<Customer>>(`/customers/${params ? `?${params}` : ""}`, { token, orgId }),

  createCustomer: (token: string, orgId: string, data: Partial<Customer>) =>
    api.post<Customer>("/customers/", data, { token, orgId }),

  updateCustomer: (token: string, orgId: string, id: string, data: Partial<Customer>) =>
    api.patch<Customer>(`/customers/${id}/`, data, { token, orgId }),

  deleteCustomer: (token: string, orgId: string, id: string) =>
    api.delete(`/customers/${id}/`, { token, orgId }),

  getOpportunities: (token: string, orgId: string, params?: string) =>
    api.get<PaginatedResponse<Opportunity>>(`/opportunities/${params ? `?${params}` : ""}`, { token, orgId }),

  createOpportunity: (token: string, orgId: string, data: Partial<Opportunity>) =>
    api.post<Opportunity>("/opportunities/", data, { token, orgId }),

  updateOpportunity: (token: string, orgId: string, id: string, data: Partial<Opportunity>) =>
    api.patch<Opportunity>(`/opportunities/${id}/`, data, { token, orgId }),

  deleteOpportunity: (token: string, orgId: string, id: string) =>
    api.delete(`/opportunities/${id}/`, { token, orgId }),

  getPipeline: (token: string, orgId: string) =>
    api.get<Record<string, { count: number; total_amount: number; opportunities: Opportunity[] }>>(
      "/opportunities/pipeline/",
      { token, orgId }
    ),

  updateOpportunityStage: (token: string, orgId: string, id: string, stage: string) =>
    api.patch<Opportunity>(`/opportunities/${id}/stage/`, { stage }, { token, orgId }),

  getTasks: (token: string, orgId: string) =>
    api.get<PaginatedResponse<Task>>("/tasks/", { token, orgId }),

  getRevenueAnalytics: (token: string, orgId: string) =>
    api.get<{ data: Array<{ period: string; revenue: number }> }>("/analytics/revenue/", { token, orgId }),

  getPipelineAnalytics: (token: string, orgId: string) =>
    api.get<{ funnel: Array<{ stage: string; count: number; value: number }> }>(
      "/analytics/pipeline/",
      { token, orgId }
    ),

  getTeamPerformance: (token: string, orgId: string, year?: number, month?: number) =>
    api.get<{ team: TeamMember[]; year: number; month: number }>(
      `/analytics/team/${year && month ? `?year=${year}&month=${month}` : ""}`,
      { token, orgId }
    ),

  getStagesSummary: (token: string, orgId: string) =>
    api.get<{ stages: StageData[]; win_rate: number; close_rates: CloseRateData[] }>(
      "/analytics/stages/",
      { token, orgId }
    ),

  getPipelines: (token: string, orgId: string) =>
    api.get<PipelineTemplate[]>('/pipelines/', { token, orgId }),

  createPipeline: (token: string, orgId: string, data: Partial<PipelineTemplate>) =>
    api.post<PipelineTemplate>('/pipelines/', data, { token, orgId }),

  updatePipeline: (token: string, orgId: string, id: string, data: Partial<PipelineTemplate>) =>
    api.patch<PipelineTemplate>(`/pipelines/${id}/`, data, { token, orgId }),

  deletePipeline: (token: string, orgId: string, id: string) =>
    api.delete(`/pipelines/${id}/`, { token, orgId }),

  addStage: (token: string, orgId: string, pipelineId: string, data: Partial<PipelineStage>) =>
    api.post<PipelineStage>(`/pipelines/${pipelineId}/stages/`, data, { token, orgId }),

  updateStage: (token: string, orgId: string, pipelineId: string, stageId: string, data: Partial<PipelineStage>) =>
    api.patch<PipelineStage>(`/pipelines/${pipelineId}/stages/${stageId}/`, data, { token, orgId }),

  removeStage: (token: string, orgId: string, pipelineId: string, stageId: string) =>
    api.delete(`/pipelines/${pipelineId}/stages/${stageId}/`, { token, orgId }),

  getPipelineKanban: (token: string, orgId: string, pipelineId: string) =>
    api.get<Record<string, { stage: PipelineStage; count: number; total_amount: number; opportunities: Opportunity[] }>>(
      `/pipelines/${pipelineId}/kanban/`,
      { token, orgId }
    ),
};

export type WritingAction = 'improve' | 'professional' | 'informal' | 'summarize';

export const writingAssistantApi = {
  assist: (token: string, orgId: string, action: WritingAction, text: string, channel: 'email' | 'whatsapp' = 'email') =>
    api.post<{ result: string }>('/ai/writing-assistant/', { action, text, channel }, { token, orgId }),
};

export const aiApi = {
  scoreLead: (token: string, orgId: string, leadId: string) =>
    api.post("/ai/lead-score/", { lead_id: leadId }, { token, orgId }),

  predictChurn: (token: string, orgId: string, customerId: string) =>
    api.post("/ai/churn-predict/", { customer_id: customerId }, { token, orgId }),

  forecastRevenue: (token: string, orgId: string, period: string) =>
    api.post<{ forecasts: Array<{ period: string; forecasted_revenue: number; confidence: number }>; period_type: string }>(
      "/ai/forecast/",
      { period },
      { token, orgId }
    ),

  generateEmail: (token: string, orgId: string, type: string, context: Record<string, string>) =>
    api.post<{ subject: string; body: string; type: string }>("/ai/generate-email/", { type, context }, { token, orgId }),

  analyzeSentiment: (token: string, orgId: string, text: string) =>
    api.post<{ sentiment: string; score: number; confidence: number }>(
      "/ai/sentiment/",
      { text },
      { token, orgId }
    ),

  followUp: (token: string, orgId: string, data: Record<string, unknown>) =>
    api.post<{ recommended_action: string; best_channel: string; timing_days: number; urgency: string; personalized_message?: string }>(
      "/ai/follow-up/",
      data,
      { token, orgId }
    ),

  callBriefing: (token: string, orgId: string, leadId: string) =>
    api.post<{
      lead_name: string;
      company: string;
      context_summary: string;
      key_points: string[];
      talking_points: string[];
      potential_objections: { objection: string; response: string }[];
      suggested_next_step: string;
    }>("/ai/briefing/", { lead_id: leadId }, { token, orgId }),

  getUsage: (token: string, orgId: string) =>
    api.get<{
      credits_used: number;
      credits_limit: number;
      credits_remaining: number;
      usage_pct: number;
      period_start: string;
    }>("/ai/usage/", { token, orgId }),
};

export const cmsApi = {
  getAll: () =>
    api.get<Record<string, Record<string, unknown>>>('/content/'),

  getSection: (key: string) =>
    api.get<{ key: string; data: Record<string, unknown> }>(`/content/${key}/`),

  updateSection: (token: string, key: string, data: Record<string, unknown>, orgId?: string) =>
    api.request<{ key: string; data: Record<string, unknown> }>(`/content/${key}/`, {
      method: 'PATCH',
      body: JSON.stringify({ data }),
      token,
      orgId,
    }),
};

export interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: 'info' | 'success' | 'warning' | 'task' | 'deal' | 'lead';
  is_read: boolean;
  link: string;
  created_at: string;
}

export const notificationsApi = {
  getAll: (token: string, orgId: string) =>
    api.get<PaginatedResponse<Notification>>("/notifications/", { token, orgId }),

  markRead: (token: string, orgId: string, id: string) =>
    api.patch<Notification>(`/notifications/${id}/read/`, {}, { token, orgId }),

  markAllRead: (token: string, orgId: string) =>
    api.post<{ marked_read: number }>("/notifications/read-all/", {}, { token, orgId }),

  delete: (token: string, orgId: string, id: string) =>
    api.delete(`/notifications/${id}/`, { token, orgId }),
};

export interface Message {
  id: string;
  channel_type: string;
  channel_display: string;
  integration: string;
  direction: 'inbound' | 'outbound';
  from_address: string;
  to_address: string;
  subject: string;
  body_text: string;
  body_html: string;
  is_read: boolean;
  thread_id: string;
  received_at: string;
  created_at: string;
}

export const integrationsApi = {
  getAll: (token: string, orgId: string) =>
    api.get<{ results: Integration[] }>('/integrations/', { token, orgId }),

  create: (token: string, orgId: string, data: { channel_type: string; name: string }) =>
    api.post<Integration>('/integrations/', data, { token, orgId }),

  connect: (token: string, orgId: string, id: string, config: Record<string, string>) =>
    api.post<Integration>(`/integrations/${id}/connect/`, { config }, { token, orgId }),

  disconnect: (token: string, orgId: string, id: string) =>
    api.post<Integration>(`/integrations/${id}/disconnect/`, {}, { token, orgId }),

  test: (token: string, orgId: string, id: string) =>
    api.post<{ status: string; message: string }>(`/integrations/${id}/test/`, {}, { token, orgId }),

  getLogs: (token: string, orgId: string, id: string) =>
    api.get<IntegrationLog[]>(`/integrations/${id}/logs/`, { token, orgId }),

  delete: (token: string, orgId: string, id: string) =>
    api.delete(`/integrations/${id}/`, { token, orgId }),
};

export const inboxApi = {
  getMessages: (token: string, orgId: string, params?: string) =>
    api.get<PaginatedResponse<Message>>(`/messages/${params ? `?${params}` : ''}`, { token, orgId }),

  getMessage: (token: string, orgId: string, id: string) =>
    api.get<Message>(`/messages/${id}/`, { token, orgId }),

  markRead: (token: string, orgId: string, id: string) =>
    api.patch<Message>(`/messages/${id}/read/`, {}, { token, orgId }),

  markAllRead: (token: string, orgId: string) =>
    api.post('/messages/mark-all-read/', {}, { token, orgId }),

  fetchEmails: (token: string, orgId: string, integrationId: string, limit = 50) =>
    api.post<{ status: string; new_messages: number }>(
      `/integrations/${integrationId}/fetch/`,
      { limit },
      { token, orgId }
    ),

  replyMessage: (token: string, orgId: string, messageId: string, body: string) =>
    api.post<Message>(`/messages/${messageId}/reply/`, { body }, { token, orgId }),

  deleteMessage: (token: string, orgId: string, messageId: string) =>
    api.delete(`/messages/${messageId}/`, { token, orgId }),

  bulkDeleteMessages: (token: string, orgId: string, ids: string[]) =>
    api.post<{ deleted: number }>('/messages/bulk-delete/', { ids }, { token, orgId }),
};

export interface WebWidget {
  id: string;
  token: string;
  mode: "form" | "whatsapp" | "both";
  is_active: boolean;
  lead_count: number;
  config: {
    color?: string;
    title?: string;
    subtitle?: string;
    button_text?: string;
    success_message?: string;
    whatsapp_number?: string;
    whatsapp_message?: string;
    contact_reasons?: string[];
  };
}

export const widgetApi = {
  get: (token: string, orgId: string) =>
    api.get<{ widget: WebWidget | null }>("/widget/manage/", { token, orgId }),

  save: (token: string, orgId: string, data: Partial<WebWidget>) =>
    api.post<{ widget: WebWidget }>("/widget/manage/", data, { token, orgId }),
};

// ── Voice Widget ──────────────────────────────────────────────────────────────

export interface VoiceKnowledgeBase {
  company_info:            string;
  products_services:       string;
  pricing:                 string;
  faqs:                    string;
  working_hours:           string;
  contact_info:            string;
  appointment_rules:       string;
  qualification_questions: string[];
  whatsapp_number:         string;
}

export interface VoiceWidget {
  id:                string;
  token:             string;
  vapi_assistant_id: string;
  llm_model:         string;
  is_active:         boolean;
  lead_count:        number;
  call_count:        number;
  config: {
    agent_name?:  string;
    voice?:       string;
    color?:       string;
    greeting?:    string;
    farewell?:    string;
  };
  knowledge_base: VoiceKnowledgeBase | null;
}

export const voiceWidgetApi = {
  get: (token: string, orgId: string) =>
    api.get<{ widget: VoiceWidget | null }>("/voice-widget/manage/", { token, orgId }),

  save: (token: string, orgId: string, data: Partial<VoiceWidget & { knowledge_base: Partial<VoiceKnowledgeBase> }>) =>
    api.post<{ widget: VoiceWidget }>("/voice-widget/manage/", data, { token, orgId }),

  scrapeUrl: (token: string, orgId: string, url: string) =>
    api.post<{ knowledge_base: VoiceKnowledgeBase; char_count: number; source_url: string }>(
      "/voice-widget/scrape-url/",
      { url },
      { token, orgId },
    ),
};

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger_type: string;
  trigger_type_display: string;
  action_type: string;
  action_type_display: string;
  action_config: Record<string, string>;
  is_active: boolean;
  run_count: number;
  last_run_at: string | null;
  created_at: string;
}

export const csvApi = {
  importLeads: (token: string, orgId: string, file: File) => {
    const fd = new FormData(); fd.append("file", file);
    return api.upload<{ imported: number }>("/leads/import/", fd, { token, orgId });
  },
  exportLeads: (token: string, orgId: string) =>
    api.download("/leads/export/", "leads.csv", { token, orgId }),

  importCustomers: (token: string, orgId: string, file: File) => {
    const fd = new FormData(); fd.append("file", file);
    return api.upload<{ imported: number }>("/customers/import/", fd, { token, orgId });
  },
  exportCustomers: (token: string, orgId: string) =>
    api.download("/customers/export/", "customers.csv", { token, orgId }),

  exportOpportunities: (token: string, orgId: string) =>
    api.download("/opportunities/export/", "opportunities.csv", { token, orgId }),
};

export interface Subscription {
  id: string;
  plan: "basico" | "pro" | "equipo" | "enterprise";
  status: "trialing" | "active" | "past_due" | "canceled" | "incomplete";
  is_active: boolean;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiPlan {
  id: number;
  slug: string;
  name: string;
  tagline: string;
  price_monthly: string;
  price_annual: string;
  currency: string;
  price_display: string;
  cta_text: string;
  features: { text: string; included: boolean; highlight: boolean }[];
  has_trial: boolean;
  trial_days: number;
  is_popular: boolean;
  sort_order: number;
}

export const billingApi = {
  getSubscription: (token: string, orgId: string) =>
    api.get<Subscription>("/billing/subscription/", { token, orgId }),

  getPlans: () =>
    fetch(`${typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1") : ""}/billing/plans/`)
      .then((r) => r.json() as Promise<ApiPlan[]>),

  createCheckout: (token: string, orgId: string, plan: string) =>
    api.post<{ checkout_url: string }>("/billing/checkout/", { plan }, { token, orgId }),
};

export const automationApi = {
  getAll: (token: string, orgId: string) =>
    api.get<PaginatedResponse<AutomationRule>>('/automations/', { token, orgId }),

  create: (token: string, orgId: string, data: Partial<AutomationRule>) =>
    api.post<AutomationRule>('/automations/', data, { token, orgId }),

  update: (token: string, orgId: string, id: string, data: Partial<AutomationRule>) =>
    api.patch<AutomationRule>(`/automations/${id}/`, data, { token, orgId }),

  toggle: (token: string, orgId: string, id: string) =>
    api.post<{ is_active: boolean }>(`/automations/${id}/toggle/`, {}, { token, orgId }),

  run: (token: string, orgId: string, id: string) =>
    api.post<{ status: string; message: string }>(`/automations/${id}/run/`, {}, { token, orgId }),

  delete: (token: string, orgId: string, id: string) =>
    api.delete(`/automations/${id}/`, { token, orgId }),
};

// ─── Embed Forms ──────────────────────────────────────────────────────────────

export interface EmbedFieldDef {
  key: string;
  label: string;
  field_type: "text" | "email" | "phone" | "textarea" | "select" | "checkbox";
  placeholder?: string;
  required?: boolean;
  lead_field?: string | null;
  options?: string[];
}

export interface EmbedFormStyle {
  primary_color?: string;
  bg_color?: string;
  border_radius?: string;
}

export interface EmbedForm {
  id: string;
  token: string;
  name: string;
  is_active: boolean;
  submit_count: number;
  fields: EmbedFieldDef[];
  style: EmbedFormStyle;
  success_message: string;
  redirect_url: string;
  embed_url: string;
  embed_code: string;
  created_at: string;
  updated_at: string;
}

export interface FormSubmission {
  id: string;
  data: Record<string, string>;
  ip_address: string | null;
  lead: string | null;
  created_at: string;
}

export const embedFormsApi = {
  list: (token: string, orgId: string) =>
    api.get<PaginatedResponse<EmbedForm>>("/forms/", { token, orgId }),

  create: (token: string, orgId: string, data: Partial<EmbedForm>) =>
    api.post<EmbedForm>("/forms/", data, { token, orgId }),

  update: (token: string, orgId: string, id: string, data: Partial<EmbedForm>) =>
    api.patch<EmbedForm>(`/forms/${id}/`, data, { token, orgId }),

  delete: (token: string, orgId: string, id: string) =>
    api.delete(`/forms/${id}/`, { token, orgId }),

  getSubmissions: (token: string, orgId: string, id: string) =>
    api.get<{ results: FormSubmission[] }>(`/forms/${id}/submissions/`, { token, orgId }),
};

// ─── Email Campaigns ──────────────────────────────────────────────────────────

export type CampaignStatus        = "draft" | "sending" | "sent" | "error";
export type CampaignRecipientType = "all_contacts" | "all_leads" | "all_customers";

export interface EmailCampaign {
  id:                     string;
  name:                   string;
  subject:                string;
  preview_text:           string;
  from_name:              string;
  from_email:             string;
  html_content:           string;
  status:                 CampaignStatus;
  status_display:         string;
  recipient_type:         CampaignRecipientType;
  recipient_type_display: string;
  sent_at:                string | null;
  recipient_count:        number;
  error_message:          string;
  stat_delivered:         number;
  stat_opens:             number;
  stat_clicks:            number;
  stat_unsubscribes:      number;
  stat_bounces:           number;
  open_rate:              number;
  click_rate:             number;
  created_at:             string;
  updated_at:             string;
}

export const campaignsApi = {
  list: (token: string, orgId: string) =>
    api.get<PaginatedResponse<EmailCampaign>>("/campaigns/", { token, orgId }),

  create: (token: string, orgId: string, data: Partial<EmailCampaign>) =>
    api.post<EmailCampaign>("/campaigns/", data, { token, orgId }),

  update: (token: string, orgId: string, id: string, data: Partial<EmailCampaign>) =>
    api.patch<EmailCampaign>(`/campaigns/${id}/`, data, { token, orgId }),

  delete: (token: string, orgId: string, id: string) =>
    api.delete(`/campaigns/${id}/`, { token, orgId }),

  send: (token: string, orgId: string, id: string) =>
    api.post<EmailCampaign>(`/campaigns/${id}/send/`, undefined, { token, orgId }),

  syncStats: (token: string, orgId: string, id: string) =>
    api.post<EmailCampaign>(`/campaigns/${id}/sync_stats/`, undefined, { token, orgId }),
};

