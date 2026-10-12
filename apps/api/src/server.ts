import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import session from '@fastify/session';
import { approvalSchema } from '@shortlab/shared';
import { Workflow } from './workflow.js';
import { scryptSync, timingSafeEqual } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const app = Fastify({ logger: true });
const workflow = new Workflow();
workflow.createApproval('script', 'Script #4 · hook en kern', 2, 'Hook, kern en afsluiter');
workflow.createApproval('script', 'Script #5 · hook en kern', 2, 'Hook, kern en afsluiter');
workflow.createApproval('production', 'Video #3 · controle eerste 3 seconden', 2, 'YouTube, TikTok en Instagram versies');
await app.register(cors, { origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173', credentials: true });
await app.register(cookie);
await app.register(session, { secret: process.env.SESSION_SECRET ?? 'local-only-shortlab-session-secret-32', cookie: { secure: process.env.COOKIE_SECURE === 'true', httpOnly: true, sameSite: 'lax', maxAge: 86400000 } });
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) throw new Error('SESSION_SECRET is required in production.');
const prisma = new PrismaClient();
await prisma.$connect();
let world = await prisma.world.findFirst({ where: { name: 'Shorts' } });
if (!world) world = await prisma.world.create({ data: { name: 'Shorts' } });
const centerSeeds = [
  ['brainstorm','Brainstorm Station','running'], ['strategy','Strategie Lab','ready'], ['script','Script Lab','waiting'],
  ['production','Productie Dock','waiting'], ['publishing','Publicatie Toren','running'], ['analytics','Analyse Centrum','sleeping'],
  ['growth','Groei Station','sleeping'], ['expansion','Uitbreidingsdok','locked']
] as const;
const centerRows = new Map<string,string>();
for (const [key,name,status] of centerSeeds) {
  let row=await prisma.center.findFirst({where:{key,worldId:world.id}});
  if(!row) row=await prisma.center.create({data:{key,name,status,worldId:world.id}});
  centerRows.set(key,row.id);
}
if (await prisma.approval.count() === 0) {
  for (const approval of workflow.approvals) await prisma.approval.create({data:{id:approval.id,centerId:centerRows.get(approval.center)!,kind:'review',status:approval.status,payload:{task:approval.task,text:approval.payload,minutes:approval.minutes},createdAt:new Date(approval.createdAt)}});
}
const storedApprovals=await prisma.approval.findMany({orderBy:{createdAt:'asc'}});
workflow.approvals.splice(0,workflow.approvals.length,...storedApprovals.map(a=>({id:a.id,center:centerSeeds.find(c=>centerRows.get(c[0])===a.centerId)![0],task:String((a.payload as {task?:string}).task??'Akkoord'),minutes:Number((a.payload as {minutes?:number}).minutes??2),status:a.status as 'pending'|'approved'|'changed',createdAt:a.createdAt.getTime(),payload:String((a.payload as {text?:string}).text??'')})));
const storedEvents=await prisma.event.findMany({orderBy:{createdAt:'asc'},take:100});
workflow.events.push(...storedEvents.map(e=>({at:e.createdAt.toISOString(),center:centerSeeds.find(c=>centerRows.get(c[0])===e.centerId)![0],message:e.message})));
async function persistLastEvent(center: string) {
  const event=workflow.events.at(-1);
  const centerId=centerRows.get(center);
  if(event&&centerId) await prisma.event.create({data:{centerId,type:'workflow',message:event.message}});
}
app.addHook('onRequest', async (request, reply) => {
  if (request.url.startsWith('/api/') && request.url !== '/api/login' && !(request.session as typeof request.session & {user?:string}).user) return reply.code(401).send({error:'LOGIN_REQUIRED'});
});
app.get('/health', async () => ({ status: 'ok', mode: 'mock' }));
app.post('/api/login', async (request, reply) => {
  const body = request.body as { password?: string };
  const encodedHash = process.env.ADMIN_PASSWORD_HASH;
  let valid = !encodedHash && process.env.NODE_ENV !== 'production' && body?.password === 'tahar-demo';
  if (encodedHash && body?.password) {
    const [salt, expectedHex] = encodedHash.split(':');
    if (salt && expectedHex) { const actual=scryptSync(body.password,salt,32); const expected=Buffer.from(expectedHex,'hex'); valid=actual.length===expected.length&&timingSafeEqual(actual,expected); }
  }
  if (!valid) return reply.code(401).send({ error: 'Onjuist wachtwoord.' });
  (request.session as typeof request.session & { user?: string }).user = 'Tahar';
  return { user: 'Tahar' };
});
app.post('/api/logout', async (request) => { await request.session.destroy(); return { ok: true }; });
app.get('/api/state', async () => ({ mode: 'mock', user: 'Tahar', phase: 1, cycle: 1, day: 9, days: 14, elixir: 15, published: workflow.publishedCount, goal: 10, centers: [
  {id:'brainstorm',name:'Brainstorm Station',status:'running',detail:'Concept #1 actief',tasks:['Concept #1']}, {id:'strategy',name:'Strategie Lab',status:'ready',detail:'Kalender goedgekeurd',tasks:['Kalender · 2 weken']}, {id:'script',name:'Script Lab',status:'waiting',detail:'Wacht op jouw akkoord',tasks:['Script #4','Script #5']}, {id:'production',name:'Productie Dock',status:'waiting',detail:'Eindcheck video #3',tasks:['Video #3 · 3 versies']}, {id:'publishing',name:'Publicatie Toren',status:'running',detail:'Publicatie draait (mock)',tasks:['YouTube','TikTok','Instagram']}, {id:'analytics',name:'Analyse Centrum',status:'sleeping',detail:'Eerste inzicht zondag',tasks:[]}, {id:'growth',name:'Groei Station',status:'sleeping',detail:'Slaapstand',tasks:[]}, {id:'expansion',name:'Uitbreidingsdok',status:'locked',detail:'Vergrendeld · 3/10',tasks:[]}
].map(center => center.status === 'waiting' && workflow.approvals.filter(a => a.center === center.id && a.status === 'pending').length === 0 ? {...center,status:'ready',detail:'Akkoord verwerkt'} : center), approvals: workflow.approvals, events: workflow.events }));
app.get('/api/events', async (request, reply) => { reply.raw.writeHead(200,{ 'content-type':'text/event-stream','cache-control':'no-cache','connection':'keep-alive','access-control-allow-origin':process.env.WEB_ORIGIN??'http://localhost:5173','access-control-allow-credentials':'true' }); const send=()=>reply.raw.write(`data: ${JSON.stringify({approvals:workflow.approvals,events:workflow.events})}\n\n`); send(); const timer=setInterval(send,3000); request.raw.on('close',()=>clearInterval(timer)); });
app.post('/api/approvals/:id', async (request, reply) => { const parsed=approvalSchema.safeParse({...((request.body??{}) as object),approvalId:(request.params as {id:string}).id}); if(!parsed.success) return reply.code(400).send({error:'Ongeldige akkoordkaart.'}); try { const result=workflow.resolveApproval(parsed.data.approvalId,parsed.data.decision,parsed.data.change); await prisma.approval.update({where:{id:result.id},data:{status:result.status,resolvedAt:new Date()}}); await persistLastEvent(result.center); return result; } catch(error) { return reply.code(400).send({error:(error as Error).message}); } });
app.post('/api/workflow/start', async (request, reply) => { const body=request.body as {center?: string; approvedInput?: boolean}; try { workflow.startCenter(body.center as never, Boolean(body.approvedInput)); await persistLastEvent(body.center??''); return {ok:true}; } catch(error) { return reply.code(400).send({error:(error as Error).message}); } });
app.post('/api/publish', async (request, reply) => { const body=request.body as {platform:string;mode:'mock'|'private'|'public';consent?:boolean}; try { const key=`public-consent:${body.platform}`; const prior=await prisma.setting.findUnique({where:{key}}); if(prior?.value===true) workflow.publicConsent.add(body.platform); workflow.publish(body.platform,body.mode,body.consent); if(body.mode==='public'&&body.consent) await prisma.setting.upsert({where:{key},create:{key,value:true},update:{value:true}}); const video=await prisma.video.create({data:{title:`Demo ${body.platform}`,status:'queued'}}); await prisma.publication.create({data:{videoId:video.id,platform:body.platform,mode:body.mode,status:'mock'}}); await persistLastEvent('publishing'); return {ok:true}; } catch(error) { return reply.code(400).send({error:(error as Error).message}); } });
const port = Number(process.env.PORT ?? 3000);
await app.listen({ port, host: '0.0.0.0' });
