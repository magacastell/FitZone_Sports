import { readdir,readFile,writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
const entries=[];
async function walk(dir){for(const f of await readdir(dir,{withFileTypes:true})){const path=`${dir}/${f.name}`;if(f.isDirectory())await walk(path);else if(!['sw.js','manifest.webmanifest'].includes(f.name))entries.push({url:path.replace(/^dist/,''),revision:createHash('sha256').update(await readFile(path)).digest('hex')});}}
await walk('dist');
await build({entryPoints:['src/sw.js'],bundle:true,minify:true,outfile:'dist/sw.js',define:{'self.__WB_MANIFEST':JSON.stringify(entries),'process.env.NODE_ENV':'"production"'}});
await writeFile('dist/manifest.webmanifest',JSON.stringify({name:'FitZone Sports',short_name:'FitZone',start_url:'/',scope:'/',display:'standalone',theme_color:'#153d34',background_color:'#ffffff'}));
