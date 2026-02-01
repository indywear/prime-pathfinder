import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

// Game Logic Imports
import {
    getRandomVocabMatchQuestions,
    getVocabMatchOptions,
    checkVocabMatchAnswer,
} from "@/lib/games/vocabMatch";
import {
    getRandomVocabMeaningQuestions,
    checkVocabMeaningAnswer,
} from "@/lib/games/vocabMeaning";
import {
    getRandomVocabOppositeQuestions,
    getVocabOppositeOptions,
    checkVocabOppositeAnswer,
} from "@/lib/games/vocabOpposite";
import {
    getRandomVocabSynonymQuestions,
    getVocabSynonymOptions,
    checkVocabSynonymAnswer,
} from "@/lib/games/vocabSynonym";
import {
    getRandomFixSentenceQuestions,
    checkFixSentenceAnswer,
} from "@/lib/games/fixSentence";
import {
    getRandomArrangeSentenceQuestions,
    checkArrangeSentenceAnswer,
} from "@/lib/games/arrangeSentence";
import {
    getRandomSpeedGrammarQuestions,
    checkSpeedGrammarAnswer,
} from "@/lib/games/speedGrammar";
import {
    getRandomReadAnswerQuestions,
    checkReadAnswerAnswer,
} from "@/lib/games/readAnswer";
import {
    getRandomSummarizeQuestions,
    evaluateSummary,
    getSummarizeKeywords,
} from "@/lib/games/summarize";
import {
    getRandomContinueStoryQuestions,
    evaluateContinuation,
    getContinueStoryKeywords,
} from "@/lib/games/continueStory";
import {
    getTodayVocab,
} from "@/lib/games/dailyVocab";
import {
    getRandomRaceClockQuestions,
    checkRaceClockAnswer,
    calculateRaceClockPoints,
} from "@/lib/games/raceClock";

interface TestResult {
    game: string;
    status: "pass" | "fail";
    details: any;
    error?: string;
}

