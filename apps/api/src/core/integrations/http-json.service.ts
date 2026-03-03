import { Injectable } from '@nestjs/common';
import { APP_CONSTANTS } from '../config/app.constants';

@Injectable()
export class HttpJsonService {
  async getJson<T>(url: string, headers?: Record<string, string>): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      APP_CONSTANTS.httpTimeoutMs,
    );

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return (await response.json()) as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
