import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import * as metrics from '../speed-metrics.mjs';

export function backendHarness({cache={},settings={},trajectories={},summaries={},sourceText=null,metricsImplementation=metrics}={}) {
  const source=(sourceText ?? fs.readFileSync(new URL('../main.mjs',import.meta.url),'utf8'))
    .replace(/^import .*;\r?\n/gm,'').replaceAll('import.meta.url',JSON.stringify('file:///test/main.mjs'));
  const state={calls:[],errors:[],saves:[],trajectories};
  const ctx={
    ...metricsImplementation, URL, AbortSignal,
    process:{env:{ANTIGRAVITY_EXECUTABLE_DATA_DIR:'/test-data',ANTIGRAVITY_LS_ADDRESS:'test.invalid',ANTIGRAVITY_CSRF_TOKEN:'test'}},
    console:{error:m=>state.errors.push(m)},
    existsSync:p=>p.endsWith('settings.json') || p.endsWith('trajectory_usage_cache.json'),
    mkdirSync:()=>{},readdirSync:()=>[],statSync:()=>({mtimeMs:0}),
    readFileSync:p=>JSON.stringify(p.endsWith('settings.json')?settings:cache),
    writeFileSync:(p,s)=>state.saves.push({path:p,data:JSON.parse(s)}),
    homedir:()=>'/test-home',dirname:path.dirname,join:path.join,fileURLToPath:()=>'/test/main.mjs',
    Response:class {constructor(body,options){this.body=body;this.options=options;}},
    SidecarApp:class {page(){} api(){} run(){}},
    StreamDiagnostics:class {status(){return {enabled:false};} start(){}},
    fetch:async(url,options)=>{
      const method=url.split('/').pop(); const body=JSON.parse(options.body);state.calls.push({method,body});
      if(method==='GetCascadeTrajectory') {
        const data=state.trajectories[body.cascadeId];
        if(data instanceof Error) throw data;
        return {ok:true,json:async()=>data||{}};
      }
      const data={GetUserStatus:{userStatus:{}},GetAllCascadeTrajectories:{trajectorySummaries:summaries},RetrieveUserQuotaSummary:{response:{groups:[]}}}[method];
      return {ok:true,json:async()=>data};
    },
  };
  vm.runInNewContext(source+'\n globalThis.api={buildTelemetryPayloadInternal,computeStepCost};',ctx);
  return {...ctx.api,state};
}
