import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export const dynamic = 'force-dynamic';

// Fill-in-Blank Questions (เติมคำ)
const fillBlankQuestions = [
    { sentence: "นักศึกษาเดินเข้า __________ ใหญ่ของมหาวิทยาลัยเพื่อทำพิธีรับปริญญา", answer: "หอประชุม" },
    { sentence: "การรำไทยเป็นส่วนหนึ่งของ __________ ที่สะท้อนเอกลักษณ์ของชาติ", answer: "นาฏศิลป์" },
    { sentence: "ตัวละครทศกัณฐ์เป็นหัวใจสำคัญในการแสดง __________ เรื่องรามเกียรติ์", answer: "โขน" },
    { sentence: "ผู้ชนะเลิศการประกวดร้องเพลงจะได้รับ __________ มูลค่าหนึ่งแสนบาท", answer: "เงินรางวัล" },
    { sentence: "เมื่อจบหลักสูตรระยะสั้น ผู้เรียนจะได้รับ __________ ทุกคน", answer: "ประกาศนียบัตร" },
    { sentence: "ผู้เข้าชมงานต้อง __________ หน้างานก่อนรับของที่ระลึก", answer: "ลงทะเบียน" },
    { sentence: "การเรียนรู้ __________ ที่สองจะช่วยให้เราติดต่อสื่อสารกับชาวต่างชาติได้ดีขึ้น", answer: "ภาษา" },
    { sentence: "การไหว้และการแต่งกายชุดไทยเป็นส่วนหนึ่งของ __________ ที่งดงาม", answer: "วัฒนธรรม" },
    { sentence: "การพูดในที่สาธารณะเป็น __________ ที่พนักงานทุกคนควรฝึกฝน", answer: "ทักษะ" },
    { sentence: "พ่อแม่รู้สึกภูมิใจมากที่เห็นลูกสวมชุด __________ ในวันรับปริญญาบัตร", answer: "ครุย" },
];

// ==================
// NEW GAME DATA
// ==================

// Vocab Match Questions (จับคู่คำ)
const vocabMatchQuestions = [
    { word: "สวัสดี", meaning: "คำทักทาย", wrongA: "คำลา", wrongB: "คำขอบคุณ", wrongC: "คำขอโทษ" },
    { word: "ขอบคุณ", meaning: "แสดงความขอบใจ", wrongA: "แสดงความเสียใจ", wrongB: "แสดงความยินดี", wrongC: "แสดงความโกรธ" },
    { word: "โรงเรียน", meaning: "สถานที่เรียนหนังสือ", wrongA: "สถานที่รักษาโรค", wrongB: "สถานที่ซื้อของ", wrongC: "สถานที่พักผ่อน" },
    { word: "อาหาร", meaning: "ของกิน", wrongA: "ของเล่น", wrongB: "ของใช้", wrongC: "ของขวัญ" },
    { word: "รถยนต์", meaning: "ยานพาหนะ", wrongA: "อาคาร", wrongB: "เครื่องมือ", wrongC: "เฟอร์นิเจอร์" },
    { word: "ครอบครัว", meaning: "กลุ่มคนที่เกี่ยวข้องกัน", wrongA: "กลุ่มเพื่อน", wrongB: "กลุ่มคนแปลกหน้า", wrongC: "กลุ่มนักเรียน" },
    { word: "หนังสือ", meaning: "สิ่งพิมพ์สำหรับอ่าน", wrongA: "สิ่งของสำหรับเขียน", wrongB: "สิ่งของสำหรับวาด", wrongC: "สิ่งของสำหรับเล่น" },
    { word: "น้ำ", meaning: "ของเหลวดื่มได้", wrongA: "ของแข็ง", wrongB: "ก๊าซ", wrongC: "อาหาร" },
];

