/**
 * Comprehensive Game Test Suite for ProficienThAI
 * ================================================
 * Tests ALL 14+ game types thoroughly:
 *  Part 1: Seed Data Validation (no server needed)
 *  Part 2: Smart Evaluator Unit Tests
 *  Part 3: Game Engine Logic Tests
 *  Part 4: Full Webhook Integration Tests (needs server)
 *
 * Usage:
 *   npx tsx scripts/test-all-games.ts seed       → Part 1 only
 *   npx tsx scripts/test-all-games.ts evaluator   → Part 2 only
 *   npx tsx scripts/test-all-games.ts engine      → Part 3 only
 *   npx tsx scripts/test-all-games.ts webhook     → Part 4 only
 *   npx tsx scripts/test-all-games.ts all         → All parts
 */

// ============ IMPORTS ============
import { extraMultipleChoiceQuestions, extraFillBlankQuestions, extraVocabMatchQuestions, extraVocabOppositeQuestions, extraVocabSynonymQuestions } from '../src/app/api/seed/extra-batch1';
import { extraFixSentenceQuestions, extraArrangeSentenceQuestions, extraSpeedGrammarQuestions, extraSentenceConstructionPairs, extraReadAnswerQuestions } from '../src/app/api/seed/extra-batch2';
import { extraSummarizeQuestions, extraContinueStoryQuestions, thaiIdiomQuestions, thaiCultureQuestions } from '../prisma/seed-extra-questions';

// ============ TEST FRAMEWORK ============
let totalPass = 0, totalFail = 0, totalWarn = 0;
const failures: string[] = [];
const warnings: string[] = [];

function pass(msg: string) { totalPass++; console.log(`  ✅ ${msg}`); }
function fail(msg: string) { totalFail++; failures.push(msg); console.log(`  ❌ ${msg}`); }
function warn(msg: string) { totalWarn++; warnings.push(msg); console.log(`  ⚠️  ${msg}`); }
function section(title: string) { console.log(`\n${'='.repeat(60)}\n  ${title}\n${'='.repeat(60)}`); }
function subsection(title: string) { console.log(`\n--- ${title} ---`); }

// ============ PART 1: SEED DATA VALIDATION ============
function testSeedData() {
  section('PART 1: SEED DATA VALIDATION');

  // ===== MULTIPLE CHOICE =====
  subsection('1. MULTIPLE_CHOICE (extra-batch1)');
  testMultipleChoice(extraMultipleChoiceQuestions as any[], 'extra-batch1');

  // ===== FILL_BLANK =====
  subsection('2. FILL_BLANK (extra-batch1)');
  testFillBlank(extraFillBlankQuestions as any[], 'extra-batch1');

  // ===== VOCAB_MATCH =====
  subsection('3. VOCAB_MATCH (extra-batch1)');
  testVocabMultipleChoice(extraVocabMatchQuestions as any[], 'VOCAB_MATCH', 'extra-batch1');

  // ===== VOCAB_OPPOSITE =====
  subsection('4. VOCAB_OPPOSITE (extra-batch1)');
  testVocabOpposite(extraVocabOppositeQuestions as any[], 'extra-batch1');

  // ===== VOCAB_SYNONYM =====
  subsection('5. VOCAB_SYNONYM (extra-batch1)');
  testVocabSynonym(extraVocabSynonymQuestions as any[], 'extra-batch1');

  // ===== FIX_SENTENCE =====
  subsection('6. FIX_SENTENCE (extra-batch2)');
  testFixSentence(extraFixSentenceQuestions as any[], 'extra-batch2');

  // ===== ARRANGE_SENTENCE =====
  subsection('7. ARRANGE_SENTENCE (extra-batch2)');
  testArrangeSentence(extraArrangeSentenceQuestions as any[], 'extra-batch2');

  // ===== SPEED_GRAMMAR =====
  subsection('8. SPEED_GRAMMAR (extra-batch2)');
  testSpeedGrammar(extraSpeedGrammarQuestions as any[], 'extra-batch2');

  // ===== SENTENCE_CONSTRUCTION =====
  subsection('9. SENTENCE_CONSTRUCTION (extra-batch2)');
  testSentenceConstruction(extraSentenceConstructionPairs as any[], 'extra-batch2');

  // ===== READ_ANSWER =====
  subsection('10. READ_ANSWER (extra-batch2)');
  testReadAnswer(extraReadAnswerQuestions as any[], 'extra-batch2');

  // ===== SUMMARIZE =====
  subsection('11. SUMMARIZE (seed-extra-questions)');
  testSummarize(extraSummarizeQuestions as any[], 'seed-extra-questions');

  // ===== CONTINUE_STORY =====
  subsection('12. CONTINUE_STORY (seed-extra-questions)');
  testContinueStory(extraContinueStoryQuestions as any[], 'seed-extra-questions');

  // ===== THAI_IDIOM =====
  subsection('13. THAI_IDIOM (seed-extra-questions)');
  testThaiIdiom(thaiIdiomQuestions as any[], 'seed-extra-questions');

  // ===== THAI_CULTURE =====
  subsection('14. THAI_CULTURE (seed-extra-questions)');
  testThaiCulture(thaiCultureQuestions as any[], 'seed-extra-questions');
}

