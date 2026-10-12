import test from 'node:test';
import assert from 'node:assert/strict';
import { Workflow } from './workflow.js';

test('blocks a second active concept', () => { const w=new Workflow(); w.startCenter('brainstorm',false); assert.throws(()=>w.startCenter('brainstorm',false),/één concept/); });
test('requires approved input before starting other centers', () => { assert.throws(()=>new Workflow().startCenter('strategy',false),/goedgekeurde/); });
test('public publishing requires explicit consent', () => { const w=new Workflow(); assert.throws(()=>w.publish('youtube','public'),/expliciet akkoord/); w.publish('youtube','public',true); assert.doesNotThrow(()=>w.publish('youtube','public')); });
test('keeps expansion locked until ten videos and stable retention', () => { const w=new Workflow(); assert.throws(()=>w.startCenter('expansion',true),/10 publicaties/); w.publishedCount=10; w.stableRetention=true; assert.doesNotThrow(()=>w.startCenter('expansion',true)); });
test('splits approvals longer than five minutes and only accepts a concrete change', () => { const w=new Workflow(); assert.throws(()=>w.createApproval('script','Script',6,'x'),/5 minuten/); const a=w.createApproval('script','Script',2,'x'); assert.throws(()=>w.resolveApproval(a.id,'change'),/concrete aanpassing/); assert.equal(w.resolveApproval(a.id,'change','Kortere hook').status,'changed'); });