// Vocab Opposite Questions (คำตรงข้าม)
const vocabOppositeQuestions = [
    { word: "ร้อน", opposite: "เย็น", wrongA: "อุ่น", wrongB: "หนาว", wrongC: "ชื้น" },
    { word: "สูง", opposite: "เตี้ย", wrongA: "กว้าง", wrongB: "ยาว", wrongC: "หนา" },
    { word: "หนัก", opposite: "เบา", wrongA: "แข็ง", wrongB: "นุ่ม", wrongC: "แน่น" },
    { word: "เร็ว", opposite: "ช้า", wrongA: "ไว", wrongB: "ด่วน", wrongC: "รีบ" },
    { word: "ดี", opposite: "ไม่ดี", wrongA: "ปานกลาง", wrongB: "พอใช้", wrongC: "เฉย" },
    { word: "ถูก", opposite: "แพง", wrongA: "คุ้ม", wrongB: "เหมาะ", wrongC: "ดี" },
    { word: "มาก", opposite: "น้อย", wrongA: "เยอะ", wrongB: "หลาย", wrongC: "บ่อย" },
    { word: "เก่า", opposite: "ใหม่", wrongA: "โบราณ", wrongB: "เดิม", wrongC: "ก่อน" },
];

// Vocab Synonym Questions (คำพ้องความหมาย)
const vocabSynonymQuestions = [
    { word: "สวย", synonym: "งาม", wrongA: "น่าเกลียด", wrongB: "ธรรมดา", wrongC: "เรียบ" },
    { word: "ดีใจ", synonym: "ยินดี", wrongA: "เศร้า", wrongB: "โกรธ", wrongC: "กลัว" },
    { word: "บ้าน", synonym: "เรือน", wrongA: "ห้อง", wrongB: "ตึก", wrongC: "อาคาร" },
    { word: "กิน", synonym: "รับประทาน", wrongA: "ดื่ม", wrongB: "เคี้ยว", wrongC: "กลืน" },
    { word: "พูด", synonym: "กล่าว", wrongA: "ฟัง", wrongB: "เขียน", wrongC: "อ่าน" },
    { word: "เดิน", synonym: "ย่างก้าว", wrongA: "วิ่ง", wrongB: "นั่ง", wrongC: "ยืน" },
    { word: "ใหญ่", synonym: "โต", wrongA: "เล็ก", wrongB: "กลาง", wrongC: "ยาว" },
    { word: "เร็ว", synonym: "ไว", wrongA: "ช้า", wrongB: "นาน", wrongC: "ถาวร" },
];

// Fix Sentence Questions (แก้ประโยค)
const fixSentenceQuestions = [
    { wrongSentence: "ฉัน กิน ข้าว แล้ว เมื่อวานนี้", correctSentence: "เมื่อวานนี้ ฉันกินข้าวแล้ว", hint: "ลำดับคำในประโยค" },
    { wrongSentence: "เขาไปโรงเรียนทุกวันแล้ว", correctSentence: "เขาไปโรงเรียนทุกวัน", hint: "คำว่า 'แล้ว' ไม่จำเป็น" },
    { wrongSentence: "หมาตัวนี้มันน่ารักมากๆๆๆ", correctSentence: "หมาตัวนี้น่ารักมาก", hint: "ลดคำซ้ำ" },
    { wrongSentence: "เมื่อวานฉันจะไปตลาด", correctSentence: "เมื่อวานฉันไปตลาด", hint: "กาลของกริยา" },
    { wrongSentence: "น้องสาวของผมเธอสวยมาก", correctSentence: "น้องสาวของผมสวยมาก", hint: "สรรพนามซ้ำ" },
];

// Arrange Sentence Questions (เรียงประโยค)
const arrangeSentenceQuestions = [
    { shuffledWords: "ไป|ฉัน|โรงเรียน|ทุกวัน", correctSentence: "ฉันไปโรงเรียนทุกวัน" },
    { shuffledWords: "กิน|ข้าว|แม่|ทำ|อร่อย", correctSentence: "แม่ทำข้าวกินอร่อย" },
    { shuffledWords: "สวย|ดอกไม้|มาก|นี้", correctSentence: "ดอกไม้นี้สวยมาก" },
    { shuffledWords: "เรียน|ภาษาไทย|เขา|ที่|มหาวิทยาลัย", correctSentence: "เขาเรียนภาษาไทยที่มหาวิทยาลัย" },
    { shuffledWords: "อากาศ|วันนี้|ดี|มาก", correctSentence: "วันนี้อากาศดีมาก" },
];