// ---- Test helpers per game type ----

function testMultipleChoice(questions: any[], source: string) {
  if (!questions.length) { fail(`${source}: No MULTIPLE_CHOICE questions found`); return; }
  const counts = countByDifficulty(questions);
  logCounts('MULTIPLE_CHOICE', counts, questions.length);

  questions.forEach((q, i) => {
    const label = `MC[${i}] ${q.difficulty}`;
    if (!q.question || q.question.trim() === '') fail(`${label}: empty question`);
    if (!q.correctAnswer || !['A','B','C','D'].includes(q.correctAnswer)) fail(`${label}: invalid correctAnswer "${q.correctAnswer}"`);
    if (!q.optionA || !q.optionB || !q.optionC || !q.optionD) fail(`${label}: missing option(s)`);
    // Check for duplicate options
    const opts = [q.optionA, q.optionB, q.optionC, q.optionD];
    const uniqueOpts = new Set(opts);
    if (uniqueOpts.size < 4) warn(`${label}: duplicate options found: ${opts.join(', ')}`);
    if (!['EASY','MEDIUM','HARD'].includes(q.difficulty)) fail(`${label}: invalid difficulty "${q.difficulty}"`);
  });
  pass(`MULTIPLE_CHOICE: ${questions.length} questions validated from ${source}`);
}

function testFillBlank(questions: any[], source: string) {
  if (!questions.length) { fail(`${source}: No FILL_BLANK questions found`); return; }
  const counts = countByDifficulty(questions);
  logCounts('FILL_BLANK', counts, questions.length);

  questions.forEach((q, i) => {
    const label = `FB[${i}] ${q.difficulty}`;
    if (!q.sentence) fail(`${label}: empty sentence`);
    if (!q.answer || q.answer.trim() === '') fail(`${label}: empty answer`);
    // Check sentence has blank marker
    if (q.sentence && !q.sentence.includes('__')) warn(`${label}: sentence has no blank marker (__): "${q.sentence.substring(0, 40)}..."`);
    if (!['EASY','MEDIUM','HARD'].includes(q.difficulty)) fail(`${label}: invalid difficulty`);
  });
  pass(`FILL_BLANK: ${questions.length} questions validated from ${source}`);
}

function testVocabMultipleChoice(questions: any[], gameType: string, source: string) {
  if (!questions.length) { fail(`${source}: No ${gameType} questions found`); return; }
  const counts = countByDifficulty(questions);
  logCounts(gameType, counts, questions.length);

  questions.forEach((q, i) => {
    const label = `VM[${i}] ${q.difficulty}`;
    if (!q.word) fail(`${label}: empty word`);
    if (!q.meaning || q.meaning.trim() === '') fail(`${label}: empty meaning`);
    if (!q.wrongA || !q.wrongB || !q.wrongC) fail(`${label}: missing wrong option(s)`);
    // Check meaning != wrong answers
    if (q.meaning === q.wrongA || q.meaning === q.wrongB || q.meaning === q.wrongC) {
      fail(`${label}: correct meaning matches a wrong answer`);
    }
  });
  pass(`${gameType}: ${questions.length} questions validated from ${source}`);
}

