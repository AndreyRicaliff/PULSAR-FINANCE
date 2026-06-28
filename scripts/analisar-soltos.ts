import 'dotenv/config'
const URL=process.env.SUPABASE_URL!, SK=process.env.SUPABASE_SERVICE_ROLE_KEY!
async function doc(id:string,base:string){const r=await fetch(`${URL}/rest/v1/painel_estado?chave=eq.cliente:${id}:${base}&select=dados`,{headers:{apikey:SK,Authorization:`Bearer ${SK}`}});const j=await r.json() as any[];return j[0]?.dados??null}
for(const [nome,id] of [['27','00000000-0000-4000-8000-000000000027'],['36','00000000-0000-4000-8000-000000000036']] as [string,string][]){
  const modelo=await doc(id,'painel-ag-modelo-v4'); const mov=await doc(id,'movimentos-raw'); const cad=await doc(id,'cadastros-raw')
  const conc=modelo?.contas??{estrutura:[],mapa:{}}
  const paiDe=new Map(conc.estrutura.map((n:any)=>[n.id,n.paiId??null]))
  const nomeNo=new Map(conc.estrutura.map((n:any)=>[n.id,n.nome]))
  const nomeCat=new Map((cad?.categorias??[]).map((c:any)=>[c.codigo,c.descricao]))
  const cats=[...new Set((mov?.movimentos??[]).map((m:any)=>m.categoria))]
  const soltos:string[]=[]; const semGrupo:string[]=[]; let okSub=0
  for(const c of cats as string[]){const no=conc.mapa[c]; if(!no){semGrupo.push(`${c} ${nomeCat.get(c)||''}`);continue} if(paiDe.get(no)===null) soltos.push(`${c} ${nomeCat.get(c)||''} → ${nomeNo.get(no)}`); else okSub++}
  console.log(`\n#### ACME ${nome} — ${cats.length} categorias c/ mov ####`)
  console.log(`em subgrupo (ok): ${okSub} | SOLTOS no grupo: ${soltos.length} | sem grupo: ${semGrupo.length}`)
  soltos.forEach(s=>console.log('  solto:',s)); semGrupo.forEach(s=>console.log('  semGrupo:',s))
}