// Speed Grammar Questions
const speedGrammarQuestions = [
    { question: "คำว่า 'กิน' เป็นคำชนิดใด?", optionA: "คำนาม", optionB: "คำกริยา", optionC: "คำวิเศษณ์", optionD: "คำสันธาน", correctAnswer: "B", timeLimit: 20 },
    { question: "'เขาเดินไปโรงเรียน' คำว่า 'เดิน' ทำหน้าที่อะไร?", optionA: "กริยาหลัก", optionB: "กริยาช่วย", optionC: "คำนาม", optionD: "คำวิเศษณ์", correctAnswer: "A", timeLimit: 25 },
    { question: "ประโยคใดถูกต้อง?", optionA: "ฉันไปแล้วตลาด", optionB: "ฉันไปตลาดแล้ว", optionC: "แล้วฉันไปตลาด", optionD: "ตลาดฉันไปแล้ว", correctAnswer: "B", timeLimit: 20 },
    { question: "คำว่า 'สวยงาม' เป็นคำชนิดใด?", optionA: "คำนาม", optionB: "คำกริยา", optionC: "คำวิเศษณ์", optionD: "คำสันธาน", correctAnswer: "C", timeLimit: 20 },
    { question: "'และ' เป็นคำชนิดใด?", optionA: "คำนาม", optionB: "คำกริยา", optionC: "คำวิเศษณ์", optionD: "คำสันธาน", correctAnswer: "D", timeLimit: 15 },
];

// Read Answer Questions (อ่านแล้วตอบ)
const readAnswerQuestions = [
    {
        passage: "สมชายเป็นนักเรียนชั้นมัธยมศึกษาปีที่ 3 เขาชอบเล่นฟุตบอลมาก ทุกเย็นหลังเลิกเรียน เขาจะไปซ้อมฟุตบอลกับเพื่อนๆ ที่สนามหลังโรงเรียน ความฝันของเขาคือการเป็นนักฟุตบอลอาชีพ",
        question: "สมชายชอบทำกิจกรรมอะไร?",
        optionA: "เล่นบาสเกตบอล", optionB: "เล่นฟุตบอล", optionC: "ว่ายน้ำ", optionD: "วิ่ง",
        correctAnswer: "B",
    },
    {
        passage: "วันนี้อากาศร้อนมาก แม่จึงทำน้ำมะนาวเย็นให้ลูกๆ ดื่ม น้องเล็กบอกว่าน้ำมะนาวของแม่อร่อยมาก และขอดื่มเพิ่มอีกแก้ว",
        question: "แม่ทำเครื่องดื่มอะไรให้ลูกๆ?",
        optionA: "น้ำส้ม", optionB: "น้ำมะนาว", optionC: "น้ำเปล่า", optionD: "ชาเย็น",
        correctAnswer: "B",
    },
    {
        passage: "ตลาดนัดวันเสาร์มีคนมากมาย มีของขายหลายอย่าง ทั้งผัก ผลไม้ เสื้อผ้า และของใช้ในบ้าน ป้าแดงมาขายส้มตำทุกสัปดาห์ ส้มตำของป้าแดงอร่อยมาก คนมาซื้อกันไม่ขาดสาย",
        question: "ป้าแดงขายอะไร?",
        optionA: "ผลไม้", optionB: "เสื้อผ้า", optionC: "ส้มตำ", optionD: "ของใช้ในบ้าน",
        correctAnswer: "C",
    },
];