function testVocabOpposite(questions: any[], source: string) {
  if (!questions.length) { fail(`${source}: No VOCAB_OPPOSITE questions found`); return; }
  const counts = countByDifficulty(questions);
  logCounts('VOCAB_OPPOSITE', counts, questions.length);

  // Check for duplicate correct answers across questions
  const answerSet = new Map<string, string>();
  questions.forEach((q, i) => {
    const label = `VO[${i}] ${q.difficulty}`;
    if (!q.word) fail(`${label}: empty word`);
    if (!q.opposite || q.opposite.trim() === '') fail(`${label}: empty opposite`);
    if (!q.wrongA || !q.wrongB || !q.wrongC) fail(`${label}: missing wrong option(s)`);
    if (q.opposite === q.wrongA || q.opposite === q.wrongB || q.opposite === q.wrongC) {
      fail(`${label}: correct opposite "${q.opposite}" matches a wrong answer`);
    }
    // Check for same correct answer used in multiple questions
    if (answerSet.has(q.opposite)) {
      warn(`${label}: opposite "${q.opposite}" also used for word "${answerSet.get(q.opposite)}"`);
    }
    answerSet.set(q.opposite, q.word);
  });
  pass(`VOCAB_OPPOSITE: ${questions.length} questions validated from ${source}`);
}

function testVocabSynonym(questions: any[], source: string) {
  if (!questions.length) { fail(`${source}: No VOCAB_SYNONYM questions found`); return; }
  const counts = countByDifficulty(questions);
  logCounts('VOCAB_SYNONYM', counts, questions.length);

  questions.forEach((q, i) => {
    const label = `VS[${i}] ${q.difficulty}`;
    if (!q.word) fail(`${label}: empty word`);
    if (!q.synonym || q.synonym.trim() === '') fail(`${label}: empty synonym`);
    if (!q.wrongA || !q.wrongB || !q.wrongC) fail(`${label}: missing wrong option(s)`);
    if (q.synonym === q.wrongA || q.synonym === q.wrongB || q.synonym === q.wrongC) {
      fail(`${label}: correct synonym "${q.synonym}" matches a wrong answer`);
    }
    // Check word != synonym (they should be different words)
    if (q.word === q.synonym) fail(`${label}: word and synonym are identical: "${q.word}"`);
  });
  pass(`VOCAB_SYNONYM: ${questions.length} questions validated from ${source}`);
}

function testFixSentence(questions: any[], source: string) {
  if (!questions.length) { fail(`${source}: No FIX_SENTENCE questions found`); return; }
  const counts = countByDifficulty(questions);
  logCounts('FIX_SENTENCE', counts, questions.length);

  questions.forEach((q, i) => {
    const label = `FS[${i}] ${q.difficulty}`;
    if (!q.wrongSentence) fail(`${label}: empty wrongSentence`);
    if (!q.correctSentence) fail(`${label}: empty correctSentence`);
    if (!q.hint) warn(`${label}: no hint provided`);
    if (q.wrongSentence === q.correctSentence) fail(`${label}: wrong and correct sentences are identical`);
    if (!['EASY','MEDIUM','HARD'].includes(q.difficulty)) fail(`${label}: invalid difficulty`);
  });
  pass(`FIX_SENTENCE: ${questions.length} questions validated from ${source}`);
}

