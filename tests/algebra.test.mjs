import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import katex from 'katex';
import {cube,mm,key,det,permutation,points,group,closure,subgroups,cosets,order} from '../lib/algebra/engine.ts';
test('all cube actions preserve composition and have the correct kernels',()=>{
 assert.equal(cube.length,48);assert.equal(cube.filter(g=>det(g.matrix)===1).length,24);
 for(const set of Object.keys(points)){
 const perms=cube.map(g=>permutation(g.matrix,set));assert.ok(perms.every(p=>new Set(p).size===points[set].length));
 assert.equal(perms.filter(p=>p.every((x,i)=>x===i)).length,set==='diagonals'?2:1);
 const lookup=new Map(cube.map((g,i)=>[key(g.matrix),i]));
 for(let a=0;a<48;a++)for(let b=0;b<48;b++)assert.deepEqual(perms[lookup.get(key(mm(cube[a].matrix,cube[b].matrix)))],perms[b].map(i=>perms[a][i]));
 }
});
test('finite group engines obey group laws and stated generators generate',()=>{
 for(const [type,n] of [['C',12],['D',3],['D',4],['Q',8],['V',4],['S',3],['S',4],['U',8],['U',12]]){
 const g=group(type,n),N=g.labels.length;
 for(let a=0;a<N;a++){assert.equal(g.mul(0,a),a);assert.equal(g.mul(a,0),a);assert.equal(N%order(g,a),0);for(let b=0;b<N;b++)for(let c=0;c<N;c++)assert.equal(g.mul(g.mul(a,b),c),g.mul(a,g.mul(b,c)));}
 assert.equal(closure(g,g.generators).length,N,`${type}${n} generators`);
 for(const h of subgroups(g)){assert.equal(N%h.length,0);const c=cosets(g,h);assert.equal(new Set(c.flat()).size,N);assert.ok(c.every(x=>x.length===h.length));}
 }
});
test('every lesson has a source and every static formula parses in KaTeX',()=>{
 const data=JSON.parse(fs.readFileSync(new URL('../lib/algebra/lessons.json',import.meta.url)));assert.equal(new Set(data.map(l=>l.id)).size,data.length);
 for(const l of data){assert.match(l.source.url,/^https:\/\//);for(const f of ['definition','theorem'])assert.doesNotThrow(()=>katex.renderToString(l[f],{throwOnError:true,strict:'ignore'}),`${l.id}:${f}`);}
});