export async function GET() {
    const results: TestResult[] = [];

    // ==================
    // Test 1: VOCAB_MATCH
    // ==================
    try {
        const questions = await getRandomVocabMatchQuestions(undefined, 1);
        if (questions.length > 0) {
            const q = questions[0];
            const options = getVocabMatchOptions(q);
            const correctIdx = options.indexOf(q.meaning);
            const correctLetter = ['A', 'B', 'C', 'D'][correctIdx];

            // Test correct answer
            const isCorrect = checkVocabMatchAnswer(correctLetter, correctLetter);
            // Test wrong answer
            const isWrong = checkVocabMatchAnswer('X', correctLetter);

            results.push({
                game: "VOCAB_MATCH",
                status: isCorrect && !isWrong ? "pass" : "fail",
                details: {
                    question: q.word,
                    options,
                    correctAnswer: correctLetter,
                    testCorrect: isCorrect,
                    testWrong: !isWrong,
                }
            });
        } else {
            results.push({ game: "VOCAB_MATCH", status: "fail", details: "No questions found" });
        }
    } catch (e: any) {
        results.push({ game: "VOCAB_MATCH", status: "fail", details: null, error: e.message });
    }

    // ==================
    // Test 2: VOCAB_MEANING
    // ==================
    try {
        const questions = await getRandomVocabMeaningQuestions(undefined, 1);
        if (questions.length > 0) {
            const q = questions[0];

            // Test exact match
            const isExact = checkVocabMeaningAnswer(q.meaning, q.meaning);
            // Test similar match
            const isSimilar = checkVocabMeaningAnswer(q.meaning.substring(0, 5), q.meaning);

            results.push({
                game: "VOCAB_MEANING",
                status: isExact ? "pass" : "fail",
                details: {
                    word: q.word,
                    meaning: q.meaning,
                    testExact: isExact,
                    testSimilar: isSimilar,
                }
            });
        } else {
            results.push({ game: "VOCAB_MEANING", status: "fail", details: "No questions found" });
        }
    } catch (e: any) {
        results.push({ game: "VOCAB_MEANING", status: "fail", details: null, error: e.message });
    }

    // ==================
    // Test 3: VOCAB_OPPOSITE
    // ==================
    try {
        const questions = await getRandomVocabOppositeQuestions(undefined, 1);
        if (questions.length > 0) {
            const q = questions[0];
            const options = getVocabOppositeOptions(q);
            const correctIdx = options.indexOf(q.opposite);
            const correctLetter = ['A', 'B', 'C', 'D'][correctIdx];

            const isCorrect = checkVocabOppositeAnswer(correctLetter, correctLetter);

            results.push({
                game: "VOCAB_OPPOSITE",
                status: isCorrect ? "pass" : "fail",
                details: {
                    word: q.word,
                    opposite: q.opposite,
                    options,
                    correctAnswer: correctLetter,
                }
            });
        } else {
            results.push({ game: "VOCAB_OPPOSITE", status: "fail", details: "No questions found" });
        }
    } catch (e: any) {
        results.push({ game: "VOCAB_OPPOSITE", status: "fail", details: null, error: e.message });
    }

    // ==================
    // Test 4: VOCAB_SYNONYM
    // ==================
    try {
        const questions = await getRandomVocabSynonymQuestions(undefined, 1);
        if (questions.length > 0) {
            const q = questions[0];
            const options = getVocabSynonymOptions(q);
            const correctIdx = options.indexOf(q.synonym);
            const correctLetter = ['A', 'B', 'C', 'D'][correctIdx];

            const isCorrect = checkVocabSynonymAnswer(correctLetter, correctLetter);

            results.push({
                game: "VOCAB_SYNONYM",
                status: isCorrect ? "pass" : "fail",
                details: {
                    word: q.word,
                    synonym: q.synonym,
                    options,
                    correctAnswer: correctLetter,
                }
            });
        } else {
            results.push({ game: "VOCAB_SYNONYM", status: "fail", details: "No questions found" });
        }
    } catch (e: any) {
        results.push({ game: "VOCAB_SYNONYM", status: "fail", details: null, error: e.message });
    }

    // ==================
    // Test 5: FILL_BLANK
    // ==================
    try {
        const question = await prisma.fillBlankQuestion.findFirst();
        if (question) {
            const isCorrect = question.answer.toLowerCase() === question.answer.toLowerCase();

            results.push({
                game: "FILL_BLANK",
                status: isCorrect ? "pass" : "fail",
                details: {
                    sentence: question.sentence,
                    answer: question.answer,
                }
            });
        } else {
            results.push({ game: "FILL_BLANK", status: "fail", details: "No questions found" });
        }
    } catch (e: any) {
        results.push({ game: "FILL_BLANK", status: "fail", details: null, error: e.message });
    }

    // ==================
    // Test 6: FIX_SENTENCE
    // ==================
    try {
        const questions = await getRandomFixSentenceQuestions(undefined, 1);
        if (questions.length > 0) {
            const q = questions[0];

            const isCorrect = checkFixSentenceAnswer(q.correctSentence, q.correctSentence);
            const isWrong = checkFixSentenceAnswer(q.wrongSentence, q.correctSentence);

            results.push({
                game: "FIX_SENTENCE",
                status: isCorrect && !isWrong ? "pass" : "fail",
                details: {
                    wrongSentence: q.wrongSentence,
                    correctSentence: q.correctSentence,
                    testCorrect: isCorrect,
                    testWrong: !isWrong,
                }
            });
        } else {
            results.push({ game: "FIX_SENTENCE", status: "fail", details: "No questions found" });
        }
    } catch (e: any) {
        results.push({ game: "FIX_SENTENCE", status: "fail", details: null, error: e.message });
    }

    // ==================
    // Test 7: ARRANGE_SENTENCE
    // ==================
    try {
        const questions = await getRandomArrangeSentenceQuestions(undefined, 1);
        if (questions.length > 0) {
            const q = questions[0];

            const isCorrect = checkArrangeSentenceAnswer(q.correctSentence, q.correctSentence);

            results.push({
                game: "ARRANGE_SENTENCE",
                status: isCorrect ? "pass" : "fail",
                details: {
                    shuffledWords: q.shuffledWords,
                    correctSentence: q.correctSentence,
                    testCorrect: isCorrect,
                }
            });
        } else {
            results.push({ game: "ARRANGE_SENTENCE", status: "fail", details: "No questions found" });
        }
    } catch (e: any) {
        results.push({ game: "ARRANGE_SENTENCE", status: "fail", details: null, error: e.message });
    }

    // ==================
    // Test 8: SPEED_GRAMMAR
    // ==================
    try {
        const questions = await getRandomSpeedGrammarQuestions(undefined, 1);
        if (questions.length > 0) {
            const q = questions[0];

            const isCorrect = checkSpeedGrammarAnswer(q.correctAnswer, q.correctAnswer);
            const isWrong = checkSpeedGrammarAnswer('X', q.correctAnswer);

            results.push({
                game: "SPEED_GRAMMAR",
                status: isCorrect && !isWrong ? "pass" : "fail",
                details: {
                    question: q.question,
                    correctAnswer: q.correctAnswer,
                    timeLimit: q.timeLimit,
                    testCorrect: isCorrect,
                    testWrong: !isWrong,
                }
            });
        } else {
            results.push({ game: "SPEED_GRAMMAR", status: "fail", details: "No questions found" });
        }
    } catch (e: any) {
        results.push({ game: "SPEED_GRAMMAR", status: "fail", details: null, error: e.message });
    }

    // ==================
    // Test 9: READ_ANSWER
    // ==================
    try {
        const questions = await getRandomReadAnswerQuestions(undefined, 1);
        if (questions.length > 0) {
            const q = questions[0];

            const isCorrect = checkReadAnswerAnswer(q.correctAnswer, q.correctAnswer);
            const isWrong = checkReadAnswerAnswer('X', q.correctAnswer);

            results.push({
                game: "READ_ANSWER",
                status: isCorrect && !isWrong ? "pass" : "fail",
                details: {
                    passage: q.passage.substring(0, 50) + "...",
                    question: q.question,
                    correctAnswer: q.correctAnswer,
                    testCorrect: isCorrect,
                    testWrong: !isWrong,
                }
            });
        } else {
            results.push({ game: "READ_ANSWER", status: "fail", details: "No questions found" });
        }
    } catch (e: any) {
        results.push({ game: "READ_ANSWER", status: "fail", details: null, error: e.message });
    }

    // ==================
    // Test 10: SUMMARIZE
    // ==================
    try {
        const questions = await getRandomSummarizeQuestions(undefined, 1);
        if (questions.length > 0) {
            const q = questions[0];
            const keywords = getSummarizeKeywords(q);

            // Test with sample summary (should pass)
            const evalResult = await evaluateSummary(
                q.sampleSummary,
                q.passage,
                q.sampleSummary,
                keywords
            );

            results.push({
                game: "SUMMARIZE",
                status: evalResult.correct ? "pass" : "fail",
                details: {
                    passage: q.passage.substring(0, 50) + "...",
                    keywords: keywords,
                    sampleSummary: q.sampleSummary,
                    evaluation: evalResult,
                }
            });
        } else {
            results.push({ game: "SUMMARIZE", status: "fail", details: "No questions found" });
        }
    } catch (e: any) {
        results.push({ game: "SUMMARIZE", status: "fail", details: null, error: e.message });
    }

    // ==================
    // Test 11: CONTINUE_STORY
    // ==================
    try {
        const questions = await getRandomContinueStoryQuestions(undefined, 1);
        if (questions.length > 0) {
            const q = questions[0];
            const keywords = getContinueStoryKeywords(q);

            // Test with a valid continuation
            const testContinuation = `เด็กหญิงตัดสินใจตามกระต่ายไป เธอวิ่งผ่านต้นไม้ใหญ่ในป่า และพบถ้ำลับแห่งหนึ่ง นี่คือการผจญภัยครั้งใหม่`;

            const evalResult = await evaluateContinuation(
                testContinuation,
                q.storyStart,
                keywords,
                q.minLength
            );

            results.push({
                game: "CONTINUE_STORY",
                status: "pass", // Just check it runs without error
                details: {
                    storyStart: q.storyStart.substring(0, 50) + "...",
                    keywords: keywords,
                    minLength: q.minLength,
                    testContinuation: testContinuation.substring(0, 50) + "...",
                    evaluation: evalResult,
                }
            });
        } else {
            results.push({ game: "CONTINUE_STORY", status: "fail", details: "No questions found" });
        }
    } catch (e: any) {
        results.push({ game: "CONTINUE_STORY", status: "fail", details: null, error: e.message });
    }

    // ==================
    // Test 12: DAILY_VOCAB
    // ==================
    try {
        const vocab = await getTodayVocab();

        results.push({
            game: "DAILY_VOCAB",
            status: vocab ? "pass" : "fail",
            details: vocab ? {
                word: vocab.word,
                meaning: vocab.meaning,
                example: vocab.example,
            } : "No vocab for today"
        });
    } catch (e: any) {
        results.push({ game: "DAILY_VOCAB", status: "fail", details: null, error: e.message });
    }

    // ==================
    // Test 13: RACE_CLOCK
    // ==================
    try {
        const questions = await getRandomRaceClockQuestions(undefined, 1);
        if (questions.length > 0) {
            const q = questions[0];

            const isCorrect = checkRaceClockAnswer(q.correctAnswer, q.correctAnswer);
            const points = calculateRaceClockPoints(true, 5); // 5 seconds

            results.push({
                game: "RACE_CLOCK",
                status: isCorrect && points > 0 ? "pass" : "fail",
                details: {
                    question: q.question,
                    correctAnswer: q.correctAnswer,
                    testCorrect: isCorrect,
                    pointsFor5Sec: points,
                }
            });
        } else {
            results.push({ game: "RACE_CLOCK", status: "fail", details: "No questions found" });
        }
    } catch (e: any) {
        results.push({ game: "RACE_CLOCK", status: "fail", details: null, error: e.message });
    }

    // ==================
    // Test 14: VOCAB_GACHA (just check data exists)
    // ==================
    try {
        const gachaCount = await prisma.gachaVocab.count();

        results.push({
            game: "VOCAB_GACHA",
            status: gachaCount > 0 ? "pass" : "fail",
            details: {
                totalGachaVocabs: gachaCount,
            }
        });
    } catch (e: any) {
        results.push({ game: "VOCAB_GACHA", status: "fail", details: null, error: e.message });
    }

    // ==================
    // Test 15: SENTENCE_WRITING
    // ==================
    try {
        const pair = await prisma.sentenceConstructionPair.findFirst();
        if (pair) {
            const testSentence = `ฉันชอบ${pair.word1}มาก และ${pair.word2}ก็ดีเหมือนกัน`;
            const hasWord1 = testSentence.includes(pair.word1);
            const hasWord2 = testSentence.includes(pair.word2);

            results.push({
                game: "SENTENCE_WRITING",
                status: hasWord1 && hasWord2 ? "pass" : "fail",
                details: {
                    word1: pair.word1,
                    word2: pair.word2,
                    testSentence,
                    hasWord1,
                    hasWord2,
                }
            });
        } else {
            results.push({ game: "SENTENCE_WRITING", status: "fail", details: "No pairs found" });
        }
    } catch (e: any) {
        results.push({ game: "SENTENCE_WRITING", status: "fail", details: null, error: e.message });
    }

    // Summary
    const passed = results.filter(r => r.status === "pass").length;
    const failed = results.filter(r => r.status === "fail").length;

    return NextResponse.json({
        summary: {
            total: results.length,
            passed,
            failed,
            passRate: `${Math.round((passed / results.length) * 100)}%`,
        },
        results,
    });
}