// Summarize Questions (สรุปเรื่อง)
const summarizeQuestions = [
    {
        passage: "เมื่อวานนี้ฝนตกหนักมาก ถนนหลายสายน้ำท่วม รถติดมากทำให้คนไปทำงานสาย โรงเรียนหลายแห่งประกาศหยุดเรียน ชาวบ้านต้องเอาของขึ้นที่สูง",
        sampleSummary: "ฝนตกหนักทำให้น้ำท่วม ส่งผลกระทบต่อการเดินทางและโรงเรียนต้องหยุดเรียน",
        keywords: "ฝนตก|น้ำท่วม|รถติด|หยุดเรียน",
    },
    {
        passage: "สุนัขเป็นสัตว์เลี้ยงที่คนไทยนิยมมาก เพราะเป็นสัตว์ที่ซื่อสัตย์ รักเจ้าของ และดูแลบ้านได้ดี สุนัขต้องการการดูแลเอาใจใส่ เช่น การให้อาหาร พาไปเดินเล่น และพาไปพบสัตวแพทย์",
        sampleSummary: "สุนัขเป็นสัตว์เลี้ยงยอดนิยมเพราะซื่อสัตย์และดูแลบ้านได้ แต่ต้องดูแลเอาใจใส่",
        keywords: "สุนัข|สัตว์เลี้ยง|ซื่อสัตย์|ดูแล",
    },
];

// Continue Story Questions (เขียนต่อเรื่อง)
const continueStoryQuestions = [
    {
        storyStart: "วันหนึ่งเด็กหญิงคนหนึ่งเดินเข้าไปในป่าลึก เธอเห็นกระต่ายสีขาวตัวหนึ่งวิ่งผ่านไป กระต่ายตัวนั้นดูรีบร้อนมาก...",
        keywords: "กระต่าย|ป่า|ผจญภัย",
        minLength: 50,
    },
    {
        storyStart: "ในหมู่บ้านเล็กๆ แห่งหนึ่ง มีเด็กชายที่ชอบอ่านหนังสือมาก วันหนึ่งเขาพบหนังสือเล่มหนึ่งที่ห้องใต้หลังคา เมื่อเปิดอ่าน...",
        keywords: "หนังสือ|ความลับ|ค้นพบ",
        minLength: 50,
    },
];

// Daily Vocab
const dailyVocabs = [
    { word: "สวัสดี", meaning: "คำทักทาย ใช้ได้ทั้งตอนพบและลาจาก", example: "สวัสดีครับ วันนี้คุณสบายดีไหม?", forDate: new Date("2026-02-01") },
    { word: "ขอบคุณ", meaning: "แสดงความขอบใจ", example: "ขอบคุณมากครับที่ช่วยเหลือ", forDate: new Date("2026-02-02") },
    { word: "รัก", meaning: "ความรู้สึกผูกพันอย่างลึกซึ้ง", example: "ผมรักครอบครัวของผมมาก", forDate: new Date("2026-02-03") },
    { word: "เรียน", meaning: "ศึกษาหาความรู้", example: "เขาเรียนภาษาไทยที่มหาวิทยาลัย", forDate: new Date("2026-02-04") },
    { word: "อาหาร", meaning: "ของกินที่ให้พลังงาน", example: "อาหารไทยมีรสชาติเผ็ดมาก", forDate: new Date("2026-02-05") },
    { word: "ครอบครัว", meaning: "กลุ่มคนที่มีความสัมพันธ์ทางสายเลือด", example: "ครอบครัวของผมมี 4 คน", forDate: new Date("2026-02-06") },
    { word: "ทำงาน", meaning: "ปฏิบัติหน้าที่หรือภารกิจ", example: "พ่อทำงานที่โรงพยาบาล", forDate: new Date("2026-02-07") },
];

