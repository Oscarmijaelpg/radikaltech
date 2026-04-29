import { supabase } from '../supabase/client';

export interface WebhookLog {
  id?: string;
  user_id: string;
  webhook_url: string;
  event_type: string;
  status_code?: number;
  payload?: any;
  response?: string;
  error_message?: string;
  created_at?: string;
}

export class SupabaseWebhookLogRepository {
  async log(data: WebhookLog): Promise<void> {
    try {
      const { error } = await supabase
        .from('webhook_logs')
        .insert(data);
      
      if (error) {
        console.error('[SupabaseWebhookLogRepository] Failed to log webhook:', error);
      }
    } catch (err) {
      console.error('[SupabaseWebhookLogRepository] Error in log method:', err);
    }
  }
}
