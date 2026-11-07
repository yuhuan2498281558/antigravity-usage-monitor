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
});