// Gacha Vocab
const gachaVocabs = [
    // Common (60%)
    { word: "น้ำ", meaning: "ของเหลวที่ดื่มได้", rarity: "COMMON" },
    { word: "อาหาร", meaning: "ของกิน", rarity: "COMMON" },
    { word: "บ้าน", meaning: "ที่อยู่อาศัย", rarity: "COMMON" },
    { word: "รถ", meaning: "ยานพาหนะ", rarity: "COMMON" },
    { word: "หนังสือ", meaning: "สิ่งพิมพ์สำหรับอ่าน", rarity: "COMMON" },
    // Rare (25%)
    { word: "วัฒนธรรม", meaning: "แบบแผนการดำเนินชีวิต", rarity: "RARE" },
    { word: "ประเพณี", meaning: "สิ่งที่ปฏิบัติสืบต่อกันมา", rarity: "RARE" },
    { word: "เศรษฐกิจ", meaning: "ระบบการผลิตและการค้า", rarity: "RARE" },
    // Epic (12%)
    { word: "อารยธรรม", meaning: "ความเจริญรุ่งเรืองของสังคม", rarity: "EPIC" },
    { word: "ปรัชญา", meaning: "ความรู้ว่าด้วยหลักแห่งความจริง", rarity: "EPIC" },
    // Legendary (3%)
    { word: "ญาณทัศนะ", meaning: "การรู้แจ้งเห็นจริง", rarity: "LEGENDARY" },
    { word: "อริยสัจ", meaning: "ความจริงอันประเสริฐ", rarity: "LEGENDARY" },
];

// Multiple Choice Questions (เลือกตอบ)
const multipleChoiceQuestions = [
    {
        question: "คำว่า 'สวัสดี' ใช้ทักทายในสถานการณ์ใด?",
        optionA: "ใช้ได้ทั้งตอนพบและลาจาก",
        optionB: "ใช้ได้เฉพาะตอนพบกัน",
        optionC: "ใช้ได้เฉพาะตอนลาจาก",
        optionD: "ใช้ได้เฉพาะตอนขอบคุณ",
        correctAnswer: "A",
    },
    {
        question: "ประโยค 'ฉันไปตลาด' เป็นประโยคชนิดใด?",
        optionA: "ประโยคคำถาม",
        optionB: "ประโยคบอกเล่า",
        optionC: "ประโยคคำสั่ง",
        optionD: "ประโยคอุทาน",
        correctAnswer: "B",
    },
    {
        question: "คำใดเป็นคำนาม?",
        optionA: "วิ่ง",
        optionB: "สวย",
        optionC: "หนังสือ",
        optionD: "เร็ว",
        correctAnswer: "C",
    },
    {
        question: "'แม่ครัว' หมายถึงอะไร?",
        optionA: "คนที่ทำความสะอาดบ้าน",
        optionB: "คนที่ทำอาหาร",
        optionC: "คนที่ขายของ",
        optionD: "คนที่สอนหนังสือ",
        correctAnswer: "B",
    },
    {
        question: "การ 'ไหว้' ในวัฒนธรรมไทยแสดงถึงอะไร?",
        optionA: "ความโกรธ",
        optionB: "ความเคารพ",
        optionC: "ความเศร้า",
        optionD: "ความกลัว",
        correctAnswer: "B",
    },
];

// Sentence Construction Pairs (เขียนประโยค)
const sentenceConstructionPairs = [
    { word1: "หอประชุม", word2: "กิจกรรม" },
    { word1: "พู่กัน", word2: "เขียน" },
    { word1: "โขน", word2: "แสดง" },
    { word1: "ลงทะเบียน", word2: "เว็บไซต์" },
    { word1: "เงินรางวัล", word2: "ชนะ" },
    { word1: "วัฒนธรรม", word2: "เรียนรู้" },
    { word1: "บัณฑิต", word2: "ชุดครุย" },
    { word1: "มหาวิทยาลัย", word2: "เรียน" },
    { word1: "อาหาร", word2: "อร่อย" },
    { word1: "ภาษาไทย", word2: "ฝึกฝน" },
];

