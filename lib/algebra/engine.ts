export type Mat = number[][];
export const I:Mat=[[1,0,0],[0,1,0],[0,0,1]];
export const A:Mat=[[1,0,0],[0,0,-1],[0,1,0]];
export const B:Mat=[[0,-1,0],[1,0,0],[0,0,1]];
export const J:Mat=[[-1,0,0],[0,-1,0],[0,0,-1]];
export const mm=(a:Mat,b:Mat):Mat=>a.map(row=>b[0].map((_,j)=>row.reduce((s,v,k)=>s+v*b[k][j],0)));
export const mv=(a:Mat,v:number[])=>a.map(r=>r.reduce((s,x,i)=>s+x*v[i],0));
export const det=(a:Mat)=>a[0][0]*(a[1][1]*a[2][2]-a[1][2]*a[2][1])-a[0][1]*(a[1][0]*a[2][2]-a[1][2]*a[2][0])+a[0][2]*(a[1][0]*a[2][1]-a[1][1]*a[2][0]);
export const key=(a:Mat)=>a.flat().join(',');
export const transpose=(a:Mat)=>a[0].map((_,i)=>a.map(r=>r[i]));
export const matrixTex=(a:Mat)=>`\\begin{pmatrix}${a.map(r=>r.map(x=>Math.abs(x)<1e-9?'0':Number.isInteger(x)?x:x.toFixed(2)).join('&')).join('\\\\')}\\end{pmatrix}`;
export const cubeGenerators=[{name:'A',matrix:A},{name:'B',matrix:B},{name:'J',matrix:J}];
function makeCube(){const result=[{matrix:I,word:[] as string[]}],seen=new Set([key(I)]);for(let i=0;i<result.length;i++)for(const g of cubeGenerators){const matrix=mm(g.matrix,result[i].matrix);if(!seen.has(key(matrix))){seen.add(key(matrix));result.push({matrix,word:[g.name,...result[i].word]});}}return result;}
export const cube=makeCube();
export type ActionSet='vertices'|'edges'|'faces'|'diagonals'|'mixed';
export const vertices=[-1,1].flatMap(x=>[-1,1].flatMap(y=>[-1,1].map(z=>[x,y,z])));
export const edges=vertices.flatMap((v,i)=>vertices.map((w,j)=>({i,j,v,w})).filter(e=>e.j>i&&e.v.reduce((s,x,k)=>s+(x!==e.w[k]?1:0),0)===1));
export const points:Record<ActionSet,number[][]>={vertices,edges:edges.map(e=>e.v.map((x,i)=>(x+e.w[i])/2)),faces:[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]],diagonals:[[1,1,1],[1,1,-1],[1,-1,1],[-1,1,1]],mixed:[...vertices,[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]};
export function permutation(m:Mat,set:ActionSet){return points[set].map(v=>{const w=mv(m,v);return points[set].findIndex(p=>p.every((x,i)=>x===w[i])||(set==='diagonals'&&p.every((x,i)=>x===-w[i])));});}
export function cycles(p:number[]){let seen=new Set<number>(),cs:number[][]=[];for(let i=0;i<p.length;i++)if(!seen.has(i)){let c:number[]=[],j=i;while(!seen.has(j)){seen.add(j);c.push(j);j=p[j];}cs.push(c);}return cs;}
export const cycleTex=(p:number[])=>cycles(p).filter(c=>c.length>1).map(c=>`(${c.map(x=>x+1).join('\\,')})`).join('')||'()';
export const mod=(a:number,n:number)=>((a%n)+n)%n;
export const gcd=(a:number,b:number):number=>b?gcd(b,a%b):Math.abs(a);
export const divisors=(n:number)=>Array.from({length:n},(_,i)=>i+1).filter(x=>n%x===0);
export type Group={name:string;labels:string[];mul:(a:number,b:number)=>number;generators:number[]};
export function group(type:string,n=6):Group{
 if(type==='S'){const k=Math.min(4,Math.max(3,n));const perms:number[][]=[];const rec=(a:number[],left:number[])=>{if(!left.length)perms.push(a);else left.forEach(x=>rec([...a,x],left.filter(y=>x!==y)));};rec([],Array.from({length:k},(_,i)=>i));return{name:`S_${k}`,labels:perms.map(cycleTex),generators:k===3?[1,2]:[6,9],mul:(a,b)=>perms.findIndex(p=>p.every((x,i)=>x===perms[a][perms[b][i]]))};}
 if(type==='U'){const values=Array.from({length:n},(_,i)=>i).filter(i=>gcd(i,n)===1);const g:Group={name:`(\\mathbb Z/${n}\\mathbb Z)^\\times`,labels:values.map(String),generators:[],mul:(a,b)=>values.indexOf(mod(values[a]*values[b],n))};for(let i=1;i<values.length;i++)if(!closure(g,g.generators).includes(i))g.generators.push(i);return g;}
 if(type==='D'){const labels=Array.from({length:2*n},(_,i)=>{const k=i%n;return (k===0?'':k===1?'r':`r^${k}`)+(i>=n?'s':'')||'e';});return {name:`D_${n}`,labels,generators:[1,n],mul:(a,b)=>mod(a%n+(a>=n?-1:1)*(b%n),n)+n*((Number(a>=n)+Number(b>=n))%2)};}
 if(type==='V'){return{name:'C_2\\times C_2',labels:['00','10','01','11'],generators:[1,2],mul:(a,b)=>a^b};}
 if(type==='Q'){return{name:'Q_8',labels:['1','i','j','k','-1','-i','-j','-k'],generators:[1,2],mul:(a,b)=>{const u=a%4,v=b%4;let sign=(a>=4?1:0)^(b>=4?1:0),r=0;if(u===0)r=v;else if(v===0)r=u;else if(u===v){r=0;sign^=1;}else{r=6-u-v;if(!((u===1&&v===2)||(u===2&&v===3)||(u===3&&v===1)))sign^=1;}return r+4*sign;}};}
 return {name:`C_${n}`,labels:Array.from({length:n},(_,i)=>String(i)),generators:[1],mul:(a,b)=>mod(a+b,n)};
}
export function closure(g:Group,gens:number[]){let out=new Set([0,...gens]);for(let changed=true;changed;){changed=false;for(const a of [...out])for(const b of [...out]){let c=g.mul(a,b);if(!out.has(c)){out.add(c);changed=true;}}}return [...out].sort((a,b)=>a-b);}
export function order(g:Group,a:number){let x=a,k=1;while(x!==0&&k<=g.labels.length){x=g.mul(x,a);k++;}return k;}
export function inverse(g:Group,a:number){return g.labels.findIndex((_,b)=>g.mul(a,b)===0);}
export function cosets(g:Group,H:number[],right=false){const unseen=new Set(g.labels.map((_,i)=>i)),out:number[][]=[];while(unseen.size){const a=unseen.values().next().value!;const c=H.map(h=>right?g.mul(h,a):g.mul(a,h)).sort((a,b)=>a-b);out.push(c);c.forEach(x=>unseen.delete(x));}return out;}
export function subgroups(g:Group){const result:number[][]=[[0]],seen=new Set(['0']);for(let i=0;i<result.length;i++)for(let a=0;a<g.labels.length;a++){const h=closure(g,[...result[i],a]),k=h.join(',');if(!seen.has(k)){seen.add(k);result.push(h);}}return result.sort((a,b)=>a.length-b.length);}
export const normal=(g:Group,H:number[])=>g.labels.every((_,a)=>H.every(h=>H.includes(g.mul(g.mul(a,h),inverse(g,a)))));
export const palette=['#69dbca','#a7a1ff','#ffca7a','#ff8b9e','#81b8ff','#dce987','#ebacff','#80d49b','#ffae80','#97d5ef','#c7b988','#cc98b5'];
export type Lesson={id:string;title:string;track:string;section:string;source:{title:string;url:string;section:string};intuition:string;definition:string;explanation:string;theorem:string;proof:string;pitfall:string;prompt:string;machine:string;parameters?:Record<string,unknown>};