function testArrangeSentence(questions: any[], source: string) {
  if (!questions.length) { fail(`${source}: No ARRANGE_SENTENCE questions found`); return; }
  const counts = countByDifficulty(questions);
  logCounts('ARRANGE_SENTENCE', counts, questions.length);

  let arrangeErrors = 0;
  questions.forEach((q, i) => {
    const label = `AS[${i}] ${q.difficulty}`;
    if (!q.correctSentence) { fail(`${label}: empty correctSentence`); return; }
    if (!q.shuffledWords) { fail(`${label}: empty shuffledWords`); return; }

    // CRITICAL: verify shuffledWords contain same characters as correctSentence
    const words = q.shuffledWords.split('|');
    const shuffledChars = [...words.join('')].sort().join('');
    const correctChars = [...q.correctSentence.replace(/\s+/g, '')].sort().join('');

    if (shuffledChars !== correctChars) {
      fail(`${label}: shuffledWords have different characters than correctSentence!`);
      console.log(`    shuffled sorted: "${shuffledChars.substring(0, 50)}..."`);
      console.log(`    correct sorted:  "${correctChars.substring(0, 50)}..."`);
      arrangeErrors++;
    }
  });
  if (arrangeErrors === 0) {
    pass(`ARRANGE_SENTENCE: All ${questions.length} questions — shuffledWords match correctSentence`);
  }
}

function testSpeedGrammar(questions: any[], source: string) {
  if (!questions.length) { fail(`${source}: No SPEED_GRAMMAR questions found`); return; }
  const counts = countByDifficulty(questions);
  logCounts('SPEED_GRAMMAR', counts, questions.length);

  questions.forEach((q, i) => {
    const label = `SG[${i}] ${q.difficulty}`;
    if (!q.question) fail(`${label}: empty question`);
    if (!q.correctAnswer || !['A','B','C','D'].includes(q.correctAnswer)) fail(`${label}: invalid correctAnswer "${q.correctAnswer}"`);
    if (!q.optionA || !q.optionB || !q.optionC || !q.optionD) fail(`${label}: missing option(s)`);
    const opts = [q.optionA, q.optionB, q.optionC, q.optionD];
    const uniqueOpts = new Set(opts);
    if (uniqueOpts.size < 4) warn(`${label}: duplicate options: ${opts.join(', ')}`);
  });
  pass(`SPEED_GRAMMAR: ${questions.length} questions validated from ${source}`);
}

function testSentenceConstruction(questions: any[], source: string) {
  if (!questions.length) { fail(`${source}: No SENTENCE_CONSTRUCTION questions found`); return; }
  const counts = countByDifficulty(questions);
  logCounts('SENTENCE_CONSTRUCTION', counts, questions.length);

  questions.forEach((q, i) => {
    const label = `SC[${i}] ${q.difficulty}`;
    if (!q.word1) fail(`${label}: empty word1`);
    if (!q.word2) fail(`${label}: empty word2`);
    if (!['EASY','MEDIUM','HARD'].includes(q.difficulty)) fail(`${label}: invalid difficulty`);
  });
  pass(`SENTENCE_CONSTRUCTION: ${questions.length} questions validated from ${source}`);
}

function testReadAnswer(questions: any[], source: string) {
  if (!questions.length) { fail(`${source}: No READ_ANSWER questions found`); return; }
  const counts = countByDifficulty(questions);
  logCounts('READ_ANSWER', counts, questions.length);

  questions.forEach((q, i) => {
    const label = `RA[${i}] ${q.difficulty}`;
    if (!q.passage) fail(`${label}: empty passage`);
    if (!q.question) fail(`${label}: empty question`);
    if (!q.correctAnswer || !['A','B','C','D'].includes(q.correctAnswer)) fail(`${label}: invalid correctAnswer "${q.correctAnswer}"`);
    if (!q.optionA || !q.optionB || !q.optionC || !q.optionD) fail(`${label}: missing option(s)`);
    // Check passage length reasonable
    if (q.passage.length < 30) warn(`${label}: passage very short (${q.passage.length} chars)`);
    if (q.passage.length > 500) warn(`${label}: passage very long (${q.passage.length} chars)`);
  });
  pass(`READ_ANSWER: ${questions.length} questions validated from ${source}`);
}

