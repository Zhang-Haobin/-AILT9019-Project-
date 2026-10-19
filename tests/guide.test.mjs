import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGuide} from '../public/engine.mjs';

const research = new URL('../docs/research/hku-recycling/', import.meta.url);
const knowledge = JSON.parse(readFileSync(new URL('knowledge_base.json', research)));
const catalog = JSON.parse(readFileSync(new URL('sources.json', research)));
const answer = createGuide(knowledge, catalog);

// These are explicit workflow expectations, not an independent policy audit.
const cases = [
  ['clean pizza box', 'accepted', 'R15'],
  ['Where can I recycle a clean office paper?', 'accepted', 'R01'],
  ['clean corrugated cardboard', 'accepted', 'R01'],
  ['an aluminium can', 'accepted', 'R05'],
  ['an aluminum can', 'accepted', 'R05'],
  ['clean plastic beverage bottle', 'accepted', 'R07'],
  ['clean plastic takeaway box', 'accepted', 'R07'],
  ['clean glass beverage bottle', 'accepted', 'R10'],
  ['clean glass sauce bottle', 'accepted', 'R10'],
  ['clean milk carton', 'accepted', 'R09'],
  ['clean paper cup', 'accepted', 'R09'],
  ['clean takeaway coffee cup', 'separate', 'R16'],
  ['clean personal care container', 'separate', 'R19'],
  ['clean contact lens packaging', 'separate', 'R18'],
  ['napkins', 'not_accepted', 'R02'],
  ['wax paper', 'not_accepted', 'R03'],
  ['toothpaste tube', 'not_accepted', 'R08'],
  ['single-use battery', 'not_accepted', 'R13'],
  ['baking paper', 'not_accepted', 'R17'],
  ['foil-lined snack packaging', 'not_accepted', 'R22'],
  ['laboratory chemical waste in a plastic bottle', 'refer', 'S07'],
  ['radioactive glass bottle', 'refer', 'S07'],
  ['damaged rechargeable battery', 'refer', 'R14'],
  ['Where can I recycle a battery?', 'clarify'],
  ['a rechargeable battery', 'clarify'],
  ['portable household rechargeable battery', 'clarify'],
  ['intact portable household rechargeable battery', 'accepted', 'R12'],
  ['Where can I recycle a plastic bottle?', 'clarify'],
  ['Where can I recycle a water bottle?', 'clarify'],
  ['Which bin accepts a bottle?', 'clarify'],
  ['pizza box', 'clarify'],
  ['dirty pizza box', 'not_accepted', 'R04'],
  ['not a clean pizza box', 'not_accepted', 'R04'],
  ['dirty plastic bottle', 'clarify'],
  ['clean plastic bottle with metal parts', 'clarify'],
  ['clean broken glass bottle', 'unknown'],
  ['clean coffee cup with coffee inside', 'clarify'],
  ['clean pizza box and aluminium can', 'clarify'],
  ['clean pizza box and a battery', 'clarify'],
  ['clean and empty plastic bottle', 'accepted', 'R07'],
  ['empty plastic bottle', 'clarify'],
  ['plastic bottle is not clean', 'clarify'],
  ['clean plastic bottle that is not empty', 'clarify'],
  ['it is not a plastic bottle but it is clean', 'clarify'],
  ['a clean plastic bottle at Centennial Campus', 'out_of_scope', 'S01'],
  ['a clean glass bottle in a smart bin', 'out_of_scope', 'S01'],
  ['clean pizza box at the library', 'out_of_scope', 'S01'],
  ['aluminium foil bag during collection week', 'out_of_scope', 'S06'],
  ['Where is re Kiosk?', 'information', 'S01'],
  ['What does re Kiosk accept?', 'information', 'S01'],
  ['Where can I recycle this?', 'unknown'],
  ['Can I recycle a ceramic mug?', 'unknown'],
  ['', 'clarify'],
  ['x'.repeat(601), 'clarify'],
];

for (const [query,status,evidence] of cases) {
  test(`${JSON.stringify(query.slice(0, 80))} -> ${status}`, () => {
    const result = answer(query);
    assert.equal(result.status, status);
    if (evidence) assert.ok(result.citations.some(c => c.ruleId === evidence || c.id === evidence), `Expected evidence ${evidence}`);
    for (const citation of result.citations) {
      const source = catalog.sources.find(s => s.id === citation.id);
      assert.ok(source, 'Citation must exist in the reviewed catalog');
      assert.equal(citation.url, source.url);
      assert.ok(citation.locator);
    }
  });
}

test('A condition clarification can be completed in both directions', () => {
  const initial = answer('pizza box');
  assert.equal(initial.choices.length, 2);
  const yes = initial.choices.find(c => c.cleanliness === 'clean');
  const no = initial.choices.find(c => c.cleanliness === 'dirty');
  assert.equal(answer(yes.query, yes).status, 'accepted');
  assert.equal(answer(no.query, no).status, 'not_accepted');
});

test('A generic battery query can be clarified without guessing its type or condition', () => {
  const initial = answer('battery');
  const type = initial.choices.find(c => c.label.startsWith('Portable'));
  const followup = answer(type.query);
  assert.equal(followup.status, 'clarify');
  assert.equal(answer(followup.choices[0].query).status, 'accepted');
});

test('Coffee-cup components come directly from the cited rule', () => {
  assert.deepEqual(answer('clean coffee cup').steps, knowledge.rules.find(r => r.id === 'R16').conditions);
});

test('Contradictory dirty text takes priority over a clean UI choice', () => {
  assert.equal(answer('dirty pizza box', {cleanliness:'clean'}).status, 'not_accepted');
});

test('Unknown and excluded items are never automatically assigned to general waste', () => {
  for (const query of ['ceramic mug', 'wax paper', 'toothpaste tube']) {
    const result = answer(query);
    assert.notEqual(result.status, 'accepted');
    assert.equal(result.category, undefined);
  }
});

test('Untrusted HTML is returned only as data, never executable markup', () => {
  const result = answer('<script>alert(1)</script> pizza box');
  assert.equal(result.status, 'clarify');
  assert.equal(result.choices[0].query, '<script>alert(1)</script> pizza box');
  // The UI displays all input-derived text through textContent.
});
