// One-off proof of the existing public Brian builder: real HTTP, no mocks,
// no credentials in the browser or stored receipts, no customer correspondence.
import { writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
const API = "https://geminx-backend-production.up.railway.app/api/v1/instant-preview";
const ORIGIN = "https://r1mob2-svg.github.io";
const receipt = {
  schema: "digital-ambush.public-builder-canary.v1",
  started_at: new Date().toISOString(),
  source: "GitHub Actions public origin",
  checks: {},
  phases: [],
  overall: "BLOCKED",
};
const out = "docs/previews/live-builder/live-canary.json";
function save(){
  receipt.checked_at=new Date().toISOString();
  writeFileSync(out,JSON.stringify(receipt,null,2)+"\n");
}
async function call(route, data, timeoutMs=30000) {
  const r=await fetch(API+"/"+route,{
    method:"POST",
    headers:{"Origin":ORIGIN,"Content-Type":"application/json"},
    body:JSON.stringify(data),signal:AbortSignal.timeout(timeoutMs)
  });
  return r;
}
async function untilDone(job,operation,version) {
  for(let i=0;i<120;i++){
    await sleep(5000);
    const res=await call("status",{projectId:job.projectId,editToken:job.editToken,operation,version});
    const status=await res.json();
    if(res.status===202 && status.ok) {
      if(!receipt.phases.includes("BRIAN_JOB_RUNNING"))receipt.phases.push("BRIAN_JOB_RUNNING");
      continue;
    }
    if(res.ok && status.ok && status.status==="QA_PASSED" && status.visualQa?.verified===true){
      return status;
    }
    throw Error(operation+" status failed: "+(status.error||res.status));
  }
  throw Error("No verified completion within ten minutes");
}
try{
  const pre=await fetch(API+"/build",{
    method:"OPTIONS",headers:{"Origin":ORIGIN,"Access-Control-Request-Method":"POST",
      "Access-Control-Request-Headers":"content-type"},signal:AbortSignal.timeout(12000)
  });
  receipt.checks.preflight={status:pre.status,
    allow_origin:pre.headers.get("access-control-allow-origin")===ORIGIN,
    response_headers:Object.fromEntries([...pre.headers.entries()].filter(([k])=>/access-control|vary|server|x-geminx/i.test(k)))};
  if(pre.status!==204||!receipt.checks.preflight.allow_origin)throw Error("Public-origin CORS preflight failed");
  receipt.phases.push("CORS_VALIDATED");
  save();
  const b=await call("build",{
    businessName:"Taurus Removals",town:"Oldbury",
    businessDescription:"House removals",
    sourceUrl:""
  },40000);
  const raw=await b.text();
  if(!b.ok)throw Error("Build ingress HTTP "+b.status+" "+raw.slice(0,120));
  const events=raw.split(/\n\n/).flatMap(frame=>{
    const l=frame.split("\n").find(z=>z.startsWith("data: "));
    if(!l)return []; try{return [JSON.parse(l.slice(6))]}catch{return []}
  });
  receipt.phases.push(...events.map(e=>e.state).filter(Boolean));
  const queued=events.find(e=>e.state==="SITE_BUILD_QUEUED"&&e.ok&&e.projectId&&e.editToken);
  receipt.checks.build_ingress={http:b.status,queued:Boolean(queued),
    agent:queued?.agent_id||null,job_id_prefix:queued?.jobId?.slice(0,40)||null};
  if(!queued||queued.agent_id!=="brian")throw Error("Brian was not queued");
  save();
  const built=await untilDone(queued,"build",0);
  receipt.phases.push("BRIAN_ARTIFACT_VERIFIED");
  receipt.checks.build={
    passed:Boolean(built.html&&built.revisionId),
    has_company_name:built.html?.toLowerCase().includes("taurus removals")===true,
    html_sha256:built.htmlSha256||null,
    qa_verified:built.visualQa?.verified===true,
    viewports:built.visualQa?.screenshots?.map(x=>x.width)||[],
    vision_model:built.visualQa?.vision_model||null
  };
  if(!receipt.checks.build.passed||!receipt.checks.build.has_company_name||
    JSON.stringify(receipt.checks.build.viewports)!=="[390,820,1280]")throw Error("Source or viewport evidence incomplete");
  save();
  const e=await call("edit",{
    projectId:queued.projectId,editToken:queued.editToken,
    prompt:"Please add a clearly labelled, accessible quotation FAQ to the footer without changing verified company information."
  });
  const edit=await e.json();
  receipt.checks.edit_dispatch={http:e.status,queued:e.status===202&&edit.agent_id==="brian"&&edit.status==="QUEUED"};
  if(!receipt.checks.edit_dispatch.queued)throw Error("Brian edit was not queued: "+(edit.error||e.status));
  receipt.phases.push("BRIAN_EDIT_QUEUED");
  save();
  const edited=await untilDone(queued,"edit",Number(edit.version));
  receipt.checks.edit={qa_verified:edited.visualQa?.verified===true,
    revision_changed:edited.revisionId!==built.revisionId,
    html_changed:edited.htmlSha256!==built.htmlSha256,
    screenshot_widths:edited.visualQa?.screenshots?.map(x=>x.width)||[]};
  if(!receipt.checks.edit.qa_verified||!receipt.checks.edit.revision_changed||
    !receipt.checks.edit.html_changed)throw Error("Live edit not visually verified");
  receipt.phases.push("BRIAN_EDIT_VERIFIED");
  receipt.overall="PASS";
}catch(e){
  receipt.overall="BLOCKED";
  receipt.error=String(e instanceof Error?e.message:e).slice(0,280);
}finally{
  save();
  console.log(JSON.stringify({overall:receipt.overall,checks:receipt.checks,phases:receipt.phases,error:receipt.error||null}));
  if(receipt.overall!=="PASS")process.exitCode=1;
}