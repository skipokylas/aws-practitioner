import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getRoot() {
    return {
      service: 'cart-service',
      status: 'ok',
    };
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
    };
  }
}
