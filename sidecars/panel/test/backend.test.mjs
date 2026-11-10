import test from 'node:test';
import assert from 'node:assert/strict';
import {backendHarness} from './backend-harness.mjs';

const raw={trajectory:{steps:[{status:'CORTEX_STEP_STATUS_DONE',metadata:{
  createdAt:'2026-01-01T00:00:00Z',finishedGeneratingAt:'2026-01-01T00:00:10Z',
  modelUsage:{inputTokens:'100',cacheReadTokens:'200',outputTokens:'600',thinkingOutputTokens:'100',responseOutputTokens:'500'},
},plannerResponse:{response:'answer',thinkingDuration:'5s'}}],generatorMetadata:[{stepIndices:[0],chatModel:{timeToFirstToken:'3s',streamingDuration:'7s'}}]}};
const old={signature:'v5:old',title:'test',steps:[{stepIndex:0,modelKey:'MODEL_PLACEHOLDER_M418',inputTokens:100,cacheReadTokens:200,outputTokens:600,thinkingTokens:100,responseTokens:500,createdAtMs:1767225600000,ttftSec:0.4,streamTokPerSec:200,streamTokens:500,streamDurationSec:2.5,totalDurationSec:10,totalTokPerSec:60}]};

test('failed migration retains all accounting, makes legacy speed and TTFT unavailable',async()=>{
  const h=backendHarness({cache:{test:old},trajectories:{test:new Error('offline')}});
  const p=await h.buildTelemetryPayloadInternal('test');
  assert.equal(p.activeConversation.latestTokPerSec,null);
  assert.equal(p.activeConversation.latestTtftSec,null);
  assert.equal(p.activeConversation.avgTokPerSec,null);
  assert.equal(p.activeConversation.recentSteps[0].outputTokens,600);
  assert.equal(p.consumption.session.totalTokens,900);
  assert.equal(p.modelBreakdown[0].avgTokPerSec,null);
  assert.equal(h.state.saves.length,1);
  assert.equal(h.state.saves[0].data.test.steps[0].outputTokens,600);
  assert.equal(h.state.saves[0].data.test.steps[0].modelKey,'unknown');
});
test('successful migration rebuilds measurements and uses the same mean in both tables',async()=>{
  const h=backendHarness({cache:{test:old},trajectories:{test:raw}});
  const p=await h.buildTelemetryPayloadInternal('test');
  assert.equal(p.activeConversation.latestTokPerSec,60);
  assert.equal(p.activeConversation.latestTtftSec,3);
  assert.equal(p.activeConversation.avgTokPerSec,60);
  assert.equal(p.modelBreakdown[0].avgTokPerSec,60);
  assert.equal(p.modelBreakdown[0].speedSummary.sampleCount,1);
  assert.equal(p.consumption.session.totalTokens,900);
  assert.match(h.state.saves[0].data.test.signature,/^v10-model-identity:/);
});
test('a legacy stream setting cannot re-enable mixed speed formulas',async()=>{
  const h=backendHarness({cache:{test:old},trajectories:{test:raw},settings:{speedMode:'stream'}});
  const p=await h.buildTelemetryPayloadInternal('test');
  assert.equal(p.activeConversation.latestTokPerSec,60);
  assert.equal(p.activeConversation.avgTokPerSec,60);
  assert.equal(p.modelBreakdown[0].avgTokPerSec,60);
  assert.equal(p.settings.speedMode,undefined);
});
test('a malformed successful RPC cannot erase previously recorded usage',async()=>{
  const h=backendHarness({cache:{test:old},trajectories:{test:{}}});
  const p=await h.buildTelemetryPayloadInternal('test');
  assert.equal(p.consumption.session.totalTokens,900);
  assert.equal(p.activeConversation.latestTtftSec,null);
  assert.equal(h.state.saves.length,1);
  assert.equal(h.state.saves[0].data.test.steps[0].outputTokens,600);
  assert.equal(h.state.saves[0].data.test.steps[0].modelKey,'unknown');
});
test('a partial trajectory cannot replace a complete historical cache',async()=>{
  const h=backendHarness({cache:{test:old},trajectories:{test:{trajectory:{steps:[]},numTotalSteps:3}}});
  const p=await h.buildTelemetryPayloadInternal('test');
  assert.equal(p.consumption.session.totalTokens,900);
  assert.equal(h.state.saves.length,1);
  assert.equal(h.state.saves[0].data.test.steps[0].outputTokens,600);
  assert.equal(h.state.saves[0].data.test.steps[0].modelKey,'unknown');
  assert.match(h.state.errors[0],/Incomplete trajectory/);
});

