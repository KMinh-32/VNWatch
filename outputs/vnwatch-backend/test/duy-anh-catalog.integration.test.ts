import assert from 'node:assert/strict';
import { before, after, describe, it } from 'node:test';
import request from 'supertest';
import { createAuthContext } from './helpers/auth-context';
import { seedDuyAnh } from '../src/database/duy-anh-data';
import products from '../src/database/duy-anh-products.json';

describe('Catalog Duy Anh: import and filter regressions', () => {
  let ctx: Awaited<ReturnType<typeof createAuthContext>>;
  before(async () => { ctx = await createAuthContext(); await seedDuyAnh(ctx.prisma); });
  after(async () => { if (ctx) await ctx.close(); });
  const http = () => request(ctx.app.getHttpServer());

  it('imports verified facts and keeps existing price/stock on repeated seed', async () => {
    assert.equal(await ctx.prisma.product.count(), products.length);
    const item = products[0]!;
    const variant = await ctx.prisma.productVariant.findUniqueOrThrow({where:{sku:item.sku},include:{product:true}});
    assert.equal(variant.priceVnd,item.priceVnd);
    assert.equal(variant.stockQuantity,100);
    assert.equal(variant.warrantyMonths,null);
    assert.equal(variant.product.sourceUrl,item.sourceUrl);
    assert.ok(variant.product.imageUrls[0]?.startsWith('/images/catalog/'));
    assert.equal(variant.caseDiameterMm,null);
    assert.equal(variant.caseDimensionsMm,'24mm x 35mm');
    await ctx.prisma.productVariant.update({where:{id:variant.id},data:{stockQuantity:98,priceVnd:1234567}});
    await seedDuyAnh(ctx.prisma);
    const preserved = await ctx.prisma.productVariant.findUniqueOrThrow({where:{id:variant.id}});
    assert.equal(preserved.stockQuantity,98);
    assert.equal(preserved.priceVnd,1234567);
    assert.equal(await ctx.prisma.product.count(),products.length);
  });

  it('exposes new brands and applies materials and decimal size filters before paging', async () => {
    const facets=await http().get('/api/v1/products/facets?dataKind=REFERENCE').expect(200);
    assert.ok(facets.body.brands.includes('Hamilton'));
    assert.ok(facets.body.brands.includes('Orient Star'));
    const query = new URLSearchParams({dataKind:'REFERENCE',brand:'Seiko',minDiameterMm:'41',maxDiameterMm:'42.99',limit:'2'});
    const result=await http().get(`/api/v1/products?${query}`).expect(200);
    assert.equal(result.body.meta.total,3);
    assert.equal(result.body.data.length,2);
    const second=await http().get(`/api/v1/products?${query}&page=2`).expect(200);
    assert.equal(second.body.data.length,1);
    assert.ok(result.body.data.every((p:{brand:string})=>p.brand==='Seiko'));
    const material=products.find(p=>p.brand==='Hamilton')!;
    const filtered=await http().get('/api/v1/products?'+new URLSearchParams({brand:'Hamilton',strapMaterial:material.strapMaterial,crystalMaterial:material.crystalMaterial})).expect(200);
    assert.equal(filtered.body.meta.total,2);
    await http().get('/api/v1/products?minDiameterMm=45&maxDiameterMm=38').expect(400);
    await http().get('/api/v1/products?minDiameterMm=NaN').expect(400);
    await http().get('/api/v1/products?strapMaterial='+encodeURIComponent('Dây da%')).expect(200).then(r=>assert.equal(r.body.meta.total,0));
  });
});
