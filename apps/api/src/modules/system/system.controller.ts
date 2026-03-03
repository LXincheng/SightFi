import { Controller, Get } from '@nestjs/common';
import type { ProviderFlags } from '@sightfi/shared';
import { EnvService } from '../../core/env/env.service';

@Controller('api/v1/system')
export class SystemController {
  constructor(private readonly envService: EnvService) {}

  @Get('providers')
  getProviderStatus(): ProviderFlags {
    return this.envService.getProviderFlags();
  }
}