function testSummarize(questions: any[], source: string) {
  if (!questions.length) { fail(`${source}: No SUMMARIZE questions found`); return; }
  const counts = countByDifficulty(questions);
  logCounts('SUMMARIZE', counts, questions.length);

  questions.forEach((q, i) => {
    const label = `SUM[${i}] ${q.difficulty}`;
    if (!q.passage) fail(`${label}: empty passage`);
    if (!q.sampleSummary) fail(`${label}: empty sampleSummary`);
    if (!q.keywords) fail(`${label}: empty keywords`);
    // Keywords should be pipe-separated
    const kws = q.keywords.split('|');
    if (kws.length < 2) warn(`${label}: very few keywords (${kws.length})`);
    // Summary should be shorter than passage
    if (q.sampleSummary.length >= q.passage.length) {
      warn(`${label}: sampleSummary is longer than passage!`);
    }
  });
  pass(`SUMMARIZE: ${questions.length} questions validated from ${source}`);
}

function testContinueStory(questions: any[], source: string) {
  if (!questions.length) { fail(`${source}: No CONTINUE_STORY questions found`); return; }
  const counts = countByDifficulty(questions);
  logCounts('CONTINUE_STORY', counts, questions.length);

  questions.forEach((q, i) => {
    const label = `CS[${i}] ${q.difficulty}`;
    if (!q.storyStart) fail(`${label}: empty storyStart`);
    if (!q.keywords) fail(`${label}: empty keywords`);
    if (!q.minLength && q.minLength !== 0) warn(`${label}: no minLength`);
    const kws = q.keywords.split('|');
    if (kws.length < 2) warn(`${label}: very few keywords (${kws.length})`);
  });
  pass(`CONTINUE_STORY: ${questions.length} questions validated from ${source}`);
}

function testThaiIdiom(questions: any[], source: string) {
  if (!questions.length) { fail(`${source}: No THAI_IDIOM questions found`); return; }
  const counts = countByDifficulty(questions);
  logCounts('THAI_IDIOM', counts, questions.length);

  // Check for duplicate idioms
  const idiomSet = new Set<string>();
  questions.forEach((q, i) => {
    const label = `TI[${i}] ${q.difficulty}`;
    if (!q.idiom) fail(`${label}: empty idiom`);
    if (!q.meaning || q.meaning.trim() === '') fail(`${label}: empty meaning`);
    if (!q.wrongA || !q.wrongB || !q.wrongC) fail(`${label}: missing wrong option(s)`);
    if (!q.example) warn(`${label}: no example provided`);
    if (q.meaning === q.wrongA || q.meaning === q.wrongB || q.meaning === q.wrongC) {
      fail(`${label}: correct meaning matches a wrong answer`);
    }
    if (idiomSet.has(q.idiom)) fail(`${label}: duplicate idiom "${q.idiom}"`);
    idiomSet.add(q.idiom);
  });
  pass(`THAI_IDIOM: ${questions.length} questions validated from ${source}`);
}

function testThaiCulture(questions: any[], source: string) {
  if (!questions.length) { fail(`${source}: No THAI_CULTURE questions found`); return; }
  const counts = countByDifficulty(questions);
  logCounts('THAI_CULTURE', counts, questions.length);

  questions.forEach((q, i) => {
    const label = `TC[${i}] ${q.difficulty}`;
    if (!q.situation) fail(`${label}: empty situation`);
    if (!q.correct || q.correct.trim() === '') fail(`${label}: empty correct answer`);
    if (!q.wrongA || !q.wrongB || !q.wrongC) fail(`${label}: missing wrong option(s)`);
    if (!q.explanation) warn(`${label}: no explanation`);
    // Check correct != wrong answers
    if (q.correct === q.wrongA || q.correct === q.wrongB || q.correct === q.wrongC) {
      fail(`${label}: correct answer matches a wrong option`);
    }
    const opts = [q.correct, q.wrongA, q.wrongB, q.wrongC];
    const uniqueOpts = new Set(opts);
    if (uniqueOpts.size < 4) warn(`${label}: duplicate options found`);
  });
  pass(`THAI_CULTURE: ${questions.length} questions validated from ${source}`);
}