test('a TTFT-only correction is persisted even when usage, duration and signature match',async()=>{
  const h=backendHarness({cache:{test:old},trajectories:{test:raw},summaries:{test:{
    stepCount:1,lastModifiedTime:'2026-01-01T00:00:10Z',status:'CASCADE_RUN_STATUS_RUNNING',
  }}});
  await h.buildTelemetryPayloadInternal('test');
  h.state.trajectories.test=structuredClone(raw);
  h.state.trajectories.test.trajectory.generatorMetadata[0].chatModel.timeToFirstToken='9s';
  const next=await h.buildTelemetryPayloadInternal('test');
  assert.equal(next.activeConversation.latestTtftSec,9);
  assert.equal(h.state.saves.length,2);
  assert.equal(h.state.saves[1].data.test.steps[0].ttftSec,9);
});

test('groups subagents under root conversation and computes both per-agent and aggregated telemetry',async()=>{
  const subRaw={trajectory:{steps:[{status:'CORTEX_STEP_STATUS_DONE',metadata:{
    createdAt:'2026-01-01T00:00:20Z',finishedGeneratingAt:'2026-01-01T00:00:25Z',
    modelUsage:{inputTokens:'300',cacheReadTokens:'400',outputTokens:'250',thinkingOutputTokens:'50',responseOutputTokens:'200'},
  },plannerResponse:{response:'sub answer',thinkingDuration:'1s'}}],generatorMetadata:[{stepIndices:[0],chatModel:{timeToFirstToken:'1s',streamingDuration:'4s',chatStartMetadata:{contextWindowMetadata:{tokenBreakdown:{groups:[{type:'TOKEN_TYPE_CHAT_MESSAGES',numTokens:12000},{type:'TOKEN_TYPE_TOOLS',numTokens:3000}]}}}}}]}};
  const h=backendHarness({
    trajectories:{root1:raw,sub1:subRaw},
    summaries:{
      root1:{stepCount:1,lastModifiedTime:'2026-01-01T00:00:10Z',status:'IDLE',annotations:{title:'Root Task'}},
      sub1:{stepCount:1,createdTime:'2026-01-01T00:00:20Z',lastModifiedTime:'2026-01-01T00:00:25Z',status:'CASCADE_RUN_STATUS_RUNNING',trajectoryMetadata:{rootConversationId:'root1',parentConversationId:'root1',subagentSpec:{typeName:'research',role:'Codebase Researcher'}}},
    },
  });
  const p=await h.buildTelemetryPayloadInternal('');
  // Top-level conversations list only contains root1, not raw sub1
  assert.equal(p.conversations.length,1);
  assert.equal(p.conversations[0].cascadeId,'root1');
  assert.equal(p.conversations[0].subagentCount,1);
  assert.equal(p.conversations[0].totalStepCount,2);
  // Active conversation has both individual agents and aggregated view
  assert.equal(p.activeConversation.hasSubagents,true);
  assert.equal(p.activeConversation.subagentCount,1);
  assert.equal(p.activeConversation.agents.length,2);
  assert.equal(p.activeConversation.agents[0].agentId,'main');
  assert.equal(p.activeConversation.agents[0].stepCount,1);
  assert.equal(p.activeConversation.agents[1].agentId,'sub1');
  assert.equal(p.activeConversation.agents[1].role,'Codebase Researcher');
  assert.equal(p.activeConversation.agents[1].context.messagesTokens,12000);
  assert.equal(p.activeConversation.aggregated.stepCount,2);
  assert.equal(p.activeConversation.aggregated.isRunning,true);
  assert.equal(p.activeConversation.aggregated.activeAgentId,'sub1');
  // Session consumption includes both root1 (900) and sub1 (950)
  assert.equal(p.consumption.session.totalTokens,1850);
});

