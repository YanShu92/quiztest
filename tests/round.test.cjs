const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const source = fs.readFileSync('pages/host.js', 'utf8');
const body = source.split('const triggerReveal = useCallback')[1].split('(data) => {')[1].split('\n      },')[0];
const reveal = new Function('data', 'startTime', body);
const game = () => ({ status: 'question', currentQuestion: { startTime: 1000, number: 1, questionData: { question: 'Test', answer: 'A' } }, teams: Object.fromEntries([1,2,3,4].map(n => [`slot${n}`, {name: `Team ${n}`, slot: n-1, score: 5}])), answers: { slot1: {answer: 'A', responseTime: 0}, slot2: {answer: 'A', responseTime: 2}, slot3: {answer: 'B', responseTime: 1} } });
test('All teams included, unanswered result serializable, fastest correct answer wins', () => {
 const original = game(); const result = reveal(original, 1000);
 assert.deepEqual(result.history[0].results.map(r => r.points), [10,9,0,0]);
 assert.equal(result.history[0].results[3].correct, false);
 assert.equal(result.history[0].results[3].answer, null);
 assert.equal(result.teams.slot1.score, 15);
 assert.equal(original.teams.slot1.score, 5);
 assert.equal(result.usedQuestions[1], true);
 assert.equal(result.status, 'reveal');
 assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
});
test('Repeated reveal and stale round cannot score again', () => {
 assert.equal(reveal(reveal(game(),1000),1000), undefined);
 assert.equal(reveal(game(),2000), undefined);
});
test('No answers still produces four zero-point results', () => {
 const data = game(); delete data.answers;
 assert.deepEqual(reveal(data,1000).history[0].results.map(r => r.points), [0,0,0,0]);
});

const shuffleSource = fs.readFileSync('lib/shuffleQuiz.js', 'utf8').replace('export function', 'function');
const shuffleQuiz = new Function(`${shuffleSource}; return shuffleQuiz;`)();
test('Combined A/B/C answer stays at D while other options shuffle and grading follows the correct option', () => {
 const question = {id: 1, options: {A: 'One', B: 'Two', C: 'Three', D: 'Cả A, B và C'}, answer: 'D'};
 const result = shuffleQuiz([question], () => 0)[0];
 assert.equal(result.options.D, 'Cả A, B và C');
 assert.equal(result.answer, 'D');
 assert.deepEqual([result.options.A, result.options.B, result.options.C], ['Two', 'Three', 'One']);
 const otherCorrect = shuffleQuiz([{...question, answer: 'B'}], () => 0)[0];
 assert.equal(otherCorrect.options[otherCorrect.answer], 'Two');
 const previouslyShuffled = {...question, options: {A: 'Cả A, B và C', B: 'One', C: 'Two', D: 'Three'}, answer: 'A'};
 const restored = shuffleQuiz([previouslyShuffled], () => 0)[0];
 assert.equal(restored.options.D, 'Cả A, B và C');
 assert.equal(restored.answer, 'D');
});
test('Shuffling preserves every question and correct answer text without mutating originals', () => {
 const input = Array.from({length: 10}, (_, id) => ({id, question: `Q${id}`, options: {A: 'One', B: 'Two', C: 'Three', D: 'Four'}, answer: 'C'}));
 const before = JSON.stringify(input);
 const deck = shuffleQuiz(input, () => 0);
 assert.deepEqual(deck.map(q => q.id).sort((a,b) => a-b), input.map(q => q.id));
 assert.notDeepEqual(deck.map(q => q.id), input.map(q => q.id));
 deck.forEach(q => { assert.equal(q.options[q.answer], 'Three'); assert.deepEqual(Object.values(q.options).sort(), ['Four','One','Three','Two']); });
 assert.equal(JSON.stringify(input), before);
});

const readySource = fs.readFileSync('lib/roundReady.js', 'utf8').replace('export function', 'function');
const roundReady = new Function(`${readySource}; return roundReady;`)();
test('Timer waits for every team to acknowledge the same round and ignores stale acknowledgements', () => {
 const data = {status: 'syncing', currentQuestion: {roundId: 'new'}, teams: {slot1: {name: 'One'}, slot2: {name: 'Two'}}, ready: {slot1: 'new', slot2: 'old'}};
 assert.equal(roundReady(data, 'new'), false);
 data.ready.slot2 = 'new';
 assert.equal(roundReady(data, 'new'), true);
 assert.equal(roundReady(data, 'old'), false);
 data.status = 'question';
 assert.equal(roundReady(data, 'new'), false);
});
