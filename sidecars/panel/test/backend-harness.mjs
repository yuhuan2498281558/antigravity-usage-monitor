import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import * as metrics from '../speed-metrics.mjs';

const BACKEND_MODULE_FILES = [
  '../backend/config.mjs',
  '../backend/pricing-catalog.mjs',
  '../backend/plugin-updater.mjs',
  '../backend/ls-rpc.mjs',
  '../backend/model-pricing.mjs',
  '../backend/quota-pools.mjs',
  '../backend/local-scanner.mjs',
  '../backend/usage-aggregator.mjs',
  '../backend/telemetry-builder.mjs',
  '../main.mjs',
];

function loadCombinedBackendSource() {
  return BACKEND_MODULE_FILES.map((relPath) =>
    fs.readFileSync(new URL(relPath, import.meta.url), 'utf8')
  ).join('\n');
}

function stripEsmSyntax(rawSource, mainUrl) {
  return rawSource
    .replace(/^\s*import\s+[\s\S]*?from\s+['"][^'"]+['"];?\r?\n/gm, '')
    .replace(/^\s*export\s+(?=(?:async\s+)?function\b|const\b|let\b|class\b)/gm, '')
    .replaceAll('import.meta.url', JSON.stringify(mainUrl));
}

export function backendHarness({
  cache={},
  settings={},
  trajectories={},
  summaries={},
  userStatus={},
  quotaSummary={groups:[]},
  localCatalog=null,
  remoteCatalog=null,
  pluginManifest=null,
  hasGitDir=false,
  pluginRootPath=null,
  remoteFetch=null,
  execFileImpl=null,
  sourceText=null,
  metricsImplementation=metrics,
}={}) {
  const mainUrl = pluginRootPath ? `file://${pluginRootPath}/sidecars/panel/main.mjs` : 'file:///test/sidecars/panel/main.mjs';
  const mainPath = pluginRootPath ? `${pluginRootPath}/sidecars/panel/main.mjs` : '/test/sidecars/panel/main.mjs';
  const source = stripEsmSyntax(sourceText ?? loadCombinedBackendSource(), mainUrl);
  const state={calls:[],errors:[],saves:[],trajectories,userStatus,quotaSummary,localCatalog,remoteCatalog,pluginManifest,hasGitDir};
  const ctx={
    ...metricsImplementation, URL, AbortSignal, Buffer,
    process:{platform:'win32',env:{ANTIGRAVITY_EXECUTABLE_DATA_DIR:'/test-data',ANTIGRAVITY_LS_ADDRESS:'test.invalid',ANTIGRAVITY_CSRF_TOKEN:'test'}},
    console:{error:m=>state.errors.push(m)},
    cpSync:()=>{},
    rmSync:()=>{},
    execFile:execFileImpl || ((cmd,args,opts,cb)=>{
      const fn = typeof opts === 'function' ? opts : cb;
      fn(new Error('execFile not mocked'));
    }),
    existsSync:p=>{
      const norm = String(p).replace(/\\/g, '/');
      if (norm.endsWith('settings.json') || norm.endsWith('trajectory_usage_cache.json')) return true;
      if (norm.endsWith('pricing-catalog.json')) return Boolean(state.localCatalog);
      if (norm.endsWith('remote_pricing_cache.json')) return Boolean(state.remoteCatalog);
      if (norm.endsWith('plugin.json')) return Boolean(state.pluginManifest);
      if (norm.endsWith('/.git')) return Boolean(state.hasGitDir);
      return false;
    },
    mkdirSync:()=>{},readdirSync:()=>[],statSync:()=>({mtimeMs:0}),
    readFileSync:p=>{
      const norm = String(p).replace(/\\/g, '/');
      if (norm.endsWith('settings.json')) return JSON.stringify(settings);
      if (norm.endsWith('pricing-catalog.json')) return JSON.stringify(state.localCatalog);
      if (norm.endsWith('remote_pricing_cache.json')) return JSON.stringify(state.remoteCatalog);
      if (norm.endsWith('plugin.json')) return JSON.stringify(state.pluginManifest);
      return JSON.stringify(cache);
    },
    writeFileSync:(p,s)=>{
      const norm = String(p).replace(/\\/g, '/');
      const parsed = typeof s === 'string' ? JSON.parse(s) : s;
      state.saves.push({path:p,data:parsed});
      if (norm.endsWith('remote_pricing_cache.json')) {
        state.remoteCatalog = parsed;
      }
    },
    homedir:()=>'/test-home',dirname:path.dirname,join:path.join,basename:path.basename,fileURLToPath:()=>mainPath,
    Response:class {constructor(body,options){this.body=body;this.options=options;}},
    SidecarApp:class {page(){} api(){} run(){}},
    StreamDiagnostics:class {status(){return {enabled:false};} start(){}},
    fetch:async(url,options={})=>{
      if (/^https?:\/\/(?!test\.invalid)/i.test(String(url)) && remoteFetch) {
        return remoteFetch(url, options);
      }
      const method=url.split('/').pop(); const body=options.body ? JSON.parse(options.body) : {};state.calls.push({method,body});
      if(method==='GetCascadeTrajectory') {
        const data=state.trajectories[body.cascadeId];
        if(data instanceof Error) throw data;
        return {ok:true,json:async()=>data||{}};
      }
      if(method==='RetrieveUserQuotaSummary') {
        if(state.quotaSummary instanceof Error) throw state.quotaSummary;
        return {ok:true,json:async()=>({response:state.quotaSummary})};
      }
      const data={GetUserStatus:{userStatus:state.userStatus},GetAllCascadeTrajectories:{trajectorySummaries:summaries}}[method];
      return {ok:true,json:async()=>data};
    },
  };
  vm.runInNewContext(source+'\n globalThis.api={buildTelemetryPayloadInternal,computeStepCost,resolveModelInfo,sanitizeCatalogPayload,rebuildActiveCatalog,syncCloudCatalog,getCloudStatus,compareSemver,performPluginUpdate};',ctx);
  return {...ctx.api,state};
}