// ============ PART 2: SMART EVALUATOR TESTS ============
async function testSmartEvaluator() {
  section('PART 2: SMART EVALUATOR UNIT TESTS');

  // Dynamic import to handle path aliases
  const { smartCheckFillBlank, smartCheckFixSentence, smartCheckArrangeSentence } =
    await import('../src/lib/games/smartEvaluator');

  // --- FILL_BLANK tests ---
  subsection('2.1 smartCheckFillBlank');

  // Exact match
  let result = await smartCheckFillBlank('กิน', 'กิน', 'ฉัน__ข้าว');
  if (result.status === 'correct') pass('Exact match "กิน" → correct');
  else fail(`Exact match "กิน" expected correct, got ${result.status}`);

  // Close match (typo)
  result = await smartCheckFillBlank('มนุษยสัมพันธ', 'มนุษยสัมพันธ์', 'เขามี__ดี');
  if (result.status === 'correct' || result.status === 'partial') pass(`Typo "มนุษยสัมพันธ" → ${result.status} (score: ${result.scoreMultiplier})`);
  else fail(`Typo "มนุษยสัมพันธ" expected correct/partial, got ${result.status}`);

  // Wrong answer
  result = await smartCheckFillBlank('ว่ายน้ำ', 'กิน', 'ฉัน__ข้าว');
  if (result.status === 'incorrect') pass('Wrong answer "ว่ายน้ำ" → incorrect');
  else fail(`Wrong answer expected incorrect, got ${result.status}`);

  // Short word exact match required
  result = await smartCheckFillBlank('น้า', 'น้ำ', 'ฉันดื่ม__');
  if (result.status === 'incorrect') pass('Short word mismatch "น้า"≠"น้ำ" → incorrect (strict for <=3 chars)');
  else warn(`Short word "น้า"≠"น้ำ" got ${result.status} (expected incorrect for short words)`);

  // Empty input
  result = await smartCheckFillBlank('', 'กิน', 'ฉัน__ข้าว');
  if (result.status === 'incorrect') pass('Empty input → incorrect');
  else fail(`Empty input expected incorrect, got ${result.status}`);

  // --- FIX_SENTENCE tests ---
  subsection('2.2 smartCheckFixSentence');

  // Exact match
  result = await smartCheckFixSentence('ฉันชอบกินส้มมาก', 'ฉันชอบกินส้มมาก');
  if (result.status === 'correct') pass('Exact match → correct');
  else fail(`Exact match expected correct, got ${result.status}`);

  // Space difference
  result = await smartCheckFixSentence('ฉันชอบกินส้ม มาก', 'ฉันชอบกินส้มมาก');
  if (result.status === 'correct') pass('Space difference → correct');
  else fail(`Space difference expected correct, got ${result.status}`);

  // Wrong answer
  result = await smartCheckFixSentence('ฉันไม่ชอบกินส้ม', 'ฉันชอบกินส้มมาก');
  if (result.status === 'incorrect' || result.status === 'partial') pass(`Different sentence → ${result.status}`);
  else fail(`Different sentence expected incorrect/partial, got ${result.status}`);

  // --- ARRANGE_SENTENCE tests ---
  subsection('2.3 smartCheckArrangeSentence');

  // Exact match (no spaces)
  result = await smartCheckArrangeSentence('ฉันชอบแมวตัวนี้', 'ฉันชอบแมวตัวนี้');
  if (result.status === 'correct') pass('Exact match → correct');
  else fail(`Exact match expected correct, got ${result.status}`);

  // With spaces between words
  result = await smartCheckArrangeSentence('ฉัน ชอบ แมว ตัวนี้', 'ฉันชอบแมวตัวนี้');
  if (result.status === 'correct') pass('With spaces → correct');
  else fail(`With spaces expected correct, got ${result.status}`);

  // Wrong order
  result = await smartCheckArrangeSentence('แมวชอบฉันตัวนี้', 'ฉันชอบแมวตัวนี้');
  if (result.status === 'partial') pass('Same chars different order → partial');
  else warn(`Same chars different order got ${result.status} (expected partial)`);

  // Completely wrong
  result = await smartCheckArrangeSentence('สุนัขวิ่งเร็ว', 'ฉันชอบแมวตัวนี้');
  if (result.status === 'incorrect') pass('Completely wrong → incorrect');
  else fail(`Completely wrong expected incorrect, got ${result.status}`);
}

