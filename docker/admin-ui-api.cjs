/**
 * HỌC VNWATCH — docker/admin-ui-api.cjs
 * Dựng API fixture riêng cho kiểm thử quản trị và dọn schema khi kết thúc; không dùng dữ liệu cửa hàng để test ghi.
 * Đọc chú thích theo luồng gọi; import cung cấp dependency, export cho file khác sử dụng.
 */
// Isolated UI fixture API; profile test only, never a production account.
const net=require('node:net');
const {spawnSync,fork}=require('node:child_process');
process.env.NODE_ENV='test';
const proxy=net.createServer(client=>{
  const upstream=net.connect({host:'db',port:5432});
  client.pipe(upstream);upstream.pipe(client);
  client.on('error',()=>upstream.destroy());upstream.on('error',()=>client.destroy());
});
/** Điểm chạy script: Dựng API fixture riêng cho kiểm thử quản trị và dọn schema khi kết thúc; không dùng dữ liệu cửa hàng để test ghi. Đọc finally để thấy cách giải phóng kết nối/tài nguyên. */
async function main(){
  const proxyChild=fork(__filename,['--proxy'],{stdio:['ignore','inherit','inherit','ipc']});
  await new Promise((resolve,reject)=>{proxyChild.once('message',resolve);proxyChild.once('error',reject);});
  const url=new URL(process.env.DATABASE_URL);url.hostname='127.0.0.1';url.pathname='/vnwatch_test';url.search='';
  process.env.TEST_DATABASE_URL=url.toString();
  const compile=spawnSync(process.execPath,['node_modules/typescript/bin/tsc','-p','tsconfig.test.json'],{stdio:'inherit'});
  if(compile.status!==0)throw Error('Compile failed');
  const {createAuthContext}=require('./.test-build/test/helpers/auth-context.js');
  const {seedDemo}=require('./.test-build/src/database/demo-data.js');
  const {PasswordService}=require('./.test-build/src/auth/password.service.js');
  const c=await createAuthContext();await seedDemo(c.prisma,100);
  const hash=await new PasswordService().hash('UI isolated fixture password 2026!');
  for(const role of ['ADMIN','STAFF','CUSTOMER']) await c.prisma.user.create({data:{email:role.toLowerCase()+'.ui@example.test',displayName:role+' UI Fixture',role,passwordHash:hash}});
  await c.app.listen(3005,'0.0.0.0');
  console.log('Isolated admin UI API ready; fixtures exist only in a temporary test schema.');
  const stop=async()=>{await c.close();proxyChild.kill('SIGTERM');process.exit(0);};
  process.on('SIGTERM',()=>void stop());process.on('SIGINT',()=>void stop());
}
if(process.argv.includes('--proxy')){proxy.listen(5432,'127.0.0.1',()=>process.send('ready'));process.on('disconnect',()=>process.exit(0));}
else void main().catch(error=>{console.error('Isolated UI API failed:',error.name,error.code, String(error.message).includes('postgresql:')?'Database configuration error':error.message);process.exit(1);});