test('discovers and links subagents from parent invokeSubagent steps after Antigravity restart when omitted from trajectorySummaries',async()=>{
  const rootWithInvoke={
    trajectory:{
      metadata:{rootConversationId:'root-audit'},
      steps:[
        {
          status:'CORTEX_STEP_STATUS_DONE',
          metadata:{
            createdAt:'2026-01-01T00:00:00Z',
            finishedGeneratingAt:'2026-01-01T00:00:10Z',
            modelUsage:{inputTokens:'100',cacheReadTokens:'200',outputTokens:'600',thinkingOutputTokens:'100',responseOutputTokens:'500'},
          },
          plannerResponse:{response:'spawning subagents',thinkingDuration:'5s'},
        },
        {
          type:'CORTEX_STEP_TYPE_INVOKE_SUBAGENT',
          status:'CORTEX_STEP_STATUS_DONE',
          metadata:{
            createdAt:'2026-01-01T00:00:12Z',
            toolCall:{name:'invoke_subagent',argumentsJson:JSON.stringify({Role:'Build & Baseline Verifier',TypeName:'issue_verifier'})},
          },
          invokeSubagent:{
            subagents:[{typeName:'issue_verifier',role:'Build & Baseline Verifier',initialPrompt:'long prompt...'}],
            results:[{conversationId:'sub-cached-1'}],
          },
        },
        {
          type:'CORTEX_STEP_TYPE_INVOKE_SUBAGENT',
          status:'CORTEX_STEP_STATUS_DONE',
          metadata:{
            createdAt:'2026-01-01T00:00:15Z',
            toolCall:{name:'invoke_subagent',argumentsJson:JSON.stringify({Role:'P0 Disk Quiz Patch Verifier',TypeName:'issue_verifier'})},
          },
          invokeSubagent:{
            subagents:[{typeName:'issue_verifier',role:'P0 Disk Quiz Patch Verifier',initialPrompt:'long prompt 2...'}],
            results:[{conversationId:'sub-uncached-2'}],
          },
        },
      ],
      generatorMetadata:[{stepIndices:[0],chatModel:{timeToFirstToken:'3s',streamingDuration:'7s'}}],
    },
  };
  const sub2Raw={
    trajectory:{
      metadata:{
        parentConversationId:'root-audit',
        rootConversationId:'root-audit',
        subagentSpec:{typeName:'issue_verifier',role:'P0 Disk Quiz Patch Verifier',initialPrompt:'huge prompt'},
      },
      steps:[{
        status:'CORTEX_STEP_STATUS_DONE',
        metadata:{
          createdAt:'2026-01-01T00:00:20Z',
          finishedGeneratingAt:'2026-01-01T00:00:25Z',
          modelUsage:{inputTokens:'400',cacheReadTokens:'600',outputTokens:'300',thinkingOutputTokens:'50',responseOutputTokens:'250'},
        },
        plannerResponse:{response:'sub2 report',thinkingDuration:'1s'},
      }],
      generatorMetadata:[{stepIndices:[0],chatModel:{timeToFirstToken:'1s',streamingDuration:'4s'}}],
    },
  };
  // Simulate pre-existing v10 cache entries saved before subagentRefs existed
  const preCachedSub1Step={
    stepIndex:1,
    createdAt:'2026-01-01T00:00:14Z',
    createdAtMs:Date.parse('2026-01-01T00:00:14Z'),
    modelKey:'MODEL_PLACEHOLDER_M417',
    responseModel:'gemini-3.1-pro-high',
    modelIdentityVersion:2,
    modelSource:'explicit',
    inputTokens:200,
    cacheReadTokens:300,
    outputTokens:500,
    thinkingTokens:100,
    responseTokens:400,
    contextBreakdown:{messagesTokens:18000,userInputTokens:2000,assistantTokens:6000,toolResultsTokens:10000,subagentTokens:0,checkpointTokens:0,systemToolsTokens:4000,mcpToolsTokens:0,skillsTokens:1000,systemPromptTokens:5000,userRulesTokens:2000},
  };
  const h=backendHarness({
    cache:{
      'root-audit':{
        signature:'v10-model-identity:3:2026-01-01T00:00:15Z',
        title:'Frontend Issue Audit Verification',
        lastModifiedMs:Date.parse('2026-01-01T00:00:15Z'),
        steps:[{...preCachedSub1Step,inputTokens:100,cacheReadTokens:200,outputTokens:600}],
      },
      'sub-cached-1':{
        signature:'v10-model-identity:disk:1767225614000',
        title:'sub-cach',
        lastModifiedMs:Date.parse('2026-01-01T00:00:14Z'),
        steps:[preCachedSub1Step],
      },
    },
    trajectories:{
      'root-audit':rootWithInvoke,
      'sub-uncached-2':sub2Raw,
    },
    // After restart, GetAllCascadeTrajectories only returns root-audit!
    summaries:{
      'root-audit':{
        stepCount:3,
        lastModifiedTime:'2026-01-01T00:00:15Z',
        status:'IDLE',
        annotations:{title:'Frontend Issue Audit Verification'},
      },
    },
  });

  const p=await h.buildTelemetryPayloadInternal('root-audit');
  assert.equal(p.conversations.length,1);
  assert.equal(p.conversations[0].cascadeId,'root-audit');
  assert.equal(p.conversations[0].subagentCount,2);
  assert.equal(p.activeConversation.hasSubagents,true);
  assert.equal(p.activeConversation.subagentCount,2);
  assert.equal(p.activeConversation.agents.length,3);
  assert.equal(p.activeConversation.agents[1].agentId,'sub-cached-1');
  assert.equal(p.activeConversation.agents[1].role,'Build & Baseline Verifier');
  assert.equal(p.activeConversation.agents[1].context.messagesTokens,18000);
  assert.equal(p.activeConversation.agents[2].agentId,'sub-uncached-2');
  assert.equal(p.activeConversation.agents[2].role,'P0 Disk Quiz Patch Verifier');
  assert.equal(p.activeConversation.aggregated.stepCount,3);
  // Verify initialPrompt was stripped from persisted cache
  const savedSub2=h.state.saves[h.state.saves.length-1].data['sub-uncached-2'];
  assert.equal(savedSub2.subagentSpec.initialPrompt,undefined);
  assert.equal(savedSub2.subagentSpec.role,'P0 Disk Quiz Patch Verifier');
  // Conversation dropdown stepCount matches model step count (1, not 3 raw steps)
  assert.equal(p.conversations[0].stepCount,1);
  assert.equal(p.conversations[0].totalStepCount,3);
});

