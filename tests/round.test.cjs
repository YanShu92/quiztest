const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const source = fs.readFileSync('pages/host.js', 'utf8');
const body = source.split('const triggerReveal = useCallback')[1].split('(data) => {')[1].split('\n      },')[0];
const reveal = new Function('data', 'startTime', body);
const game = () => ({ status: 'question', currentQuestion: { startTime: 1000, number: 1, questionData: { question: 'Test', answer: 'A' } }, teams: Object.fromEntries([1,2,3,4].map(n => [`slot${n}`, {name: `Team ${n}`, slot: n-1, score: 5}])), answers: { slot1: {answer: 'A', responseTime: 0}, slot2: {answer: 'A', responseTime: 2}, slot3: {answer: 'B', responseTime: 1} } });
test('Host always selects questions directly from the original ordered bank', () => {
 assert.match(source, /questionData: questions\[qNumber - 1\]/);
 assert.doesNotMatch(source, /shuffleQuiz/);
});
test('Host prepares audio from the question-selection click and plays once at timeout', () => {
 assert.match(source, /prepareAudio\(\)/);
 assert.match(source, /remaining <= 0[\s\S]*playTimeUpSound\(gameState\.currentQuestion\.roundId\)/);
 assert.match(source, /soundRoundRef\.current === roundId/);
});
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
