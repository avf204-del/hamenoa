/** Read-only fresh source backup; actual CLI restore into ephemeral migrated PGlite.
 * Runs inside the bound Railway backup service. No source records leave it. */
import {Client} from 'pg';
import {PGlite} from '@electric-sql/pglite';
import {PGLiteSocketServer} from '@electric-sql/pglite-socket';
import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {spawn} from 'node:child_process';
import {join} from 'node:path';
import {writeDatabaseSnapshot,validateSnapshot} from './db-snapshot';
import {MODELS} from './db-schema';
import {verifyBackupChecksum} from './backup-files';
function canonical(value:unknown):string{return JSON.stringify(value,(_k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);}
async function main(){
 const source=new Client({connectionString:process.env.DATABASE_URL});await source.connect();let server:PGLiteSocketServer|undefined,db:PGlite|undefined;
 try{
  const dir=process.env.RELEASE_BACKUP_DIR??'/data/backups';const snapshot=await writeDatabaseSnapshot(source,dir);await source.end();
  if(!await verifyBackupChecksum(snapshot.file))throw Error('backup-checksum-missing');const raw=validateSnapshot(JSON.parse(gunzipSync(readFileSync(snapshot.file)).toString('utf8')),true);
  if((raw.missingTables??[]).some(t=>!['CapacityProfile','MovementReceipt'].includes(t)))throw Error('unexpected-missing-source-table');
  db=await PGlite.create();for(const folder of readdirSync('prisma/migrations').filter(f=>/^\d/.test(f)).sort())await db.exec(readFileSync(`prisma/migrations/${folder}/migration.sql`,'utf8'));
  const port=Number(process.env.RELEASE_RESTORE_PORT??5568);server=new PGLiteSocketServer({db,port,host:'127.0.0.1',maxConnections:10});await server.start();
  const code=await new Promise<number>(resolve=>{const child=spawn(process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/db-backup.ts','--restore',snapshot.file,'--allow-partial'],{env:{...process.env,DATABASE_URL:`postgres://postgres@127.0.0.1:${port}/postgres`,DATABASE_POOL_MAX:'1'},stdio:['ignore','ignore','ignore']});child.on('error',()=>resolve(1));child.on('exit',c=>resolve(c??1));});
  if(code!==0)throw Error('actual-restore-cli-failed');
  let checked=0;for(const spec of MODELS){const rows=(await db.query<Record<string,unknown>>(`SELECT * FROM "${spec.table}" ORDER BY "id"`)).rows;const original=raw.tables[spec.table]??[];if(rows.length!==original.length)throw Error(`restored-count-mismatch:${spec.table}`);
   const byId=new Map(rows.map(r=>[r.id,r]));for(const old of original){const restored=byId.get(old.id);if(!restored)throw Error('restored-id-missing');const comparable=Object.fromEntries(Object.keys(old).map(k=>[k,restored[k] instanceof Date?(restored[k] as Date).toISOString():restored[k]]));if(canonical(comparable)!==canonical(old))throw Error(`restored-content-mismatch:${spec.table}`);checked++;}
  }
  const result={protocol:'T028-fresh-backup-restore-v1',at:new Date().toISOString(),commit:process.env.RAILWAY_GIT_COMMIT_SHA??process.env.GITHUB_SHA??'local',sha256:snapshot.sha256,sourceRows:snapshot.rows,checkedRows:checked,tables:MODELS.length,missingBeforeAdditiveMigration:snapshot.missingTables,actualCliRestore:true,foreignKeys:'enforced by migrated target',passed:true};
  writeFileSync(join(dir,`t028-restore-${Date.now()}.json`),JSON.stringify(result,null,2),{mode:0o600});console.log(JSON.stringify(result));
 }finally{await source.end().catch(()=>{});await server?.stop();await db?.close();}
}
main().catch(e=>{console.error(JSON.stringify({passed:false,error:e instanceof Error?e.message:'backup-verification-failed'}));process.exitCode=1;});