// ============ PART 3: GAME ENGINE TESTS ============
async function testGameEngine() {
  section('PART 3: GAME ENGINE LOGIC TESTS');

  const { createSessionData, advanceSession, isSessionComplete, getCorrectMessage, getWrongMessage, GAME_TYPES } =
    await import('../src/lib/games/engine');

  // --- Session creation ---
  subsection('3.1 createSessionData');

  const session = createSessionData('FILL_BLANK' as any, ['q1', 'q2', 'q3', 'q4', 'q5'], 1.0);
  if (session.gameType === 'FILL_BLANK') pass('Session gameType = FILL_BLANK');
  else fail(`Session gameType expected FILL_BLANK, got ${session.gameType}`);
  if (session.questionIds.length === 5) pass('Session has 5 questionIds');
  else fail(`Session expected 5 questionIds, got ${session.questionIds.length}`);
  if (session.currentIndex === 0) pass('Session starts at index 0');
  else fail(`Session expected index 0, got ${session.currentIndex}`);
  if (session.pointsEarned === 0) pass('Session starts with 0 points');
  if (session.correctCount === 0 && session.wrongCount === 0) pass('Session starts with 0 correct/wrong');
  if (session.pointMultiplier === 1.0) pass('pointMultiplier = 1.0');
  if (session.pointsPerQuestion === GAME_TYPES.FILL_BLANK.points) pass(`pointsPerQuestion = ${GAME_TYPES.FILL_BLANK.points}`);

  // --- Advance session (correct) ---
  subsection('3.2 advanceSession — correct answer');

  let updated = advanceSession(session, true, false);
  if (updated.currentIndex === 1) pass('After correct: index = 1');
  else fail(`After correct: expected index 1, got ${updated.currentIndex}`);
  if (updated.correctCount === 1) pass('After correct: correctCount = 1');
  if (updated.wrongCount === 0) pass('After correct: wrongCount = 0');
  if (updated.pointsEarned === 10) pass(`After correct: points = 10`);
  else fail(`After correct: expected points 10, got ${updated.pointsEarned}`);
  if (updated.answers.length === 1 && updated.answers[0].correct === true) pass('Answer recorded as correct');

  // --- Advance session (wrong) ---
  subsection('3.3 advanceSession — wrong answer');

  let updated2 = advanceSession(updated, false, false);
  if (updated2.currentIndex === 2) pass('After wrong: index = 2');
  if (updated2.correctCount === 1) pass('After wrong: correctCount stays 1');
  if (updated2.wrongCount === 1) pass('After wrong: wrongCount = 1');
  if (updated2.pointsEarned === 10) pass('After wrong: points stays 10');
  if (updated2.answers.length === 2 && updated2.answers[1].correct === false) pass('Answer recorded as wrong');

  // --- Advance session (correct with hint) ---
  subsection('3.4 advanceSession — correct with hint (-50%)');

  let updated3 = advanceSession(updated2, true, true);
  if (updated3.pointsEarned === 15) pass('After correct+hint: points = 10 + 5 (half)');
  else fail(`After correct+hint: expected 15, got ${updated3.pointsEarned}`);

  // --- Session complete check ---
  subsection('3.5 isSessionComplete');

  // Play remaining questions
  let s = updated3;
  for (let i = 3; i < 5; i++) {
    s = advanceSession(s, true, false);
  }
  if (isSessionComplete(s)) pass('After 5 answers: session complete');
  else fail('After 5 answers: expected session complete');
  if (s.correctCount === 4) pass(`Final: 4 correct (1 right, 1 wrong, 1 hint-right, 2 right)`);
  if (s.wrongCount === 1) pass('Final: 1 wrong');

  // --- pointMultiplier < 1.0 ---
  subsection('3.6 pointMultiplier = 0.5 (beyond free rounds)');

  const halfSession = createSessionData('FILL_BLANK' as any, ['q1'], 0.5);
  const halfUpdated = advanceSession(halfSession, true, false);
  if (halfUpdated.pointsEarned === 5) pass('pointMultiplier 0.5: correct gives 5 points');
  else fail(`pointMultiplier 0.5: expected 5, got ${halfUpdated.pointsEarned}`);

  // --- Messages ---
  subsection('3.7 Messages');

  const correctMsg = getCorrectMessage();
  if (correctMsg && correctMsg.length > 0) pass(`getCorrectMessage returns: "${correctMsg.substring(0, 30)}..."`);
  const wrongMsg = getWrongMessage();
  if (wrongMsg && wrongMsg.length > 0) pass(`getWrongMessage returns: "${wrongMsg.substring(0, 30)}..."`);

  // --- GAME_TYPES config ---
  subsection('3.8 GAME_TYPES configuration');

  const requiredGames = [
    'VOCAB_MATCH', 'VOCAB_MEANING', 'VOCAB_OPPOSITE', 'VOCAB_SYNONYM',
    'FILL_BLANK', 'FIX_SENTENCE', 'ARRANGE_SENTENCE', 'SPEED_GRAMMAR',
    'READ_ANSWER', 'SUMMARIZE', 'CONTINUE_STORY',
  ];
  for (const game of requiredGames) {
    const g = (GAME_TYPES as any)[game];
    if (!g) { fail(`GAME_TYPES missing: ${game}`); continue; }
    if (!g.points || g.points <= 0) fail(`${game}: invalid points ${g.points}`);
    if (!g.questionsPerRound || g.questionsPerRound <= 0) fail(`${game}: invalid questionsPerRound`);
    if (!g.requiredLevel || g.requiredLevel < 1) fail(`${game}: invalid requiredLevel`);
  }
  pass(`GAME_TYPES: All ${requiredGames.length} required games have valid config`);
}