export async function POST() {
    try {
        const results: Record<string, number> = {};

        // Helper function to seed data
        async function seedData<T>(
            name: string,
            countFn: () => Promise<number>,
            createFn: (data: T) => Promise<unknown>,
            items: T[]
        ) {
            const existing = await countFn();
            if (existing === 0) {
                for (const item of items) {
                    await createFn(item);
                }
                results[name] = items.length;
            } else {
                results[name] = 0;
            }
        }

        // Original 3 games
        await seedData("fillBlank", () => prisma.fillBlankQuestion.count(), (d) => prisma.fillBlankQuestion.create({ data: d }), fillBlankQuestions);
        await seedData("multipleChoice", () => prisma.multipleChoiceQuestion.count(), (d) => prisma.multipleChoiceQuestion.create({ data: d }), multipleChoiceQuestions);
        await seedData("sentence", () => prisma.sentenceConstructionPair.count(), (d) => prisma.sentenceConstructionPair.create({ data: d }), sentenceConstructionPairs);

        // NEW: Vocabulary games
        await seedData("vocabMatch", () => prisma.vocabMatchQuestion.count(), (d) => prisma.vocabMatchQuestion.create({ data: d }), vocabMatchQuestions);
        await seedData("vocabOpposite", () => prisma.vocabOppositeQuestion.count(), (d) => prisma.vocabOppositeQuestion.create({ data: d }), vocabOppositeQuestions);
        await seedData("vocabSynonym", () => prisma.vocabSynonymQuestion.count(), (d) => prisma.vocabSynonymQuestion.create({ data: d }), vocabSynonymQuestions);

        // NEW: Grammar games
        await seedData("fixSentence", () => prisma.fixSentenceQuestion.count(), (d) => prisma.fixSentenceQuestion.create({ data: d }), fixSentenceQuestions);
        await seedData("arrangeSentence", () => prisma.arrangeSentenceQuestion.count(), (d) => prisma.arrangeSentenceQuestion.create({ data: d }), arrangeSentenceQuestions);
        await seedData("speedGrammar", () => prisma.speedGrammarQuestion.count(), (d) => prisma.speedGrammarQuestion.create({ data: d }), speedGrammarQuestions);

        // NEW: Reading games
        await seedData("readAnswer", () => prisma.readAnswerQuestion.count(), (d) => prisma.readAnswerQuestion.create({ data: d }), readAnswerQuestions);
        await seedData("summarize", () => prisma.summarizeQuestion.count(), (d) => prisma.summarizeQuestion.create({ data: d }), summarizeQuestions);
        await seedData("continueStory", () => prisma.continueStoryQuestion.count(), (d) => prisma.continueStoryQuestion.create({ data: d }), continueStoryQuestions);

        // NEW: Fun games
        await seedData("dailyVocab", () => prisma.dailyVocab.count(), (d) => prisma.dailyVocab.create({ data: d }), dailyVocabs);
        await seedData("gachaVocab", () => prisma.gachaVocab.count(), (d) => prisma.gachaVocab.create({ data: d }), gachaVocabs);

        return NextResponse.json({
            status: "ok",
            message: "Seed completed for all 15 game types",
            results,
        });
    } catch (error: any) {
        return NextResponse.json({
            status: "error",
            message: error.message,
        }, { status: 500 });
    }
}

export async function GET() {
    const counts = {
        // Original games
        fillBlankQuestions: await prisma.fillBlankQuestion.count(),
        multipleChoiceQuestions: await prisma.multipleChoiceQuestion.count(),
        sentenceConstructionPairs: await prisma.sentenceConstructionPair.count(),
        // Vocabulary games
        vocabMatchQuestions: await prisma.vocabMatchQuestion.count(),
        vocabOppositeQuestions: await prisma.vocabOppositeQuestion.count(),
        vocabSynonymQuestions: await prisma.vocabSynonymQuestion.count(),
        // Grammar games
        fixSentenceQuestions: await prisma.fixSentenceQuestion.count(),
        arrangeSentenceQuestions: await prisma.arrangeSentenceQuestion.count(),
        speedGrammarQuestions: await prisma.speedGrammarQuestion.count(),
        // Reading games
        readAnswerQuestions: await prisma.readAnswerQuestion.count(),
        summarizeQuestions: await prisma.summarizeQuestion.count(),
        continueStoryQuestions: await prisma.continueStoryQuestion.count(),
        // Fun games
        dailyVocabs: await prisma.dailyVocab.count(),
        gachaVocabs: await prisma.gachaVocab.count(),
    };

    return NextResponse.json({
        status: "ok",
        counts,
    });
}
