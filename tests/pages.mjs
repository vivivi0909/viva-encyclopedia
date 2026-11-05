// Serve the real production build below a GitHub Pages-style repository path.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {entries} from '../src/data.js';
const prefix='/viva-encyclopedia/';
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
 if(!req.url.startsWith(prefix)){res.writeHead(404).end();return;}
 const relative=decodeURIComponent(req.url.slice(prefix.length).split('?')[0])||'index.html';
 const file=resolve('dist',relative);
 if(!file.startsWith(resolve('dist')+'/')){res.writeHead(403).end();return;}
 try{res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}
});
let browser;
try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const page=await browser.newPage();const failures=[];
 page.on('response',r=>{if(r.status()>=400)failures.push(r.url());});
 await page.goto(`http://127.0.0.1:${server.address().port}${prefix}`);
 await page.locator('.entry-card').last().waitFor();
 assert.equal(await page.locator('.entry-card').count(),24);
 assert.equal(await page.locator('#result-count strong').textContent(),String(entries.length));
 await page.evaluate(async()=>{await new Promise((ok,no)=>{const i=new Image();i.onload=ok;i.onerror=no;i.src='./photos/grass-cc0.png';});});
 assert.deepEqual(failures,[]);
 console.log('PASS: GitHub Pages subpath loads JS, CSS, all catalog records and the real hero photo.');
}finally{await browser?.close();server.close();}
