// Game Logic Exports - 15 Games

// Vocabulary Games (4)
export * from './vocabMatch';
export * from './vocabMeaning';
export * from './vocabOpposite';
export * from './vocabSynonym';

// Grammar Games (4)
export * from './fillBlank';
export * from './fixSentence';
export * from './arrangeSentence';
export * from './speedGrammar';

// Reading & Writing Games (4)
export * from './readAnswer';
export * from './sentenceConstruction';  // COMPOSE_SENTENCE
export * from './summarize';
export * from './continueStory';

// Fun Games (3)
export * from './dailyVocab';
export * from './raceClock';
export * from './vocabGacha';

// Multiple Choice (shared)
export * from './multipleChoice';

// =====================
// Game Types - 15 ประเภท
// =====================

export type GameType =
    // Vocabulary Games
    | 'VOCAB_MATCH'
    | 'VOCAB_MEANING'
    | 'VOCAB_OPPOSITE'
    | 'VOCAB_SYNONYM'
    // Grammar Games
    | 'FILL_BLANK'
    | 'FIX_SENTENCE'
    | 'ARRANGE_SENTENCE'
    | 'SPEED_GRAMMAR'
    // Reading & Writing Games
    | 'READ_ANSWER'
    | 'COMPOSE_SENTENCE'
    | 'SUMMARIZE'
    | 'CONTINUE_STORY'
    // Fun Games
    | 'DAILY_VOCAB'
    | 'RACE_CLOCK'
    | 'VOCAB_GACHA';

export interface GameState {
    gameType: GameType;
    questions: string[];  // Question IDs
    currentIndex: number;
    correctCount: number;
    answers: string[];
    isCompleted: boolean;
}

// =====================
// Game Info Helpers
// =====================

export function getGameName(gameType: GameType): string {
    const names: Record<GameType, string> = {
        // Vocabulary
        VOCAB_MATCH: 'จับคู่คำ',
        VOCAB_MEANING: 'ความหมายคำศัพท์',
        VOCAB_OPPOSITE: 'คำตรงข้าม',
        VOCAB_SYNONYM: 'คำพ้องความหมาย',
        // Grammar
        FILL_BLANK: 'เติมคำ',
        FIX_SENTENCE: 'แก้ไขประโยค',
        ARRANGE_SENTENCE: 'เรียงประโยค',
        SPEED_GRAMMAR: 'Speed Grammar',
        // Reading & Writing
        READ_ANSWER: 'อ่านแล้วตอบ',
        COMPOSE_SENTENCE: 'แต่งประโยค',
        SUMMARIZE: 'สรุปเรื่อง',
        CONTINUE_STORY: 'เขียนต่อเรื่อง',
        // Fun
        DAILY_VOCAB: 'คำศัพท์รายวัน',
        RACE_CLOCK: 'แข่งกับเวลา',
        VOCAB_GACHA: 'กาชาคำศัพท์',
    };
    return names[gameType] || 'เกม';
}

export function getGameEmoji(gameType: GameType): string {
    const emojis: Record<GameType, string> = {
        // Vocabulary
        VOCAB_MATCH: '📚',
        VOCAB_MEANING: '📖',
        VOCAB_OPPOSITE: '🔄',
        VOCAB_SYNONYM: '🔗',
        // Grammar
        FILL_BLANK: '📝',
        FIX_SENTENCE: '✏️',
        ARRANGE_SENTENCE: '🔤',
        SPEED_GRAMMAR: '⚡',
        // Reading & Writing
        READ_ANSWER: '📖',
        COMPOSE_SENTENCE: '✍️',
        SUMMARIZE: '📝',
        CONTINUE_STORY: '📖',
        // Fun
        DAILY_VOCAB: '📅',
        RACE_CLOCK: '🏎️',
        VOCAB_GACHA: '🎰',
    };
    return emojis[gameType] || '🎮';
}

export function getGamePoints(gameType: GameType): number {
    const points: Record<GameType, number> = {
        // Vocabulary (10 pts)
        VOCAB_MATCH: 10,
        VOCAB_MEANING: 10,
        VOCAB_OPPOSITE: 10,
        VOCAB_SYNONYM: 10,
        // Grammar (10-15 pts)
        FILL_BLANK: 10,
        FIX_SENTENCE: 12,
        ARRANGE_SENTENCE: 12,
        SPEED_GRAMMAR: 15,
        // Reading & Writing (15-20 pts)
        READ_ANSWER: 15,
        COMPOSE_SENTENCE: 15,
        SUMMARIZE: 20,
        CONTINUE_STORY: 20,
        // Fun (variable)
        DAILY_VOCAB: 5,
        RACE_CLOCK: 10,
        VOCAB_GACHA: 5,
    };
    return points[gameType] || 10;
}

export function getGameCategory(gameType: GameType): string {
    const vocab: GameType[] = ['VOCAB_MATCH', 'VOCAB_MEANING', 'VOCAB_OPPOSITE', 'VOCAB_SYNONYM'];
    const grammar: GameType[] = ['FILL_BLANK', 'FIX_SENTENCE', 'ARRANGE_SENTENCE', 'SPEED_GRAMMAR'];
    const reading: GameType[] = ['READ_ANSWER', 'COMPOSE_SENTENCE', 'SUMMARIZE', 'CONTINUE_STORY'];
    const fun: GameType[] = ['DAILY_VOCAB', 'RACE_CLOCK', 'VOCAB_GACHA'];

    if (vocab.includes(gameType)) return 'คำศัพท์';
    if (grammar.includes(gameType)) return 'ไวยากรณ์';
    if (reading.includes(gameType)) return 'อ่าน-เขียน';
    if (fun.includes(gameType)) return 'Fun Games';
    return 'เกม';
}
