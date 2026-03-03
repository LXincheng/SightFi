import { Controller, Get } from '@nestjs/common';
import type { HealthStatus } from '@sightfi/shared';

@Controller()
export class HealthController {
  @Get('health')
  getHealth(): HealthStatus {
    return {
      status: 'ok',
      service: 'sightfi-api',
      timestamp: new Date().toISOString(),
      uptimeSec: Math.floor(process.uptime()),
    };
  }
}
