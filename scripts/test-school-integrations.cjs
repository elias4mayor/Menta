/* eslint-disable @typescript-eslint/no-require-imports -- Isolated CommonJS test loader for server-only TypeScript modules. */
// Run with: node scripts/test-school-integrations.cjs (no live school credentials).
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
const original = Module._load;
const mocks = new Map();
Module._load = function(id, ...args) { if (mocks.has(id)) return mocks.get(id); if (id === 'server-only') return {}; if (id.startsWith('@/')) id = path.resolve(__dirname, '../src', id.slice(2)) + '.ts'; return original.call(this, id, ...args); };
require.extensions['.ts'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file);
const { schoolInstances } = require('../src/lib/school/config.ts');
const { authorizeSchool, schoolTokens } = require('../src/lib/school/oauth.ts');
const { schoolApiUrl } = require('../src/lib/school/http.ts');
const { readSchool } = require('../src/lib/school/adapters.ts');
const canvas = { id:'test',name:'Test school',provider:'canvas',baseUrl:'https://school.example.edu',clientId:'id',clientSecret:'secret' };
let count = 0;
async function check(name, fn) { await fn(); count++; console.log('PASS',name); }
(async () => {
await check('reject untrusted origins and non-API pagination', () => {
 for (const url of ['https://evil.example/api/v1/courses', '//evil.example/api/v1/courses', '/login', '/api/v1/../../login']) assert.throws(() => schoolApiUrl(canvas.baseUrl,url,'/api/v1/'));
 assert.equal(schoolApiUrl(canvas.baseUrl,'/api/v1/courses?page=2','/api/v1/').origin,canvas.baseUrl);
});
await check('configuration rejects local endpoints, credentials, and duplicate IDs', () => {
 for (const baseUrl of ['http://school.example.edu','https://localhost','https://127.0.0.1','https://[::1]','https://school.internal','https://user:pass@school.example.edu']) {
  process.env.SCHOOL_OAUTH_INSTANCES = JSON.stringify([{...canvas,baseUrl}]); assert.throws(schoolInstances);
 }
 process.env.SCHOOL_OAUTH_INSTANCES=JSON.stringify([canvas,canvas]); assert.throws(schoolInstances);
});
await check('Blackboard requests read/offline and PKCE; Canvas requests read scopes', () => {
 const b=authorizeSchool({...canvas,provider:'blackboard'},'nonce','verifier');
 assert.equal(b.searchParams.get('scope'),'read offline'); assert.equal(b.searchParams.get('code_challenge_method'),'S256'); assert.equal(b.searchParams.get('state'),'nonce');
 const c=authorizeSchool(canvas,'nonce','verifier'); assert.match(c.searchParams.get('scope'),/url:GET/); assert.doesNotMatch(c.href,/secret/);
});
await check('OAuth uses form tokens, refuses redirects, and does not put secrets in URL', async () => {
 global.fetch=async (url,init)=>{assert.equal(new URL(url).search,''); assert.equal(init.redirect,'error'); assert.equal(init.body.get('grant_type'),'authorization_code'); return Response.json({access_token:'token',expires_in:3600,refresh_token:'refresh'});};
 assert.equal((await schoolTokens(canvas,{code:'code'})).access_token,'token');
});
await check('Canvas imports only student enrollment and preserves ungraded versus zero', async () => {
 global.fetch=async (url,init)=>{
  assert.equal(init.headers.Authorization,'Bearer token');
  if (url.pathname==='/api/v1/courses') { assert.equal(url.searchParams.get('enrollment_type'),'student'); return Response.json([{id:1,name:'Math',enrollments:[{type:'student'}]},{id:2,name:'Teacher course',enrollments:[{type:'teacher'}]}]); }
  assert.equal(url.pathname,'/api/v1/courses/1/assignments');
  return Response.json([{id:11,name:'Zero',points_possible:10,submission:{score:0}},{id:12,name:'Ungraded',points_possible:10,submission:null}]);
 };
 const s=await readSchool(canvas,'token'); assert.equal(s.courses.length,1); assert.equal(s.courses[0].items[0].score,0); assert.equal(s.courses[0].items[1].score,null);
});
await check('cross-origin next link never receives the token', async () => {
 let calls=0; global.fetch=async ()=>{calls++;return Response.json([], {headers:{link:'<https://evil.example/api/v1/courses>; rel="next"'}});};
 await assert.rejects(readSchool(canvas,'token'),/unsafe_school_url/); assert.equal(calls,1);
});
await check('pagination fails closed rather than silently truncating', async () => {
 let calls=0; global.fetch=async ()=>{calls++;return Response.json([], {headers:{link:'</api/v1/courses?page=2>; rel="next"'}});};
 await assert.rejects(readSchool(canvas,'token'),/school_pagination_limit/); assert.equal(calls,20);
});
await check('Blackboard reads only self and student memberships; never all-student grades', async () => {
 global.fetch=async (url)=>{
  const p=url.pathname;
  if(p.endsWith('/users/me'))return Response.json({id:'student-self'});
  if(p.endsWith('/users/me/courses'))return Response.json({results:[{courseId:'c',courseRoleId:'Student',course:{name:'Science'}},{courseId:'t',courseRoleId:'Instructor'}]});
  if(p.endsWith('/courses/c/gradebook/columns'))return Response.json({results:[{id:'visible',name:'Quiz',score:{possible:100}},{id:'hidden',name:'Hidden',availability:{available:'No'}}]});
  assert.equal(p,'/learn/api/public/v1/courses/c/gradebook/columns/visible/users/student-self');return Response.json({score:85});
 };
 const s=await readSchool({...canvas,provider:'blackboard'},'token');assert.equal(s.courses.length,1);assert.equal(s.courses[0].items.length,1);assert.equal(s.courses[0].items[0].score,85);
});
await check('permission denial fails sync instead of converting it to an ungraded score', async () => {
 global.fetch=async()=>Response.json({error:'denied'},{status:403}); await assert.rejects(readSchool(canvas,'token'),{status:403});
});

let session = null; let dbCalls = []; let cookieValue;
mocks.set('@/lib/session',{getSessionUser:async()=>session});
mocks.set('@/lib/prisma',{prisma:{schoolConnection:{deleteMany:async(args)=>{dbCalls.push(args);return {count:1};},findFirst:async(args)=>{dbCalls.push(args);return null;}}}});
mocks.set('@/lib/rate-limit',{rateLimit:()=>({allowed:true})});
mocks.set('next/headers',{cookies:async()=>({get:()=>cookieValue?{value:cookieValue}:undefined,set:()=>{}})});
mocks.set('next/server',{NextResponse:{json:(data,init)=>Response.json(data,init),redirect:(url)=>new Response(null,{status:307,headers:{location:String(url)}})}});
process.env.APP_URL='https://menta.example';
const route=require('../src/app/api/integrations/school/[schoolId]/[action]/route.ts');
const context=(action)=>({params:Promise.resolve({schoolId:'test',action})});
const request=(origin='https://menta.example')=>new Request('https://menta.example/api/integrations/school/test/disconnect',{method:'POST',headers:{origin}});
await check('school routes reject signed-out users before database access',async()=>{
 const r=await route.POST(request(),context('disconnect'));assert.equal(r.status,401);assert.equal(dbCalls.length,0);
});
await check('school mutations reject cross-site origins',async()=>{
 session={id:'athlete-a'};const r=await route.POST(request('https://evil.example'),context('disconnect'));assert.equal(r.status,403);assert.equal(dbCalls.length,0);
});
await check('disconnect is scoped to the signed-in student, not request body IDs',async()=>{
 const r=await route.POST(request(),context('disconnect'));assert.equal(r.status,200);assert.deepEqual(dbCalls.pop(),{where:{userId:'athlete-a',schoolId:'test'}});
});
await check('sync cannot read another student connection',async()=>{
 const r=await route.POST(request(),context('sync'));assert.equal(r.status,404);assert.deepEqual(dbCalls.pop(),{where:{userId:'athlete-a',schoolId:'test'}});
});
await check('OAuth callback rejects a missing browser state without exchanging a code',async()=>{
 process.env.SCHOOL_OAUTH_INSTANCES=JSON.stringify([canvas]);
 global.fetch=async()=>{throw new Error('must not call provider');};
 const r=await route.GET(new Request('https://menta.example/api/integrations/school/test/callback?code=bad&state=bad'),context('callback'));assert.match(r.headers.get('location'),/invalid_state/);
});
console.log(`${count}/${count} checks passed`);
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{Module._load=original;});
