import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nextDaily} from '../src/shared/schedules.js';
test('daily schedules handle Berlin DST gaps and repeated local times',()=>{
 const schedule={time:'02:30',timeZone:'Europe/Berlin'};
 assert.equal(nextDaily(schedule,new Date('2026-03-28T03:00:00Z')).toISOString(),'2026-03-30T00:30:00.000Z');
 assert.equal(nextDaily(schedule,new Date('2026-10-25T00:30:00Z')).toISOString(),'2026-10-26T01:30:00.000Z');
});
