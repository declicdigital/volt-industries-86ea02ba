import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const html = readFileSync(new URL('../public/game/volt-industries.html', import.meta.url), 'utf8');
function source(name) {
  const start = html.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} exists`);
  const end = html.indexOf('\n}', start);
  return html.slice(start, end + 2);
}
function game(state = {}) {
  const context = vm.createContext({S: state, Math: Object.create(Math), recruitCandidates: () => ['rookie']});
  vm.runInContext('function clamp(v,min,max){return Math.max(min,Math.min(max,v))}', context);
  for (const name of ['normalizeMentorEligibility','feedMentorProgress','shouldTriggerMentor','eclatCtxFromChoice','gemFightMultOf','gemTrialScaling','winOdds']) {
    vm.runInContext(source(name), context);
  }
  return context;
}
test('recruits are not automatically unlocked by reaching year 6 or 50', () => {
  for (const currentYear of [6,50]) {
    const g = game({currentYear,years:50,mentorProgress:0,mentorThreshold:2,mentorCap:0});
    g.Math.random = () => 0;
    assert.equal(g.shouldTriggerMentor(), false);
  }
});
test('2 to 4 genuine mentoring/protection choices unlock eligibility', () => {
  for (const mentorThreshold of [2,3,4]) {
    const g = game({years:20,mentorThreshold});
    for(let i=1;i<mentorThreshold;i++) {
      g.feedMentorProgress(g.eclatCtxFromChoice({fr:'Protéger les civils'}));
      assert.ok(!g.S.mentorEligible);
    }
    g.feedMentorProgress(g.eclatCtxFromChoice({en:'Train your operatives'}));
    assert.equal(g.S.mentorEligible, true);
    assert.ok(g.S.mentorCap >= 2);
  }
});
test('unrelated transformation and former ally wording does not unlock recruits', () => {
  const g = game();
  assert.ok(!g.eclatCtxFromChoice({fr:'Transformer la peur',en:'Meet a former ally'}).mentorLean);
});
test('existing saves use earned progress with the 2-4 choice threshold', () => {
  const g = game({years:20,currentYear:10,mentorProgress:4,mentorThreshold:10,mentorCap:0,mentorCount:0});
  g.Math.random = () => 0;
  assert.equal(g.shouldTriggerMentor(), true);
  assert.equal(g.S.mentorThreshold,4);
});
test('after compensating player passive gem bonuses every trial stays neutral', () => {
  const g = game({eclats:[]});
  g.Math.random = () => 0.5; // tirage neutre : multiplicateur exactement x1
  let hp = null, damage = null;
  for(let n=0;n<=5;n++) {
    g.S.eclats = Array(n).fill('owned');
    const scaling = g.gemTrialScaling({eclatQuest:'derive'});
    const relativeHp = scaling.hp;
    const relativeDamage = scaling.damage;
    assert.equal(relativeHp, 1);
    if(hp !== null) {
      assert.ok(Math.abs(relativeHp - hp) < 1e-9, `hp stable at ${n} gems: ${relativeHp} vs ${hp}`);
      assert.ok(Math.abs(relativeDamage - damage) < 1e-9, `damage stable at ${n} gems: ${relativeDamage} vs ${damage}`);
    }
    hp = relativeHp; damage = relativeDamage;
  }
  assert.equal(g.gemTrialScaling({type:'combat'}).hp,1);
  assert.equal(g.gemTrialScaling({type:'combat'}).damage,1);
});
test('no mandatory extra difficulty: win odds do not shrink as gems pile up', () => {
  const g = game({eclats:[]});
  g.Math.random = () => 0.5; // tirage neutre : 50/50 a chaque epreuve
  for(let n=0;n<=5;n++) {
    g.S.eclats = Array(n).fill('owned');
    assert.equal(g.winOdds('foe',{eclatQuest:'derive'}),0.5);
  }
});
test('gem trials depend only on the per-fight draw within x0.833..x1.2', () => {
  const g = game({eclats:[]});
  g.S.eclats = Array(4).fill('owned');
  g.Math.random = () => 1; // pire tirage : gardien x1.2
  assert.ok(Math.abs(g.winOdds('foe',{eclatQuest:'derive'}) - 0.5/1.2) < 1e-9);
  g.Math.random = () => 0; // meilleur tirage : gardien x0.833
  assert.ok(Math.abs(g.winOdds('foe',{eclatQuest:'derive'}) - 0.5*1.2) < 1e-9);
});
test('guardian strength is redrawn every gem fight on a continuous scale', () => {
  const g = game({});
  const draws = new Set();
  for(let i=0;i<300;i++) {
    const m = g.gemFightMultOf({eclatQuest:'derive'});
    assert.ok(m >= 1/1.2 && m <= 1.2, `draw ${m} within x0.833..x1.2`);
    draws.add(m);
  }
  assert.ok(draws.size > 250, `continuous draws: ${draws.size} distinct values out of 300`);
  assert.equal(g.gemFightMultOf({type:'combat'}),1);
});