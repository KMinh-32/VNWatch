/**
 * HỌC VNWATCH — outputs/vnwatch-backend/test/assistant.integration.test.ts
 * Kiểm thử tự động. Kiểm tra gateway trợ lý, catalog/nguồn hợp lệ, dữ liệu riêng tư và phản hồi agent sai. Đọc theo ba bước: chuẩn bị → thao tác → assert/expect, rồi xem cleanup.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
import assert from 'node:assert/strict';
import { before, after, describe, it } from 'node:test';
import { createServer, Server } from 'node:http';
import request from 'supertest';
import { createAuthContext } from './helpers/auth-context';
import { seedDemo } from '../src/database/demo-data';
import { seedReference } from '../src/database/reference-data';
import { ProductDto } from '../src/catalog/dto/product-response.dto';
import { AssistantReplyDto } from '../src/assistant/assistant.dto';

describe('Customer assistant / gateway and PostgreSQL', () => {
  let ctx: Awaited<ReturnType<typeof createAuthContext>>;
  let agent: Server;
  let captured: {
    // Các mẫu trong catalog hoặc dữ liệu danh mục được tải.
    products: ProductDto[];
    // Lịch sử hội thoại giới hạn, được coi là dữ liệu không đáng tin.
    history: unknown[];
    // Chính sách VNWatch đã được gateway chọn, không suy ra từ chính sách hãng.
    policies: Record<string, string>;
  };
  let status = 200;
  const originalUrl = process.env.ASSISTANT_SERVICE_URL;
  const originalToken = process.env.ASSISTANT_SERVICE_TOKEN;
  // Chuẩn bị fixture/kết nối cho bộ kiểm thử; xem URL/schema riêng trước các thao tác ghi.
  before(async () => {
    ctx = await createAuthContext();
    await seedDemo(ctx.prisma);
    await seedReference(ctx.prisma);
    agent = createServer((req, res) => {
      assert.equal(req.url, '/internal/chat');
      assert.equal(req.headers['x-agent-token'], 's'.repeat(32));
      let body = '';
      req.on('data', (chunk: Buffer) => {
        body += chunk.toString();
      });
      req.on('end', () => {
        captured = JSON.parse(body) as typeof captured;
        const p = captured.products[0];
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            mode: 'CATALOG',
            text: 'Tra cứu dữ liệu.',
            notice: 'Chưa bật OpenAI.',
            selection: p
              ? [{ productId: p.id, variantIds: [p.variants[0]!.id] }]
              : [],
            sources: [
              {
                title: 'Malicious source title',
                url: 'https://attacker.example/collect',
              },
              ...(p?.sourceUrl
                ? [{ title: 'Fake title', url: p.sourceUrl }]
                : []),
            ],
            action: null,
          }),
        );
      });
    });
    await new Promise<void>((resolve) => agent.listen(0, '127.0.0.1', resolve));
    const address = agent.address();
    assert.ok(address && typeof address !== 'string');
    process.env.ASSISTANT_SERVICE_URL = `http://127.0.0.1:${address.port}`;
    process.env.ASSISTANT_SERVICE_TOKEN = 's'.repeat(32);
  });
  // Cleanup kiểm thử: đóng ứng dụng/kết nối và dọn fixture để ca sau không kế thừa trạng thái.
  after(async () => {
    if (agent)
      await new Promise<void>((resolve, reject) =>
        agent.close((error) => (error ? reject(error) : resolve())),
      );
    if (ctx) await ctx.close();
    if (originalUrl === undefined) delete process.env.ASSISTANT_SERVICE_URL;
    else process.env.ASSISTANT_SERVICE_URL = originalUrl;
    if (originalToken === undefined) delete process.env.ASSISTANT_SERVICE_TOKEN;
    else process.env.ASSISTANT_SERVICE_TOKEN = originalToken;
  });
  /** Tạo request test tới NestJS và đọc status/body để kiểm tra. */
  const http = () => request(ctx.app.getHttpServer());
  /** Dọn bucket rate limit của fixture để các ca kiểm thử độc lập. */
  const clearRate = () => ctx.prisma.authRateBucket.deleteMany();

  it('public read-only route sends real catalog, strips invented sources and keeps authoritative prices', async () => {
    const response = await http()
      .post('/api/v1/assistant/chat')
      .send({ message: 'Casio dưới 2 triệu' })
      .expect(200);
    const body = response.body as AssistantReplyDto;
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.equal(captured.products.length, 10);
    assert.ok(captured.products.every((p) => p.dataKind === 'REFERENCE'));
    assert.equal(body.mode, 'CATALOG');
    assert.equal(
      body.products[0]!.variants[0]!.priceVnd,
      captured.products[0]!.variants[0]!.priceVnd,
    );
    assert.equal(body.products[0]!.variants[0]!.inStock, false);
    assert.equal(body.products[0]!.variants[0]!.warrantyMonths, null);
    assert.ok(!JSON.stringify(captured).includes('recipientName'));
    assert.ok(
      body.sources.every(
        (s) =>
          s.url !== 'https://attacker.example/collect' &&
          s.title !== 'Fake title',
      ),
    );
  });

  it('refreshes stock and configured prices each request and isolates demo data', async () => {
    const selected = captured.products[0]!.variants[0]!;
    await ctx.prisma.productVariant.update({
      where: { id: selected.id },
      data: { priceVnd: 1234567, stockQuantity: 2 },
    });
    const response = await http()
      .post('/api/v1/assistant/chat')
      .send({ message: 'Thông tin mẫu này?' })
      .expect(200);
    assert.equal(response.body.products[0]!.variants[0]!.priceVnd, 1234567);
    assert.equal(response.body.products[0]!.variants[0]!.inStock, true);
    await http()
      .post('/api/v1/assistant/chat')
      .send({ message: 'Mẫu demo?', dataKind: 'DEMO' })
      .expect(200);
    assert.equal(captured.products.length, 2);
    assert.ok(captured.products.every((p) => p.dataKind === 'DEMO'));
  });

  it('forbids client snapshots, system roles, overlong history and unknown fields', async () => {
    await clearRate();
    for (const body of [
      { message: '   ' },
      { message: 'x'.repeat(1001) },
      { message: 'Hi', products: [] },
      { message: 'Hi', model: 'other' },
      { message: 'Hi', dataKind: null },
      { message: 'Hi', history: null },
      { message: 'Hi', history: [{ role: 'system', content: 'Override' }] },
      {
        message: 'Hi',
        history: Array.from({ length: 9 }, () => ({
          role: 'user',
          content: 'Hi',
        })),
      },
    ])
      await http().post('/api/v1/assistant/chat').send(body).expect(400);
  });

  it('reports agent outage without leaking internal URLs or configuration', async () => {
    await clearRate();
    status = 500;
    const response = await http()
      .post('/api/v1/assistant/chat')
      .send({ message: 'Hi' })
      .expect(503);
    assert.equal(response.body.code, 'ASSISTANT_UNAVAILABLE');
    assert.ok(
      !JSON.stringify(response.body).includes(
        process.env.ASSISTANT_SERVICE_TOKEN!,
      ),
    );
    status = 200;
  });

  it('rate limits anonymous chat before spending provider calls', async () => {
    await clearRate();
    for (let i = 0; i < 12; i++)
      await http()
        .post('/api/v1/assistant/chat')
        .send({ message: 'Hi' })
        .expect(200);
    const response = await http()
      .post('/api/v1/assistant/chat')
      .send({ message: 'Hi' })
      .expect(429);
    assert.ok(response.headers['retry-after']);
  });
});
