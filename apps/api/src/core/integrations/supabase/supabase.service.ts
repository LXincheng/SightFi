import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ENV_KEYS } from '../../config/env.keys';

@Injectable()
export class SupabaseService {
  private readonly url = process.env[ENV_KEYS.supabaseUrl] ?? '';
  private readonly anonKey = process.env[ENV_KEYS.supabaseAnonKey] ?? '';
  private readonly serviceRoleKey =
    process.env[ENV_KEYS.supabaseServiceRoleKey] ?? '';

  private client: SupabaseClient | null = null;

  getClient(): SupabaseClient | null {
    if (!this.url || !this.anonKey) {
      return null;
    }
    if (this.client) {
      return this.client;
    }
    this.client = createClient(this.url, this.anonKey);
    return this.client;
  }

  getAdminClient(): SupabaseClient | null {
    if (!this.url || !this.serviceRoleKey) {
      return null;
    }
    return createClient(this.url, this.serviceRoleKey);
  }
}
