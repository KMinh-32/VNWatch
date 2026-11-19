import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from './auth/auth.decorators';

/** Danh mục REST API cho website, app quản trị và các client tích hợp. */
@ApiTags('API discovery')
@Controller()
export class ApiIndexController {
  @Public()
  @Get()
  @ApiOperation({
    summary: 'Thông tin phiên bản và đường dẫn tài nguyên Web Services.',
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      required: ['name', 'version', 'links'],
      properties: {
        name: { type: 'string', example: 'VNWatch Web Services' },
        version: { type: 'string', example: 'v1' },
        links: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
  })
  index() {
    return {
      name: 'VNWatch Web Services',
      version: 'v1',
      links: {
        documentation: '/docs',
        openapi: '/docs-json',
        health: '/api/v1/health/ready',
        catalog: '/api/v1/products',
        filters: '/api/v1/products/facets',
        login: '/api/v1/auth/login',
        cart: '/api/v1/shop/cart',
        orders: '/api/v1/orders',
        assistant: '/api/v1/assistant/chat',
        conversations: '/api/v1/assistant/conversations',
      },
    };
  }
}