test('converges multi-level nested subagents to ultimate root and preserves metrics when a newly spawned subagent has 0 steps',async()=>{
  const rootTraj={
    trajectory:{
      steps:[
        {
          status:'CORTEX_STEP_STATUS_DONE',
          metadata:{
            createdAt:'2026-01-01T00:00:00Z',
            finishedGeneratingAt:'2026-01-01T00:00:10Z',
            modelUsage:{inputTokens:'100',cacheReadTokens:'200',outputTokens:'600',thinkingOutputTokens:'100',responseOutputTokens:'500'},
          },
          plannerResponse:{response:'root step',thinkingDuration:'5s'},
        },
        {
          type:'CORTEX_STEP_TYPE_INVOKE_SUBAGENT',
          status:'CORTEX_STEP_STATUS_DONE',
          metadata:{createdAt:'2026-01-01T00:00:11Z'},
          invokeSubagent:{
            subagents:[{typeName:'self',role:'Level 1 Orchestrator'}],
            results:[{conversationId:'sub-l1'}],
          },
        },
      ],
      generatorMetadata:[{stepIndices:[0],chatModel:{timeToFirstToken:'2s',streamingDuration:'8s'}}],
    },
  };
  const subL1Traj={
    trajectory:{
      metadata:{
        parentConversationId:'root-multi',
        subagentSpec:{typeName:'self'},
      },
      steps:[
        {
          status:'CORTEX_STEP_STATUS_DONE',
          metadata:{
            createdAt:'2026-01-01T00:00:15Z',
            finishedGeneratingAt:'2026-01-01T00:00:20Z',
            modelUsage:{inputTokens:'200',cacheReadTokens:'300',outputTokens:'400',thinkingOutputTokens:'50',responseOutputTokens:'350'},
          },
          plannerResponse:{response:'l1 step',thinkingDuration:'1s'},
        },
        {
          type:'CORTEX_STEP_TYPE_INVOKE_SUBAGENT',
          status:'CORTEX_STEP_STATUS_DONE',
          metadata:{createdAt:'2026-01-01T00:00:21Z'},
          invokeSubagent:{
            subagents:[{typeName:'research',role:'Level 2 Deep Worker'}],
            results:[{conversationId:'sub-l2'}],
          },
        },
      ],
      generatorMetadata:[{stepIndices:[0],chatModel:{timeToFirstToken:'1s',streamingDuration:'4s',chatStartMetadata:{contextWindowMetadata:{tokenBreakdown:{groups:[{type:'TOKEN_TYPE_CHAT_MESSAGES',numTokens:24000}]}}}}}],
    },
  };
  // Level 2 subagent is currently running with 0 completed model steps so far
  const subL2Traj={
    trajectory:{
      metadata:{
        parentConversationId:'sub-l1',
        rootConversationId:'sub-l1',
      },
      steps:[],
      generatorMetadata:[],
    },
  };

  const h=backendHarness({
    trajectories:{
      'root-multi':rootTraj,
      'sub-l1':subL1Traj,
      'sub-l2':subL2Traj,
    },
    summaries:{
      'root-multi':{stepCount:2,lastModifiedTime:'2026-01-01T00:00:11Z',status:'IDLE',annotations:{title:'Multi-Level Task'}},
      'sub-l1':{stepCount:2,lastModifiedTime:'2026-01-01T00:00:21Z',status:'IDLE',trajectoryMetadata:{parentConversationId:'root-multi'}},
      'sub-l2':{stepCount:0,lastModifiedTime:'2026-01-01T00:00:25Z',status:'CASCADE_RUN_STATUS_RUNNING',trajectoryMetadata:{parentConversationId:'sub-l1',rootConversationId:'sub-l1'}},
    },
  });

  const p=await h.buildTelemetryPayloadInternal('root-multi');
  assert.equal(p.conversations.length,1);
  assert.equal(p.conversations[0].subagentCount,2);
  assert.equal(p.activeConversation.subagentCount,2);
  assert.equal(p.activeConversation.agents.length,3);
  // Partial subagentSpec ({typeName:'self'}) merged with invokeSubagent role ('Level 1 Orchestrator')
  assert.equal(p.activeConversation.agents[1].role,'Level 1 Orchestrator');
  assert.equal(p.activeConversation.agents[2].agentId,'sub-l2');
  assert.equal(p.activeConversation.agents[2].role,'Level 2 Deep Worker');
  // Even though sub-l2 is running with 0 steps, aggregated telemetry retains valid speed & context from sub-l1
  assert.equal(p.activeConversation.aggregated.activeAgentId,'sub-l2');
  assert.equal(p.activeConversation.aggregated.latestTokPerSec,80);
  assert.equal(p.activeConversation.aggregated.context.messagesTokens,24000);
  // Main agent steps are not duplicated in agents[0].recentSteps or aggregated.recentSteps
  assert.equal(p.activeConversation.agents[0].recentSteps,undefined);
  assert.equal(p.activeConversation.aggregated.recentSteps,undefined);
  // Running sub-l2 with 0 steps still exposes liveActivity on both subagent and aggregated view
  assert.equal(p.activeConversation.agents[0].liveActivity,null);
  assert.equal(p.activeConversation.agents[2].liveActivity.phase,'thinking');
  assert.equal(p.activeConversation.aggregated.liveActivity.agentId,'sub-l2');
  assert.equal(p.activeConversation.aggregated.liveActivity.agentBadge,'子2');
  // runningConversations includes root-multi with main summary and collapsible subagents summary
  assert.equal(p.runningConversations.length,1);
  assert.equal(p.runningConversations[0].cascadeId,'root-multi');
  assert.equal(p.runningConversations[0].title,'Multi-Level Task');
  assert.equal(p.runningConversations[0].subagentCount,2);
  assert.equal(p.runningConversations[0].runningSubagentCount,1);
  assert.equal(p.runningConversations[0].mainActivity.label,'等待子代理');
  assert.equal(p.runningConversations[0].subagents[0].role,'Level 1 Orchestrator');
  assert.equal(p.runningConversations[0].subagents[0].isRunning,false);
  assert.equal(p.runningConversations[0].subagents[0].liveActivity.label,'已完成');
  assert.equal(p.runningConversations[0].subagents[1].role,'Level 2 Deep Worker');
  assert.equal(p.runningConversations[0].subagents[1].isRunning,true);
});

