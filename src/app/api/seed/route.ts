import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export const dynamic = 'force-dynamic';

const chineseVocabulary = [
    { chineseWord: "广西", thaiMeaning: "กว่างซี", category: "สถานที่" },
    { chineseWord: "北京", thaiMeaning: "ปักกิ่ง", category: "สถานที่" },
    { chineseWord: "昆明", thaiMeaning: "คุนหมิง", category: "สถานที่" },
    { chineseWord: "你好", thaiMeaning: "สวัสดี", category: "ทักทาย" },
    { chineseWord: "谢谢", thaiMeaning: "ขอบคุณ", category: "ทักทาย" },
    { chineseWord: "对不起", thaiMeaning: "ขอโทษ", category: "ทักทาย" },
    { chineseWord: "没关系", thaiMeaning: "ไม่เป็นไร", category: "ทักทาย" },
    { chineseWord: "朋友", thaiMeaning: "เพื่อน", category: "คน" },
    { chineseWord: "我", thaiMeaning: "ผม/ฉัน", category: "คน" },
    { chineseWord: "你", thaiMeaning: "คุณ", category: "คน" },
    { chineseWord: "名字", thaiMeaning: "ชื่อ", category: "ทั่วไป" },
    { chineseWord: "认识", thaiMeaning: "รู้จัก", category: "ทั่วไป" },
    { chineseWord: "学习", thaiMeaning: "เรียน", category: "การศึกษา" },
    { chineseWord: "考试", thaiMeaning: "สอบ", category: "การศึกษา" },
    { chineseWord: "图书馆", thaiMeaning: "หอสมุด", category: "สถานที่" },
    { chineseWord: "食堂", thaiMeaning: "โรงอาหาร", category: "สถานที่" },
    { chineseWord: "宿舍", thaiMeaning: "หอพัก", category: "สถานที่" },
    { chineseWord: "大学", thaiMeaning: "มหาวิทยาลัย", category: "การศึกษา" },
    { chineseWord: "泰语", thaiMeaning: "ภาษาไทย", category: "ภาษา" },
    { chineseWord: "中文", thaiMeaning: "ภาษาจีน", category: "ภาษา" },
];

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

const wordOrderQuestions = [
    { shuffledWords: [{ number: 1, word: "เรา" }, { number: 2, word: "ไป" }, { number: 3, word: "มหิดล" }, { number: 4, word: "กัน" }], correctAnswer: "เราไปมหิดลกัน" },
    { shuffledWords: [{ number: 1, word: "ทุก" }, { number: 2, word: "คน" }, { number: 3, word: "จะ" }, { number: 4, word: "ได้รับ" }, { number: 5, word: "วุฒิบัตร" }], correctAnswer: "ทุกคนจะได้รับวุฒิบัตร" },
    { shuffledWords: [{ number: 1, word: "บัณฑิต" }, { number: 2, word: "สวม" }, { number: 3, word: "ชุด" }, { number: 4, word: "ครุย" }], correctAnswer: "บัณฑิตสวมชุดครุย" },
    { shuffledWords: [{ number: 1, word: "ฉัน" }, { number: 2, word: "ชอบ" }, { number: 3, word: "กิน" }, { number: 4, word: "อาหาร" }, { number: 5, word: "ไทย" }], correctAnswer: "ฉันชอบกินอาหารไทย" },
    { shuffledWords: [{ number: 1, word: "นักศึกษา" }, { number: 2, word: "เรียน" }, { number: 3, word: "ภาษา" }, { number: 4, word: "ไทย" }, { number: 5, word: "ทุกวัน" }], correctAnswer: "นักศึกษาเรียนภาษาไทยทุกวัน" },
];

const sentenceConstructionPairs = [
    { word1: "หอประชุม", word2: "กิจกรรม" },
    { word1: "พู่กัน", word2: "เขียน" },
    { word1: "โขน", word2: "แสดง" },
    { word1: "ลงทะเบียน", word2: "เว็บไซต์" },
    { word1: "เงินรางวัล", word2: "ชนะ" },
    { word1: "วัฒนธรรม", word2: "เรียนรู้" },
    { word1: "บัณฑิต", word2: "ชุดครุย" },
    { word1: "หนวดเครา", word2: "โกน" },
    { word1: "มหาวิทยาลัย", word2: "เรียน" },
    { word1: "อาหาร", word2: "อร่อย" },
];

export async function POST() {
    try {
        let results = { vocab: 0, fillBlank: 0, wordOrder: 0, sentence: 0 };

        for (const vocab of chineseVocabulary) {
            await prisma.chineseVocabulary.upsert({
                where: { chineseWord: vocab.chineseWord },
                update: {},
                create: vocab,
            });
            results.vocab++;
        }

        const existingFillBlank = await prisma.fillBlankQuestion.count();
        if (existingFillBlank === 0) {
            for (const q of fillBlankQuestions) {
                await prisma.fillBlankQuestion.create({ data: q });
                results.fillBlank++;
            }
        }

        const existingWordOrder = await prisma.wordOrderQuestion.count();
        if (existingWordOrder === 0) {
            for (const q of wordOrderQuestions) {
                await prisma.wordOrderQuestion.create({
                    data: {
                        shuffledWords: q.shuffledWords,
                        correctAnswer: q.correctAnswer,
                    },
                });
                results.wordOrder++;
            }
        }

        const existingSentence = await prisma.sentenceConstructionPair.count();
        if (existingSentence === 0) {
            for (const p of sentenceConstructionPairs) {
                await prisma.sentenceConstructionPair.create({ data: p });
                results.sentence++;
            }
        }

        return NextResponse.json({
            status: "ok",
            message: "Seed completed",
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
        chineseVocabulary: await prisma.chineseVocabulary.count(),
        fillBlankQuestions: await prisma.fillBlankQuestion.count(),
        wordOrderQuestions: await prisma.wordOrderQuestion.count(),
        sentenceConstructionPairs: await prisma.sentenceConstructionPair.count(),
    };
    
    return NextResponse.json({
        status: "ok",
        counts,
    });
}
