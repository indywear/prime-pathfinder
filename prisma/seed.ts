import { neon } from "@neondatabase/serverless";

// Use environment variable - never hardcode credentials
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("❌ DATABASE_URL environment variable is required");
    process.exit(1);
}

const sql = neon(connectionString);

// Fill-in-Blank Questions (เติมคำ)
const fillBlankQuestions = [
    { sentence: "นักศึกษาเดินเข้า __________ ใหญ่ของมหาวิทยาลัยเพื่อทำพิธีรับปริญญา", answer: "หอประชุม", category: "การศึกษา", difficulty: "MEDIUM" },
    { sentence: "การรำไทยเป็นส่วนหนึ่งของ __________ ที่สะท้อนเอกลักษณ์ของชาติ", answer: "นาฏศิลป์", category: "วัฒนธรรม", difficulty: "HARD" },
    { sentence: "ตัวละครทศกัณฐ์เป็นหัวใจสำคัญในการแสดง __________ เรื่องรามเกียรติ์", answer: "โขน", category: "วัฒนธรรม", difficulty: "HARD" },
    { sentence: "ผู้ชนะเลิศการประกวดร้องเพลงจะได้รับ __________ มูลค่าหนึ่งแสนบาท", answer: "เงินรางวัล", category: "ทั่วไป", difficulty: "MEDIUM" },
    { sentence: "เมื่อจบหลักสูตรระยะสั้น ผู้เรียนจะได้รับ __________ ทุกคน", answer: "ประกาศนียบัตร", category: "การศึกษา", difficulty: "MEDIUM" },
    { sentence: "ผู้เข้าชมงานต้อง __________ หน้างานก่อนรับของที่ระลึก", answer: "ลงทะเบียน", category: "ทั่วไป", difficulty: "EASY" },
    { sentence: "การเรียนรู้ __________ ที่สองจะช่วยให้เราติดต่อสื่อสารกับชาวต่างชาติได้ดีขึ้น", answer: "ภาษา", category: "การศึกษา", difficulty: "EASY" },
    { sentence: "การไหว้และการแต่งกายชุดไทยเป็นส่วนหนึ่งของ __________ ที่งดงาม", answer: "วัฒนธรรม", category: "วัฒนธรรม", difficulty: "EASY" },
    { sentence: "การพูดในที่สาธารณะเป็น __________ ที่พนักงานทุกคนควรฝึกฝน", answer: "ทักษะ", category: "ทั่วไป", difficulty: "MEDIUM" },
    { sentence: "พ่อแม่รู้สึกภูมิใจมากที่เห็นลูกสวมชุด __________ ในวันรับปริญญาบัตร", answer: "ครุย", category: "การศึกษา", difficulty: "HARD" },
    { sentence: "เขาไป __________ ที่โรงพยาบาลเพราะไม่สบาย", answer: "พบแพทย์", category: "สุขภาพ", difficulty: "EASY" },
    { sentence: "ฉันต้องการซื้อ __________ ใหม่เพราะอันเก่าพังแล้ว", answer: "โทรศัพท์", category: "ทั่วไป", difficulty: "EASY" },
    { sentence: "ทุกเช้าแม่จะทำ __________ ให้ลูกๆ กินก่อนไปโรงเรียน", answer: "อาหารเช้า", category: "ครอบครัว", difficulty: "EASY" },
    { sentence: "น้ำท่วมทำให้ __________ หลายสายต้องหยุดให้บริการ", answer: "รถไฟฟ้า", category: "คมนาคม", difficulty: "MEDIUM" },
    { sentence: "ครูให้นักเรียน __________ รายงานส่งภายในสัปดาห์นี้", answer: "เขียน", category: "การศึกษา", difficulty: "EASY" },
];