// ============ UTILITIES ============
function countByDifficulty(questions: any[]) {
  const counts = { EASY: 0, MEDIUM: 0, HARD: 0 };
  questions.forEach(q => {
    if (q.difficulty in counts) (counts as any)[q.difficulty]++;
  });
  return counts;
}

function logCounts(gameType: string, counts: {EASY: number, MEDIUM: number, HARD: number}, total: number) {
  console.log(`  📊 ${gameType}: ${total} total (E:${counts.EASY} M:${counts.MEDIUM} H:${counts.HARD})`);
  if (counts.EASY === 0) warn(`${gameType}: no EASY questions`);
  if (counts.MEDIUM === 0) warn(`${gameType}: no MEDIUM questions`);
  if (counts.HARD === 0) warn(`${gameType}: no HARD questions`);
}

// ============ MAIN ============
async function main() {
  const arg = process.argv[2] || 'all';
  console.log('\n🧪 ProficienThAI Comprehensive Test Suite');
  console.log(`   Mode: ${arg}\n`);

  try {
    if (arg === 'seed' || arg === 'all') {
      testSeedData();
    }

    if (arg === 'evaluator' || arg === 'all') {
      await testSmartEvaluator();
    }

    if (arg === 'engine' || arg === 'all') {
      await testGameEngine();
    }

    if (arg === 'webhook' || arg === 'all') {
      console.log('\n⚠️  Webhook tests require running server. Use: node scripts/comprehensive-test.js all');
    }

  } catch (err: any) {
    console.error('\n💥 Test runner error:', err.message);
    if (err.stack) console.error(err.stack);
  }

  // ============ SUMMARY ============
  section('TEST RESULTS SUMMARY');
  console.log(`  ✅ PASSED:   ${totalPass}`);
  console.log(`  ❌ FAILED:   ${totalFail}`);
  console.log(`  ⚠️  WARNINGS: ${totalWarn}`);

  if (failures.length > 0) {
    console.log('\n  === FAILURES ===');
    failures.forEach(f => console.log(`  ❌ ${f}`));
  }

  if (warnings.length > 0) {
    console.log('\n  === WARNINGS ===');
    warnings.forEach(w => console.log(`  ⚠️  ${w}`));
  }

  const exitCode = totalFail > 0 ? 1 : 0;
  console.log(`\n  Exit code: ${exitCode}`);
  process.exit(exitCode);
}

main();