test('trendSeries buckets hourly for <=72h windows (today/24h) and daily for >72h windows (7d)', async () => {
  const nowMs = Date.now();
  const nowIso = new Date(nowMs - 5000).toISOString();
  const finIso = new Date(nowMs).toISOString();
  const h = backendHarness({
    trajectories: {
      c1: {
        trajectory: {
          steps: [
            {
              status: 'CORTEX_STEP_STATUS_DONE',
              metadata: {
                createdAt: nowIso,
                finishedGeneratingAt: finIso,
                modelUsage: {
                  model: 'MODEL_PLACEHOLDER_M37',
                  inputTokens: '100',
                  cacheReadTokens: '200',
                  outputTokens: '600',
                  thinkingOutputTokens: '100',
                  responseOutputTokens: '500',
                },
              },
              plannerResponse: { response: 'answer', thinkingDuration: '2s' },
            },
          ],
          generatorMetadata: [{ stepIndices: [0], chatModel: { timeToFirstToken: '1s', streamingDuration: '4s' } }],
        },
      },
    },
    summaries: {
      c1: { stepCount: 1, lastModifiedTime: finIso, status: 'IDLE' },
    },
  });

  const p24h = await h.buildTelemetryPayloadInternal('c1', false, { range: '24h' });
  const trend24h = p24h.consumption.trendSeries;
  assert.ok(trend24h.length >= 24 && trend24h.length <= 26);
  assert.equal(trend24h[0].granularity, 'hour');
  assert.match(trend24h[0].fullLabel, /\d+月\d+日 \d{2}:00 - \d{2}:00/);
  assert.equal(trend24h.reduce((sum, b) => sum + b.tokens, 0), 900);
  assert.equal(trend24h.reduce((sum, b) => sum + b.calls, 0), 1);

  const p7d = await h.buildTelemetryPayloadInternal('c1', false, { range: '7d' });
  const trend7d = p7d.consumption.trendSeries;
  assert.ok(trend7d.length >= 7 && trend7d.length <= 8);
  assert.equal(trend7d[0].granularity, 'day');
  assert.match(trend7d[0].fullLabel, /\d+月\d+日 \(周[日一二三四五六]\)/);
  assert.equal(trend7d.reduce((sum, b) => sum + b.tokens, 0), 900);
});