// Multiple Choice Questions (เลือกตอบ)
const multipleChoiceQuestions = [
    { question: "คำว่า 'สวัสดี' ใช้ทักทายในสถานการณ์ใด?", optionA: "ใช้ได้ทั้งตอนพบและลาจาก", optionB: "ใช้ได้เฉพาะตอนพบกัน", optionC: "ใช้ได้เฉพาะตอนลาจาก", optionD: "ใช้ได้เฉพาะตอนขอบคุณ", correctAnswer: "A", category: "ไวยากรณ์", difficulty: "EASY" },
    { question: "ประโยค 'ฉันไปตลาด' เป็นประโยคชนิดใด?", optionA: "ประโยคคำถาม", optionB: "ประโยคบอกเล่า", optionC: "ประโยคคำสั่ง", optionD: "ประโยคอุทาน", correctAnswer: "B", category: "ไวยากรณ์", difficulty: "EASY" },
    { question: "คำใดเป็นคำนาม?", optionA: "วิ่ง", optionB: "สวย", optionC: "หนังสือ", optionD: "เร็ว", correctAnswer: "C", category: "ไวยากรณ์", difficulty: "EASY" },
    { question: "'แม่ครัว' หมายถึงอะไร?", optionA: "คนที่ทำความสะอาดบ้าน", optionB: "คนที่ทำอาหาร", optionC: "คนที่ขายของ", optionD: "คนที่สอนหนังสือ", correctAnswer: "B", category: "คำศัพท์", difficulty: "EASY" },
    { question: "วันใดเป็นวันหยุดราชการของไทย?", optionA: "วันจันทร์", optionB: "วันศุกร์", optionC: "วันเสาร์-อาทิตย์", optionD: "วันพุธ", correctAnswer: "C", category: "ความรู้ทั่วไป", difficulty: "EASY" },
    { question: "การ 'ไหว้' ในวัฒนธรรมไทยแสดงถึงอะไร?", optionA: "ความโกรธ", optionB: "ความเคารพ", optionC: "ความเศร้า", optionD: "ความกลัว", correctAnswer: "B", category: "วัฒนธรรม", difficulty: "EASY" },
    { question: "คำว่า 'ขอบคุณ' ใช้ในสถานการณ์ใด?", optionA: "เมื่อต้องการขอโทษ", optionB: "เมื่อได้รับความช่วยเหลือ", optionC: "เมื่อต้องการทักทาย", optionD: "เมื่อต้องการลาจาก", correctAnswer: "B", category: "มารยาท", difficulty: "EASY" },
    { question: "ข้อใดเป็นคำกริยา?", optionA: "บ้าน", optionB: "สวย", optionC: "กิน", optionD: "เร็ว", correctAnswer: "C", category: "ไวยากรณ์", difficulty: "EASY" },
    { question: "'มหาวิทยาลัย' หมายถึงสถานที่ใด?", optionA: "ที่พักอาศัย", optionB: "สถานที่ศึกษาระดับอุดมศึกษา", optionC: "ที่ทำงาน", optionD: "ที่ซื้อของ", correctAnswer: "B", category: "คำศัพท์", difficulty: "EASY" },
    { question: "คำว่า 'ครับ/ค่ะ' ใช้เพื่ออะไร?", optionA: "แสดงความโกรธ", optionB: "แสดงความสุภาพ", optionC: "แสดงความเศร้า", optionD: "แสดงความสงสัย", correctAnswer: "B", category: "มารยาท", difficulty: "EASY" },
    { question: "ประโยค 'คุณชื่ออะไร?' เป็นประโยคชนิดใด?", optionA: "ประโยคบอกเล่า", optionB: "ประโยคคำถาม", optionC: "ประโยคคำสั่ง", optionD: "ประโยคอุทาน", correctAnswer: "B", category: "ไวยากรณ์", difficulty: "EASY" },
    { question: "คำใดตรงข้ามกับ 'ร้อน'?", optionA: "อุ่น", optionB: "หนาว", optionC: "ชื้น", optionD: "แห้ง", correctAnswer: "B", category: "คำศัพท์", difficulty: "EASY" },
];

// Sentence Construction Pairs (เขียนประโยค)
const sentenceConstructionPairs = [
    { word1: "หอประชุม", word2: "กิจกรรม", category: "การศึกษา", difficulty: "MEDIUM" },
    { word1: "พู่กัน", word2: "เขียน", category: "ศิลปะ", difficulty: "MEDIUM" },
    { word1: "โขน", word2: "แสดง", category: "วัฒนธรรม", difficulty: "HARD" },
    { word1: "ลงทะเบียน", word2: "เว็บไซต์", category: "เทคโนโลยี", difficulty: "MEDIUM" },
    { word1: "เงินรางวัล", word2: "ชนะ", category: "การแข่งขัน", difficulty: "MEDIUM" },
    { word1: "วัฒนธรรม", word2: "เรียนรู้", category: "การศึกษา", difficulty: "MEDIUM" },
    { word1: "บัณฑิต", word2: "ชุดครุย", category: "การศึกษา", difficulty: "HARD" },
    { word1: "อาหาร", word2: "อร่อย", category: "ทั่วไป", difficulty: "EASY" },
    { word1: "ท่องเที่ยว", word2: "สถานที่", category: "การเดินทาง", difficulty: "EASY" },
    { word1: "ครอบครัว", word2: "ความสุข", category: "ครอบครัว", difficulty: "EASY" },
    { word1: "เพื่อน", word2: "ช่วยเหลือ", category: "ความสัมพันธ์", difficulty: "EASY" },
    { word1: "ภาษาไทย", word2: "ฝึกฝน", category: "การศึกษา", difficulty: "EASY" },
];