test('supports Gemini 4 Carbon pricing/pool and resolves all newly added language_server placeholder enums', async () => {
  const nowIso = new Date().toISOString();
  const h = backendHarness({
    userStatus: {
      name: 'Carbon Tester',
      cascadeModelConfigData: {
        clientModelConfigs: [
          {
            label: 'Gemini 3.8 Flash (High)',
            modelId: 'gemini-3.8-flash-high',
            modelOrAlias: { model: 'MODEL_PLACEHOLDER_M318' },
            quotaInfo: { remainingFraction: 0.9, resetTime: '2026-11-12T00:00:00Z' },
          },
          {
            label: 'Gemini 4 Carbon (High)',
            modelId: 'gemini-4-carbon-high',
            modelOrAlias: { model: 'MODEL_PLACEHOLDER_M429' },
            quotaInfo: { remainingFraction: 0.65, resetTime: '2026-11-17T00:00:00Z' },
          },
        ],
      },
    },
    trajectories: {
      cCarbon: {
        trajectory: {
          steps: [
            {
              status: 'CORTEX_STEP_STATUS_DONE',
              metadata: {
                createdAt: '2026-11-10T00:00:00Z',
                finishedGeneratingAt: '2026-11-10T00:00:05Z',
                modelUsage: {
                  model: 'MODEL_PLACEHOLDER_M298',
                  inputTokens: '1000000',
                  cacheReadTokens: '0',
                  outputTokens: '0',
                },
              },
              plannerResponse: { response: 'flash 3.7 high' },
            },
            {
              status: 'CORTEX_STEP_STATUS_DONE',
              metadata: {
                createdAt: '2026-11-10T00:00:06Z',
                finishedGeneratingAt: '2026-11-10T00:00:10Z',
                modelUsage: {
                  model: 'MODEL_PLACEHOLDER_M402',
                  inputTokens: '1000000',
                  cacheReadTokens: '0',
                  outputTokens: '0',
                },
              },
              plannerResponse: { response: 'claude opus 5.5 high' },
            },
            {
              status: 'CORTEX_STEP_STATUS_DONE',
              metadata: {
                createdAt: '2026-11-10T00:00:11Z',
                finishedGeneratingAt: '2026-11-10T00:00:15Z',
                modelUsage: {
                  model: 'MODEL_PLACEHOLDER_M429',
                  inputTokens: '1000000',
                  cacheReadTokens: '1000000',
                  outputTokens: '100000',
                },
              },
              plannerResponse: { response: 'carbon high' },
            },
            {
              status: 'CORTEX_STEP_STATUS_DONE',
              metadata: {
                createdAt: '2026-11-10T00:00:16Z',
                finishedGeneratingAt: '2026-11-10T00:00:20Z',
                modelUsage: {
                  model: 'claude-fable-5-2-high',
                  inputTokens: '1000000',
                  cacheReadTokens: '1000000',
                  outputTokens: '100000',
                },
              },
              plannerResponse: { response: 'fable 5.2 high' },
            },
            {
              status: 'CORTEX_STEP_STATUS_DONE',
              metadata: {
                createdAt: '2026-11-10T00:00:21Z',
                finishedGeneratingAt: '2026-11-10T00:00:25Z',
                modelUsage: {
                  model: 'gpt-6.1-terra',
                  inputTokens: '1000000',
                  cacheReadTokens: '1000000',
                  outputTokens: '100000',
                },
              },
              plannerResponse: { response: 'gpt 6.1 terra' },
            },
            {
              status: 'CORTEX_STEP_STATUS_DONE',
              metadata: {
                createdAt: '2026-11-10T00:00:26Z',
                finishedGeneratingAt: '2026-11-10T00:00:30Z',
                modelUsage: {
                  model: 'MODEL_PLACEHOLDER_M429',
                  inputTokens: '0',
                  cacheReadTokens: '0',
                  outputTokens: '100',
                },
              },
              plannerResponse: { response: 'carbon tail' },
            },
          ],
          generatorMetadata: [
            { stepIndices: [0], chatModel: { timeToFirstToken: '1s', streamingDuration: '4s' } },
            { stepIndices: [1], chatModel: { timeToFirstToken: '1s', streamingDuration: '3s' } },
            { stepIndices: [2], chatModel: { timeToFirstToken: '1s', streamingDuration: '3s' } },
            { stepIndices: [3], chatModel: { timeToFirstToken: '1s', streamingDuration: '3s' } },
            { stepIndices: [4], chatModel: { timeToFirstToken: '1s', streamingDuration: '3s' } },
            { stepIndices: [5], chatModel: { timeToFirstToken: '1s', streamingDuration: '1s' } },
          ],
        },
      },
    },
    summaries: {
      cCarbon: { stepCount: 6, lastModifiedTime: nowIso, status: 'IDLE' },
    },
  });

  const p = await h.buildTelemetryPayloadInternal('cCarbon');
  assert.equal(p.activeConversation.sessionUnpricedCalls, 0);
  // Step 0: M298 -> Gemini 3.7 Flash ($0.75)
  // Step 1: M402 -> Claude Opus 5.5 ($4.00)
  // Step 2: Carbon High -> 1M*$2.00 + 1M*$0.10 + 0.1M*$10.0 = $3.10
  // Step 3: Fable 5.2 High -> 1M*$8.00 + 1M*$0.20 + 0.1M*$40.0 = $12.20
  // Step 4: GPT-6.1 Terra -> 1M*$1.00 + 1M*$0.05 + 0.1M*$5.0 = $1.55
  // Step 5: Carbon High -> 100 tok * $10/1M = $0.001
  // Total = 0.75 + 4.00 + 3.10 + 12.20 + 1.55 + 0.001 = $21.601 -> $21.60
  assert.equal(p.activeConversation.sessionCostUsd, 21.6);
  assert.equal(p.activeConversation.activeModelShort, 'carbon-4-high');
  assert.equal(p.quotas.activePool.poolKey, 'Carbon');
  assert.equal(p.quotas.activePool.weeklyRemainingIntPct, 65);
});