// Badges (required by gamification system)
const badges = [
    { badgeType: "CURIOUS_LEARNER", name: "Curious Learner", nameThai: "ผู้ใฝ่รู้", description: "Request feedback 10 times", requirement: 10 },
    { badgeType: "DILIGENT_WRITER", name: "Diligent Writer", nameThai: "นักเขียนขยัน", description: "Submit 4 consecutive weeks", requirement: 4 },
    { badgeType: "EARLY_BIRD", name: "Early Bird", nameThai: "ส่งไว", description: "Submit early 3 times", requirement: 3 },
    { badgeType: "VOCAB_MASTER_100", name: "Vocabulary Master", nameThai: "คำศัพท์ 100", description: "Learn 100 vocabulary words", requirement: 100 },
    { badgeType: "IMPROVER", name: "Fast Improver", nameThai: "นักพัฒนา", description: "Improve scores 3 times in a row", requirement: 3 },
    { badgeType: "PRACTICE_CHAMPION", name: "Practice Champion", nameThai: "แชมป์ฝึกฝน", description: "Complete 50 practice sessions", requirement: 50 },
    { badgeType: "PERFECT_SCORE", name: "Perfect Score", nameThai: "คะแนนเต็ม", description: "Get 100/100 on a submission", requirement: 100 },
    { badgeType: "FIRE_STREAK", name: "Fire Streak", nameThai: "ต่อเนื่อง 7 วัน", description: "Maintain a 7-day streak", requirement: 7 },
];

// Gacha Vocabulary Pool
const gachaVocabs = [
    // COMMON
    { word: "สวัสดี", meaning: "Hello / สวัสดี", rarity: "COMMON" },
    { word: "ขอบคุณ", meaning: "Thank you / ขอบคุณ", rarity: "COMMON" },
    { word: "อาหาร", meaning: "Food / อาหาร", rarity: "COMMON" },
    { word: "น้ำ", meaning: "Water / น้ำ", rarity: "COMMON" },
    { word: "บ้าน", meaning: "House / บ้าน", rarity: "COMMON" },
    { word: "โรงเรียน", meaning: "School / โรงเรียน", rarity: "COMMON" },
    { word: "หนังสือ", meaning: "Book / หนังสือ", rarity: "COMMON" },
    { word: "เพื่อน", meaning: "Friend / เพื่อน", rarity: "COMMON" },
    // RARE
    { word: "ประกาศนียบัตร", meaning: "Certificate / ใบประกาศ", rarity: "RARE" },
    { word: "มหาวิทยาลัย", meaning: "University / มหาวิทยาลัย", rarity: "RARE" },
    { word: "นาฏศิลป์", meaning: "Performing Arts / ศิลปะการแสดง", rarity: "RARE" },
    { word: "วัฒนธรรม", meaning: "Culture / วัฒนธรรม", rarity: "RARE" },
    // EPIC
    { word: "หอประชุม", meaning: "Auditorium / ห้องประชุมใหญ่", rarity: "EPIC" },
    { word: "ปรมาจารย์", meaning: "Grand Master / ผู้เชี่ยวชาญ", rarity: "EPIC" },
    // LEGENDARY
    { word: "ราชาภาษาไทย", meaning: "Thai Language King / ผู้เชี่ยวชาญภาษาไทย", rarity: "LEGENDARY" },
];

async function main() {
    console.log("🌱 Starting seed...");

    // Seed Badges (required by gamification)
    console.log("🏅 Seeding badges...");
    for (const b of badges) {
        await sql`
            INSERT INTO "Badge" ("id", "badgeType", "name", "nameThai", "description", "requirement")
            VALUES (gen_random_uuid(), ${b.badgeType}, ${b.name}, ${b.nameThai}, ${b.description}, ${b.requirement})
            ON CONFLICT ("badgeType") DO NOTHING
        `;
    }
    console.log(`✅ Seeded ${badges.length} badges`);

    // Seed Fill-in-Blank Questions
    console.log("📝 Seeding fill-in-blank questions...");
    for (const q of fillBlankQuestions) {
        await sql`
            INSERT INTO "FillBlankQuestion" ("id", "sentence", "answer", "category", "difficulty", "createdAt")
            VALUES (gen_random_uuid(), ${q.sentence}, ${q.answer}, ${q.category}, ${q.difficulty}::"Difficulty", now())
            ON CONFLICT DO NOTHING
        `;
    }
    console.log(`✅ Seeded ${fillBlankQuestions.length} fill-in-blank questions`);

    // Seed Multiple Choice Questions
    console.log("📋 Seeding multiple choice questions...");
    for (const q of multipleChoiceQuestions) {
        await sql`
            INSERT INTO "MultipleChoiceQuestion" ("id", "question", "optionA", "optionB", "optionC", "optionD", "correctAnswer", "category", "difficulty", "createdAt")
            VALUES (gen_random_uuid(), ${q.question}, ${q.optionA}, ${q.optionB}, ${q.optionC}, ${q.optionD}, ${q.correctAnswer}, ${q.category}, ${q.difficulty}::"Difficulty", now())
            ON CONFLICT DO NOTHING
        `;
    }
    console.log(`✅ Seeded ${multipleChoiceQuestions.length} multiple choice questions`);

    // Seed Sentence Construction Pairs
    console.log("✍️ Seeding sentence construction pairs...");
    for (const p of sentenceConstructionPairs) {
        await sql`
            INSERT INTO "SentenceConstructionPair" ("id", "word1", "word2", "category", "difficulty", "createdAt")
            VALUES (gen_random_uuid(), ${p.word1}, ${p.word2}, ${p.category}, ${p.difficulty}::"Difficulty", now())
            ON CONFLICT DO NOTHING
        `;
    }
    console.log(`✅ Seeded ${sentenceConstructionPairs.length} sentence pairs`);

    // Seed Gacha Vocabulary Pool
    console.log("🎰 Seeding gacha vocabulary...");
    for (const v of gachaVocabs) {
        await sql`
            INSERT INTO "GachaVocab" ("id", "word", "meaning", "rarity", "createdAt")
            VALUES (gen_random_uuid(), ${v.word}, ${v.meaning}, ${v.rarity}, now())
            ON CONFLICT ("word") DO NOTHING
        `;
    }
    console.log(`✅ Seeded ${gachaVocabs.length} gacha vocabulary`);

    // Seed Thai Idiom Questions (สำนวนไทย)
    console.log("🏮 Seeding Thai idiom questions...");
    const thaiIdiomQuestions = [
        // EASY
        { idiom: "น้ำขึ้นให้รีบตัก", meaning: "มีโอกาสดีให้รีบคว้าไว้", wrongA: "ต้องรีบดื่มน้ำ", wrongB: "น้ำท่วมต้องรีบหนี", wrongC: "ให้ช่วยกันตักน้ำ", example: "งานดีๆ แบบนี้หายาก น้ำขึ้นให้รีบตัก รีบสมัครเลย", hint: "เกี่ยวกับโอกาส", difficulty: "EASY" },
        { idiom: "ปากหวาน", meaning: "พูดจาไพเราะ อ่อนหวาน", wrongA: "ชอบกินของหวาน", wrongB: "ปากเปื้อนน้ำตาล", wrongC: "เสียงดัง", example: "เขาปากหวานจริงๆ ใครๆ ก็ชอบ", hint: "เกี่ยวกับการพูด", difficulty: "EASY" },
        { idiom: "ตาร้อน", meaning: "อิจฉาริษยา", wrongA: "ตาแดงเพราะแพ้", wrongB: "โกรธมาก", wrongC: "แสบตาเพราะแดด", example: "เห็นเพื่อนได้รถใหม่ ตาร้อนจัง", hint: "เกี่ยวกับอารมณ์", difficulty: "EASY" },
        { idiom: "มือถือสาก", meaning: "ทำตัวเป็นคนดีแต่หาประโยชน์ใส่ตัว", wrongA: "ถือโทรศัพท์ตลอดเวลา", wrongB: "มือแข็งแรงมาก", wrongC: "จับอะไรก็หัก", example: "เขาดูเหมือนช่วยเหลือ แต่จริงๆ มือถือสาก", hint: "เกี่ยวกับนิสัย", difficulty: "EASY" },
        { idiom: "ปิดทองหลังพระ", meaning: "ทำดีโดยไม่หวังให้ใครเห็น", wrongA: "ทำบุญที่วัด", wrongB: "ซ่อนของไว้หลังพระ", wrongC: "แอบทำผิด", example: "แม่เป็นคนปิดทองหลังพระ ทำดีไม่เคยบอกใคร", hint: "เกี่ยวกับการทำดี", difficulty: "EASY" },
        { idiom: "กินปูนร้อนท้อง", meaning: "รู้สึกร้อนใจเพราะทำผิด", wrongA: "ปวดท้องเพราะกินปูน", wrongB: "อาหารเผ็ดมาก", wrongC: "หิวข้าวมาก", example: "ทำผิดแล้วกินปูนร้อนท้อง นอนไม่หลับ", hint: "เกี่ยวกับความรู้สึกผิด", difficulty: "EASY" },
        { idiom: "หนักไม่เอา เบาไม่สู้", meaning: "ไม่ขยัน ไม่ยอมทำงาน", wrongA: "ยกของไม่ไหว", wrongB: "ป่วยอ่อนแรง", wrongC: "เลือกกินอาหาร", example: "คนหนักไม่เอา เบาไม่สู้ ใครจะอยากจ้าง", hint: "เกี่ยวกับนิสัยการทำงาน", difficulty: "EASY" },
        // MEDIUM
        { idiom: "ขี่ช้างจับตั๊กแตน", meaning: "ลงทุนมากเพื่อผลน้อยนิด", wrongA: "ชอบเลี้ยงสัตว์หลายชนิด", wrongB: "ขี่ช้างเก่งมาก", wrongC: "ทำอะไรก็สำเร็จ", example: "ส่งทหาร 100 คนจับโจร 1 คน ขี่ช้างจับตั๊กแตนชัดๆ", hint: "เปรียบเทียบ สิ่งใหญ่กับสิ่งเล็ก", difficulty: "MEDIUM" },
        { idiom: "รำไม่ดี โทษปี่โทษกลอง", meaning: "ทำไม่ดีแล้วโทษคนอื่น", wrongA: "ดนตรีเสียงไม่ดี", wrongB: "ไม่เก่งเรื่องดนตรี", wrongC: "นักดนตรีเล่นผิดคีย์", example: "สอบตกก็ต้องโทษตัวเอง อย่ารำไม่ดีโทษปี่โทษกลอง", hint: "เกี่ยวกับการโทษคนอื่น", difficulty: "MEDIUM" },
        { idiom: "งมเข็มในมหาสมุทร", meaning: "ทำสิ่งที่ยากมากจนแทบเป็นไปไม่ได้", wrongA: "ดำน้ำหาของในทะเล", wrongB: "เย็บผ้าบนเรือ", wrongC: "จับปลาในทะเล", example: "หาคนหายในเมืองใหญ่ เหมือนงมเข็มในมหาสมุทร", hint: "เกี่ยวกับความยาก", difficulty: "MEDIUM" },
        { idiom: "ตำน้ำพริกละลายแม่น้ำ", meaning: "ลงทุนน้อยแต่ได้ผลตอบแทนมาก", wrongA: "ทำอาหารเผ็ดมาก", wrongB: "น้ำพริกรสเผ็ดดี", wrongC: "ทำอาหารลงทะเล", example: "ลงทุนหมื่นเดียวกำไรแสน ตำน้ำพริกละลายแม่น้ำเลย", hint: "เกี่ยวกับการลงทุนและผลตอบแทน", difficulty: "MEDIUM" },
        { idiom: "กว่าถั่วจะสุกงาก็ไหม้", meaning: "รอคอยนานจนเกินไป อาจเสียโอกาส", wrongA: "ทำอาหารไม่เก่ง", wrongB: "ไม่ชอบกินถั่ว", wrongC: "งาสุกก่อนถั่ว", example: "รอเขาตัดสินใจ กว่าถั่วจะสุกงาก็ไหม้", hint: "เกี่ยวกับการรอคอย", difficulty: "MEDIUM" },
        // HARD
        { idiom: "ฆ่าควายอย่าเสียดายพริก", meaning: "ทำการใหญ่ไม่ต้องเสียดายค่าใช้จ่ายเล็กน้อย", wrongA: "พริกมีค่ามากกว่าควาย", wrongB: "ฆ่าสัตว์ไม่ดี", wrongC: "อย่ากินพริกมาก", example: "จัดงานแต่งงานแล้ว ก็จัดให้ดีเลย ฆ่าควายอย่าเสียดายพริก", hint: "เกี่ยวกับการลงทุนทำสิ่งใหญ่", difficulty: "HARD" },
        { idiom: "พูดไปสองไพเบี้ย นิ่งเสียตำลึงทอง", meaning: "การนิ่งเฉยมีค่ามากกว่าการพูดมาก", wrongA: "พูดแล้วได้เงิน", wrongB: "ทองคำมีค่ามากที่สุด", wrongC: "ให้พูดเพื่อหาเงิน", example: "บางทีไม่ต้องตอบโต้ พูดไปสองไพเบี้ย นิ่งเสียตำลึงทอง", hint: "เปรียบเทียบค่าของการพูดกับการนิ่ง", difficulty: "HARD" },
    ];
    for (const q of thaiIdiomQuestions) {
        await sql`
            INSERT INTO "ThaiIdiomQuestion" ("id", "idiom", "meaning", "wrongA", "wrongB", "wrongC", "example", "hint", "difficulty", "createdAt")
            VALUES (gen_random_uuid(), ${q.idiom}, ${q.meaning}, ${q.wrongA}, ${q.wrongB}, ${q.wrongC}, ${q.example}, ${q.hint}, ${q.difficulty}::"Difficulty", now())
            ON CONFLICT DO NOTHING
        `;
    }
    console.log(`✅ Seeded ${thaiIdiomQuestions.length} Thai idiom questions`);

    // Seed Thai Culture Questions (วัฒนธรรมไทย/มารยาท)
    console.log("🙏 Seeding Thai culture questions...");
    const thaiCultureQuestions = [
        // EASY — มารยาท
        { situation: "เมื่อเดินผ่านผู้ใหญ่ที่นั่งอยู่ ควรทำอย่างไร?", correct: "ก้มตัวเล็กน้อยขณะเดินผ่าน", wrongA: "เดินตรงๆ ผ่านไป", wrongB: "วิ่งผ่านให้เร็วที่สุด", wrongC: "หยุดยืนรอจนผู้ใหญ่ลุก", explanation: "การก้มตัวเดินผ่านผู้ใหญ่เป็นมารยาทไทยที่แสดงความเคารพ เรียกว่า หมอบ หรือ ค้อม", category: "manners", hint: "เกี่ยวกับการแสดงความเคารพ", difficulty: "EASY" },
        { situation: "เมื่อรับของจากผู้ใหญ่ ควรใช้มือข้างไหน?", correct: "ใช้สองมือรับ", wrongA: "ใช้มือซ้ายรับ", wrongB: "ใช้มือขวารับ", wrongC: "ใช้มือไหนก็ได้", explanation: "การรับของจากผู้ใหญ่ควรใช้สองมือรับ แสดงความเคารพ ห้ามใช้มือซ้ายเพียงข้างเดียว", category: "manners", hint: "เกี่ยวกับมือ", difficulty: "EASY" },
        { situation: "เมื่อพระสงฆ์เดินผ่าน ผู้หญิงควรทำอย่างไร?", correct: "หลีกทาง ไม่สัมผัสพระสงฆ์", wrongA: "ไหว้พระสงฆ์ทุกครั้ง", wrongB: "ส่งของให้พระสงฆ์โดยตรง", wrongC: "เดินเคียงข้างพระสงฆ์", explanation: "ผู้หญิงต้องไม่สัมผัสตัวพระสงฆ์ หรือส่งของถือมือโดยตรง ถ้าจะถวายของต้องวางบนผ้า", category: "culture", hint: "เกี่ยวกับข้อห้ามทางศาสนา", difficulty: "EASY" },
        { situation: "การไหว้ผู้ใหญ่ในวัฒนธรรมไทย ปลายนิ้วควรอยู่ตรงไหน?", correct: "ปลายนิ้วอยู่ระหว่างคิ้ว", wrongA: "ปลายนิ้วอยู่ที่คาง", wrongB: "ปลายนิ้วอยู่ที่หน้าอก", wrongC: "ปลายนิ้วอยู่เหนือศีรษะ", explanation: "การไหว้ผู้ใหญ่ ปลายนิ้วชี้ขึ้นอยู่ระหว่างคิ้ว ส่วนการไหว้พระ ปลายนิ้วอยู่ที่หน้าผาก", category: "greetings", hint: "เกี่ยวกับระดับของการไหว้", difficulty: "EASY" },
        { situation: "ในวัฒนธรรมไทย ห้ามชี้นิ้วที่ส่วนไหนของคนอื่น?", correct: "ศีรษะ", wrongA: "มือ", wrongB: "เท้า", wrongC: "ไหล่", explanation: "คนไทยถือว่าศีรษะเป็นส่วนที่สูงสุดของร่างกาย ไม่ควรจับหรือชี้ศีรษะคนอื่น", category: "taboo", hint: "ส่วนที่คนไทยถือว่าสูงสุดของร่างกาย", difficulty: "EASY" },
        { situation: "เมื่อนั่งในวัด ควรนั่งท่าไหน?", correct: "นั่งพับเพียบ", wrongA: "นั่งขัดสมาธิ", wrongB: "นั่งเหยียดขา", wrongC: "นั่งท่าไหนก็ได้", explanation: "ในวัดควรนั่งพับเพียบ ไม่ควรเหยียดเท้าไปทางพระพุทธรูป เพราะถือว่าเท้าเป็นส่วนต่ำสุดของร่างกาย", category: "manners", hint: "เกี่ยวกับการนั่งอย่างเคารพ", difficulty: "EASY" },
        // MEDIUM — วัฒนธรรม
        { situation: "วันสงกรานต์ (ปีใหม่ไทย) ตรงกับวันที่เท่าไหร่?", correct: "13 เมษายน", wrongA: "1 มกราคม", wrongB: "5 ธันวาคม", wrongC: "15 เมษายน", explanation: "วันสงกรานต์เป็นวันขึ้นปีใหม่ไทย ตรงกับวันที่ 13 เมษายนของทุกปี มีประเพณีรดน้ำดำหัวผู้ใหญ่", category: "culture", hint: "เดือนเมษายน", difficulty: "MEDIUM" },
        { situation: "คำว่า สวัสดี ใช้ได้ในสถานการณ์ใดบ้าง?", correct: "ได้ทั้งตอนพบและจากลา", wrongA: "ใช้ตอนพบเท่านั้น", wrongB: "ใช้ตอนจากลาเท่านั้น", wrongC: "ใช้เฉพาะกับผู้ใหญ่", explanation: "สวัสดี เป็นคำทักทายสากลของไทย ใช้ได้ทั้งตอนพบหน้าและจากลา มาจากภาษาสันสกฤต แปลว่า ความดีงาม", category: "greetings", hint: "เป็นคำทักทายที่ใช้ได้หลายโอกาส", difficulty: "MEDIUM" },
        { situation: "ห้ามเหยียบธรณีประตูวัด เพราะเหตุใด?", correct: "เชื่อว่าเป็นที่สิงสถิตของวิญญาณผู้พิทักษ์", wrongA: "เพราะธรณีประตูเปราะบาง", wrongB: "เพราะทำให้โชคร้าย", wrongC: "ไม่มีเหตุผลพิเศษ", explanation: "คนไทยเชื่อว่าธรณีประตูเป็นที่พำนักของเทพยดาหรือวิญญาณผู้พิทักษ์วัด การเหยียบถือเป็นการไม่เคารพ", category: "taboo", hint: "เกี่ยวกับความเชื่อเรื่องวิญญาณ", difficulty: "MEDIUM" },
        { situation: "เมื่อให้ของขวัญคนไทย ไม่ควรห่อสีอะไร?", correct: "สีดำ", wrongA: "สีแดง", wrongB: "สีทอง", wrongC: "สีชมพู", explanation: "ในวัฒนธรรมไทย สีดำเกี่ยวข้องกับงานศพและความเศร้า จึงไม่เหมาะที่จะใช้ห่อของขวัญ", category: "culture", hint: "สีที่เกี่ยวกับงานศพ", difficulty: "MEDIUM" },
        { situation: "คำไทยที่ห้ามพูดในวัง (คำต้องห้าม) เรียกว่าอะไร?", correct: "คำราชาศัพท์ต้องใช้แทนคำธรรมดา", wrongA: "ห้ามพูดทุกคำ", wrongB: "พูดได้เฉพาะภาษาอังกฤษ", wrongC: "ต้องพูดเบาๆ เท่านั้น", explanation: "เมื่ออยู่ในวังหรือพูดถึงพระราชวงศ์ ต้องใช้ราชาศัพท์ เช่น เสวย แทน กิน, บรรทม แทน นอน", category: "taboo", hint: "เกี่ยวกับภาษาพิเศษสำหรับพระราชวงศ์", difficulty: "MEDIUM" },
        // HARD
        { situation: "ลอยกระทง มีจุดประสงค์ดั้งเดิมเพื่ออะไร?", correct: "ขอขมาพระแม่คงคา", wrongA: "อธิษฐานขอพร", wrongB: "ฉลองวันเกิดพระพุทธเจ้า", wrongC: "ส่งวิญญาณผู้ล่วงลับ", explanation: "ประเพณีลอยกระทงจัดขึ้นในวันเพ็ญเดือน 12 เพื่อขอขมาพระแม่คงคาที่ใช้น้ำในชีวิตประจำวัน", category: "culture", hint: "เกี่ยวกับน้ำ", difficulty: "HARD" },
        { situation: "คำว่า ไม่เป็นไร ในวัฒนธรรมไทย สะท้อนค่านิยมอะไร?", correct: "ความใจเย็น ปล่อยวาง ไม่ถือสา", wrongA: "ไม่สนใจปัญหา", wrongB: "ไม่เข้าใจสถานการณ์", wrongC: "ไม่มีความรับผิดชอบ", explanation: "ไม่เป็นไร สะท้อนค่านิยม สบายๆ ของคนไทย คือความใจเย็น ไม่ถือสา ให้อภัยง่าย", category: "culture", hint: "เกี่ยวกับนิสัยคนไทย", difficulty: "HARD" },
    ];
    for (const q of thaiCultureQuestions) {
        await sql`
            INSERT INTO "ThaiCultureQuestion" ("id", "situation", "correct", "wrongA", "wrongB", "wrongC", "explanation", "category", "hint", "difficulty", "createdAt")
            VALUES (gen_random_uuid(), ${q.situation}, ${q.correct}, ${q.wrongA}, ${q.wrongB}, ${q.wrongC}, ${q.explanation}, ${q.category}, ${q.hint}, ${q.difficulty}::"Difficulty", now())
            ON CONFLICT DO NOTHING
        `;
    }
    console.log(`✅ Seeded ${thaiCultureQuestions.length} Thai culture questions`);

    // Seed Fix Sentence Questions (แก้ไขประโยค)
    console.log("🔧 Seeding fix sentence questions...");
    const fixSentenceQuestions = [
        // EASY
        { wrongSentence: "ฉันไปตลาดเมื่อวานนี้กับเพื่อนของฉันเพื่อซื้อผัก", correctSentence: "ฉันไปตลาดเมื่อวานนี้กับเพื่อนเพื่อซื้อผัก", hint: "คำซ้ำที่ไม่จำเป็น", difficulty: "EASY" },
        { wrongSentence: "เขาชอบกินข้าวผัดมากที่สุดเลย", correctSentence: "เขาชอบกินข้าวผัดมากที่สุด", hint: "คำฟุ่มเฟือย", difficulty: "EASY" },
        { wrongSentence: "แม่ของฉันทำอาหารอร่อยมากๆ เลยค่ะ", correctSentence: "แม่ทำอาหารอร่อยมากค่ะ", hint: "คำซ้ำและคำฟุ่มเฟือย", difficulty: "EASY" },
        { wrongSentence: "นักเรียนทุกๆ คนต้องมาโรงเรียนทุกวัน", correctSentence: "นักเรียนทุกคนต้องมาโรงเรียนทุกวัน", hint: "คำซ้ำ ทุกๆ → ทุก", difficulty: "EASY" },
        { wrongSentence: "วันนี้อากาศดีมากเลยนะครับ ดีจริงๆ", correctSentence: "วันนี้อากาศดีมากครับ", hint: "คำฟุ่มเฟือยและซ้ำความ", difficulty: "EASY" },
        // MEDIUM
        { wrongSentence: "เขาเดินทางไปกรุงเทพโดยรถไฟตั้งแต่เมื่อวาน", correctSentence: "เขาเดินทางไปกรุงเทพฯ โดยรถไฟตั้งแต่เมื่อวาน", hint: "ชื่อเฉพาะต้องมี ฯ", difficulty: "MEDIUM" },
        { wrongSentence: "ครูบอกให้นักเรียนส่งการบ้านในวันจันทร์หน้า", correctSentence: "ครูบอกให้นักเรียนส่งการบ้านวันจันทร์หน้า", hint: "คำบุพบทไม่จำเป็น", difficulty: "MEDIUM" },
        { wrongSentence: "ผมรู้สึกดีใจมากที่ได้พบกับคุณในวันนี้ครับ", correctSentence: "ผมดีใจมากที่ได้พบคุณวันนี้ครับ", hint: "คำฟุ่มเฟือย: รู้สึก, กับ, ใน", difficulty: "MEDIUM" },
        { wrongSentence: "เธอเป็นคนที่สวยที่สุดในห้องเรียนของเรา", correctSentence: "เธอสวยที่สุดในห้องเรียน", hint: "โครงสร้างภาษาจีน: เป็นคนที่...", difficulty: "MEDIUM" },
        { wrongSentence: "พรุ่งนี้ฉันจะไปที่ห้างสรรพสินค้าเพื่อจะซื้อเสื้อผ้า", correctSentence: "พรุ่งนี้ฉันจะไปห้างสรรพสินค้าเพื่อซื้อเสื้อผ้า", hint: "คำบุพบทและกริยาซ้ำ", difficulty: "MEDIUM" },
        // HARD
        { wrongSentence: "ถึงแม้ว่าฝนจะตกหนักมาก แต่ว่าเขาก็ยังคงออกไปทำงาน", correctSentence: "ถึงแม้ฝนจะตกหนัก เขาก็ยังออกไปทำงาน", hint: "สันธานซ้ำ: ว่า, แต่ว่า, ยังคง", difficulty: "HARD" },
        { wrongSentence: "สาเหตุที่ทำให้เกิดปัญหานี้ขึ้นมาก็เพราะว่าเขาไม่ได้เตรียมตัว", correctSentence: "ปัญหานี้เกิดขึ้นเพราะเขาไม่ได้เตรียมตัว", hint: "ประโยคยาวเกินไป ตัดคำฟุ่มเฟือย", difficulty: "HARD" },
        { wrongSentence: "ในปัจจุบันนี้คนไทยส่วนใหญ่มักจะนิยมชอบกินอาหารฟาสต์ฟู้ด", correctSentence: "ปัจจุบันคนไทยส่วนใหญ่นิยมกินอาหารฟาสต์ฟู้ด", hint: "คำซ้ำความ: นิยม+ชอบ, มักจะ+นิยม", difficulty: "HARD" },
        { wrongSentence: "เขาเป็นคนที่มีความรับผิดชอบต่อหน้าที่การงานของเขาเป็นอย่างดี", correctSentence: "เขามีความรับผิดชอบต่อหน้าที่การงานเป็นอย่างดี", hint: "สไตล์ภาษาจีน + คำซ้ำ", difficulty: "HARD" },
        { wrongSentence: "จากการที่ได้มีโอกาสไปเที่ยวต่างประเทศทำให้ฉันได้เรียนรู้วัฒนธรรมใหม่ๆ", correctSentence: "การไปเที่ยวต่างประเทศทำให้ฉันเรียนรู้วัฒนธรรมใหม่ๆ", hint: "คำนำฟุ่มเฟือย: จากการที่ได้มีโอกาส", difficulty: "HARD" },
    ];
    for (const q of fixSentenceQuestions) {
        await sql`
            INSERT INTO "FixSentenceQuestion" ("id", "wrongSentence", "correctSentence", "hint", "difficulty", "createdAt")
            VALUES (gen_random_uuid(), ${q.wrongSentence}, ${q.correctSentence}, ${q.hint}, ${q.difficulty}::"Difficulty", now())
            ON CONFLICT DO NOTHING
        `;
    }
    console.log(`✅ Seeded ${fixSentenceQuestions.length} fix sentence questions`);

    console.log("🎉 Seed completed successfully!");
}

main().catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
});
