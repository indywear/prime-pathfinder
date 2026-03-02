// Extra Batch 1: Thai Language Learning Questions
// For foreign learners studying Thai language

// ============================================================
// 1. Multiple Choice Questions (25 items)
// ============================================================

export const extraMultipleChoiceQuestions: {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: "A" | "B" | "C" | "D";
  difficulty: "EASY" | "MEDIUM" | "HARD";
}[] = [
  // --- EASY (10 items) ---
  {
    question: "คำว่า 'ขอโทษ' ใช้ในสถานการณ์ใด?",
    optionA: "เมื่อต้องการขอบคุณ",
    optionB: "เมื่อต้องการขอโทษหรือขอความช่วยเหลือ",
    optionC: "เมื่อต้องการทักทาย",
    optionD: "เมื่อต้องการลาจาก",
    correctAnswer: "B",
    difficulty: "EASY",
  },
  {
    question: "'แมว' เป็นคำชนิดใด?",
    optionA: "คำกริยา",
    optionB: "คำวิเศษณ์",
    optionC: "คำนาม",
    optionD: "คำสันธาน",
    correctAnswer: "C",
    difficulty: "EASY",
  },
  {
    question: "ข้อใดเป็นคำทักทายตอนเช้า?",
    optionA: "ราตรีสวัสดิ์",
    optionB: "อรุณสวัสดิ์",
    optionC: "สวัสดีปีใหม่",
    optionD: "ลาก่อน",
    correctAnswer: "B",
    difficulty: "EASY",
  },
  {
    question: "คำว่า 'กิน' มีความหมายตรงกับข้อใด?",
    optionA: "ดื่ม",
    optionB: "นอน",
    optionC: "รับประทานอาหาร",
    optionD: "วิ่ง",
    correctAnswer: "C",
    difficulty: "EASY",
  },
  {
    question: "วันจันทร์ วันอังคาร วัน_______ คือวันอะไร?",
    optionA: "วันศุกร์",
    optionB: "วันพฤหัสบดี",
    optionC: "วันพุธ",
    optionD: "วันเสาร์",
    correctAnswer: "C",
    difficulty: "EASY",
  },
  {
    question: "'สีแดง' เป็นสีอะไรในภาษาอังกฤษ?",
    optionA: "Blue",
    optionB: "Green",
    optionC: "Yellow",
    optionD: "Red",
    correctAnswer: "D",
    difficulty: "EASY",
  },
  {
    question: "ข้อใดเป็นประโยคคำถาม?",
    optionA: "ฉันชอบกินข้าว",
    optionB: "เขาไปโรงเรียน",
    optionC: "คุณชื่ออะไร?",
    optionD: "วันนี้อากาศดี",
    correctAnswer: "C",
    difficulty: "EASY",
  },
  {
    question: "ตัวเลข '๕' อ่านว่าอะไร?",
    optionA: "สาม",
    optionB: "สี่",
    optionC: "ห้า",
    optionD: "หก",
    correctAnswer: "C",
    difficulty: "EASY",
  },
  {
    question: "คำว่า 'พ่อ' หมายถึงใคร?",
    optionA: "แม่",
    optionB: "พี่ชาย",
    optionC: "ลุง",
    optionD: "บิดา",
    correctAnswer: "D",
    difficulty: "EASY",
  },
  {
    question: "'ช้าง' เป็นสัตว์ชนิดใด?",
    optionA: "สัตว์เลื้อยคลาน",
    optionB: "สัตว์เลี้ยงลูกด้วยนม",
    optionC: "สัตว์ปีก",
    optionD: "สัตว์ครึ่งบกครึ่งน้ำ",
    correctAnswer: "B",
    difficulty: "EASY",
  },

  // --- MEDIUM (5 items) ---
  {
    question: "สำนวนไทย 'น้ำขึ้นให้รีบตัก' มีความหมายว่าอย่างไร?",
    optionA: "ให้ประหยัดน้ำ",
    optionB: "ให้รีบฉวยโอกาสเมื่อมี",
    optionC: "ให้ไปตักน้ำตอนน้ำขึ้น",
    optionD: "ให้ระวังน้ำท่วม",
    correctAnswer: "B",
    difficulty: "MEDIUM",
  },
  {
    question: "ข้อใดใช้คำลักษณนามถูกต้อง?",
    optionA: "รถ 3 ตัว",
    optionB: "แมว 2 คัน",
    optionC: "ปากกา 5 ด้าม",
    optionD: "หนังสือ 4 ใบ",
    correctAnswer: "C",
    difficulty: "MEDIUM",
  },
  {
    question: "'เขาไม่เคยไปเที่ยวต่างประเทศเลย' เป็นประโยคชนิดใด?",
    optionA: "ประโยคบอกเล่า",
    optionB: "ประโยคปฏิเสธ",
    optionC: "ประโยคคำถาม",
    optionD: "ประโยคคำสั่ง",
    correctAnswer: "B",
    difficulty: "MEDIUM",
  },
  {
    question: "คำว่า 'ศีรษะ' หมายถึงส่วนใดของร่างกาย?",
    optionA: "มือ",
    optionB: "เท้า",
    optionC: "หัว",
    optionD: "ท้อง",
    correctAnswer: "C",
    difficulty: "MEDIUM",
  },
  {
    question: "ข้อใดเป็นคำสุภาพที่ใช้แทนคำว่า 'ตาย'?",
    optionA: "ล้มเลิก",
    optionB: "ถึงแก่กรรม",
    optionC: "หมดแรง",
    optionD: "ล้มป่วย",
    correctAnswer: "B",
    difficulty: "MEDIUM",
  },

  // --- HARD (10 items) ---
  {
    question: "ราชาศัพท์ของคำว่า 'กิน' สำหรับพระมหากษัตริย์คือข้อใด?",
    optionA: "รับประทาน",
    optionB: "เสวย",
    optionC: "ฉัน",
    optionD: "ทาน",
    correctAnswer: "B",
    difficulty: "HARD",
  },
  {
    question: "คำว่า 'อุปสรรค' ในภาษาไทยมาจากภาษาใด?",
    optionA: "ภาษาจีน",
    optionB: "ภาษาเขมร",
    optionC: "ภาษาบาลีสันสกฤต",
    optionD: "ภาษาอังกฤษ",
    correctAnswer: "C",
    difficulty: "HARD",
  },
  {
    question: "ข้อใดเป็นการใช้คำราชาศัพท์ถูกต้อง?",
    optionA: "พระบาทสมเด็จพระเจ้าอยู่หัวทรงพระดำเนิน",
    optionB: "พระบาทสมเด็จพระเจ้าอยู่หัวเดินทาง",
    optionC: "พระบาทสมเด็จพระเจ้าอยู่หัวไปเที่ยว",
    optionD: "พระบาทสมเด็จพระเจ้าอยู่หัวย้ายที่",
    correctAnswer: "A",
    difficulty: "HARD",
  },
  {
    question: "คำว่า 'โคลงสี่สุภาพ' เป็นคำประพันธ์ประเภทใด?",
    optionA: "กลอนสุภาพ",
    optionB: "ร่าย",
    optionC: "โคลง",
    optionD: "ฉันท์",
    correctAnswer: "C",
    difficulty: "HARD",
  },
  {
    question: "สำนวนไทย 'กระต่ายตื่นตูม' มีความหมายว่าอย่างไร?",
    optionA: "ตื่นเต้นกับเรื่องดีๆ",
    optionB: "ตกใจง่ายโดยไม่มีเหตุผล",
    optionC: "ชอบตื่นแต่เช้า",
    optionD: "ทำงานรวดเร็ว",
    correctAnswer: "B",
    difficulty: "HARD",
  },
  {
    question: "ข้อใดใช้คำเชื่อม 'แม้...ก็' ถูกต้อง?",
    optionA: "แม้ฝนตก ก็ไปโรงเรียน",
    optionB: "แม้ฝนตก เพราะไปโรงเรียน",
    optionC: "แม้ฝนตก แต่ไปโรงเรียน",
    optionD: "แม้ฝนตก หรือไปโรงเรียน",
    correctAnswer: "A",
    difficulty: "HARD",
  },
  {
    question: "'กาพย์ยานี ๑๑' มีจำนวนกี่พยางค์ต่อบาท?",
    optionA: "8 พยางค์",
    optionB: "9 พยางค์",
    optionC: "11 พยางค์",
    optionD: "14 พยางค์",
    correctAnswer: "C",
    difficulty: "HARD",
  },
  {
    question: "ราชาศัพท์ของคำว่า 'นอน' สำหรับพระมหากษัตริย์คือข้อใด?",
    optionA: "บรรทม",
    optionB: "จำวัด",
    optionC: "นิทรา",
    optionD: "พักผ่อน",
    correctAnswer: "A",
    difficulty: "HARD",
  },
  {
    question: "คำว่า 'บริจาค' มีรากศัพท์มาจากภาษาใด?",
    optionA: "ภาษามลายู",
    optionB: "ภาษาบาลี",
    optionC: "ภาษาจีน",
    optionD: "ภาษาเขมร",
    correctAnswer: "B",
    difficulty: "HARD",
  },
  {
    question: "ข้อใดเป็น 'คำซ้อน' ในภาษาไทย?",
    optionA: "เดินเล่น",
    optionB: "บ้านเรือน",
    optionC: "กินข้าว",
    optionD: "อ่านหนังสือ",
    correctAnswer: "B",
    difficulty: "HARD",
  },
];

// ============================================================
// 2. Fill in the Blank Questions (20 items)
// ============================================================

export const extraFillBlankQuestions: {
  sentence: string;
  answer: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
}[] = [
  // --- EASY (8 items) ---
  {
    sentence: "ฉัน__________ ข้าวทุกวัน",
    answer: "กิน",
    difficulty: "EASY",
  },
  {
    sentence: "พ่อ__________ ไปทำงานตอนเช้า",
    answer: "ขับรถ",
    difficulty: "EASY",
  },
  {
    sentence: "วันนี้อากาศ__________ มาก",
    answer: "ร้อน",
    difficulty: "EASY",
  },
  {
    sentence: "เด็กๆ __________ ที่สนามเด็กเล่น",
    answer: "เล่น",
    difficulty: "EASY",
  },
  {
    sentence: "น้อง__________ นมทุกเช้า",
    answer: "ดื่ม",
    difficulty: "EASY",
  },
  {
    sentence: "แม่ไป__________ ของที่ตลาด",
    answer: "ซื้อ",
    difficulty: "EASY",
  },
  {
    sentence: "ปลา__________ อยู่ในน้ำ",
    answer: "ว่าย",
    difficulty: "EASY",
  },
  {
    sentence: "ดอกไม้สีแดงมี__________ หอม",
    answer: "กลิ่น",
    difficulty: "EASY",
  },

  // --- MEDIUM (4 items) ---
  {
    sentence: "เขาเป็นคนที่มี__________ดี จึงมีเพื่อนมาก",
    answer: "มนุษยสัมพันธ์",
    difficulty: "MEDIUM",
  },
  {
    sentence: "นักเรียนต้องส่ง__________ก่อนวันศุกร์",
    answer: "การบ้าน",
    difficulty: "MEDIUM",
  },
  {
    sentence: "การ__________เป็นสิ่งสำคัญในการเรียนรู้ภาษาใหม่",
    answer: "ฝึกฝน",
    difficulty: "MEDIUM",
  },
  {
    sentence: "ประเทศไทยมี__________ที่สวยงามและเป็นเอกลักษณ์",
    answer: "ศิลปวัฒนธรรม",
    difficulty: "MEDIUM",
  },

  // --- HARD (8 items) ---
  {
    sentence: "พระบาทสมเด็จพระเจ้าอยู่หัว__________พระราชดำรัสแก่ประชาชน",
    answer: "พระราชทาน",
    difficulty: "HARD",
  },
  {
    sentence: "วรรณคดีเรื่อง__________เป็นผลงานของสุนทรภู่",
    answer: "พระอภัยมณี",
    difficulty: "HARD",
  },
  {
    sentence: "คำว่า 'โอษฐ์' เป็นราชาศัพท์ของคำว่า__________",
    answer: "ปาก",
    difficulty: "HARD",
  },
  {
    sentence: "สำนวน '__________' หมายถึง ให้รีบทำเมื่อมีโอกาส อย่ารอช้า",
    answer: "น้ำขึ้นให้รีบตัก",
    difficulty: "HARD",
  },
  {
    sentence: "พระราชพิธี__________จัดขึ้นในเดือนพฤษภาคมของทุกปี",
    answer: "จรดพระนังคัลแรกนาขวัญ",
    difficulty: "HARD",
  },
  {
    sentence: "คำประพันธ์ประเภท 'ฉันท์' มีการกำหนด__________ในแต่ละบาท",
    answer: "ครุลหุ",
    difficulty: "HARD",
  },
  {
    sentence: "ราชาศัพท์ของคำว่า 'เดิน' สำหรับพระมหากษัตริย์คือ__________",
    answer: "ทรงพระดำเนิน",
    difficulty: "HARD",
  },
  {
    sentence: "สำนวน '__________' หมายถึง ปิดบังสิ่งใหญ่ไม่ได้",
    answer: "ช้างตายทั้งตัว เอาใบบัวปิดไม่มิด",
    difficulty: "HARD",
  },
];

// ============================================================
// 3. Vocabulary Match Questions (22 items)
// ============================================================

export const extraVocabMatchQuestions: {
  word: string;
  meaning: string;
  wrongA: string;
  wrongB: string;
  wrongC: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
}[] = [
  // --- EASY (8 items) ---
  {
    word: "หมา",
    meaning: "สัตว์เลี้ยงสี่ขาที่เห่าได้",
    wrongA: "สัตว์ที่บินได้",
    wrongB: "สัตว์ที่อยู่ในน้ำ",
    wrongC: "แมลงตัวเล็ก",
    difficulty: "EASY",
  },
  {
    word: "ดอกไม้",
    meaning: "ส่วนของพืชที่มีกลีบสีสวยและมีกลิ่นหอม",
    wrongA: "ส่วนของต้นไม้ที่อยู่ใต้ดิน",
    wrongB: "ผลของต้นไม้ที่กินได้",
    wrongC: "ใบของต้นไม้สีเขียว",
    difficulty: "EASY",
  },
  {
    word: "ฝน",
    meaning: "น้ำที่ตกลงมาจากท้องฟ้า",
    wrongA: "ลมที่พัดแรง",
    wrongB: "แสงจากดวงอาทิตย์",
    wrongC: "เมฆบนท้องฟ้า",
    difficulty: "EASY",
  },
  {
    word: "ตา",
    meaning: "อวัยวะสำหรับมองเห็น",
    wrongA: "อวัยวะสำหรับได้ยิน",
    wrongB: "อวัยวะสำหรับรับกลิ่น",
    wrongC: "อวัยวะสำหรับรับรส",
    difficulty: "EASY",
  },
  {
    word: "เสื้อ",
    meaning: "เครื่องนุ่งห่มที่สวมท่อนบน",
    wrongA: "เครื่องนุ่งห่มที่สวมท่อนล่าง",
    wrongB: "เครื่องประดับศีรษะ",
    wrongC: "รองเท้า",
    difficulty: "EASY",
  },
  {
    word: "โทรศัพท์",
    meaning: "อุปกรณ์สำหรับพูดคุยกับคนอื่นทางไกล",
    wrongA: "อุปกรณ์สำหรับทำอาหาร",
    wrongB: "อุปกรณ์สำหรับเขียนหนังสือ",
    wrongC: "อุปกรณ์สำหรับตัดผม",
    difficulty: "EASY",
  },
  {
    word: "ข้าว",
    meaning: "ธัญพืชที่เป็นอาหารหลักของคนไทย",
    wrongA: "เครื่องดื่มร้อน",
    wrongB: "ผลไม้รสเปรี้ยว",
    wrongC: "ขนมหวาน",
    difficulty: "EASY",
  },
  {
    word: "ถนน",
    meaning: "ทางสำหรับรถและคนเดิน",
    wrongA: "แม่น้ำที่ไหลเร็ว",
    wrongB: "อาคารสูง",
    wrongC: "สวนสาธารณะ",
    difficulty: "EASY",
  },

  // --- MEDIUM (6 items) ---
  {
    word: "ประหยัด",
    meaning: "ใช้จ่ายอย่างระมัดระวัง ไม่สุรุ่ยสุร่าย",
    wrongA: "ใช้จ่ายไม่ยั้ง",
    wrongB: "เก็บสะสมสิ่งของ",
    wrongC: "ซื้อสิ่งของราคาแพง",
    difficulty: "MEDIUM",
  },
  {
    word: "อุตสาหกรรม",
    meaning: "การผลิตสินค้าจำนวนมากโดยใช้เครื่องจักร",
    wrongA: "การทำเกษตรกรรม",
    wrongB: "การค้าขายสินค้า",
    wrongC: "การบริการด้านการเงิน",
    difficulty: "MEDIUM",
  },
  {
    word: "สัญญา",
    meaning: "ข้อตกลงที่ผูกมัดระหว่างบุคคลตั้งแต่สองฝ่ายขึ้นไป",
    wrongA: "การพูดคุยทั่วไป",
    wrongB: "การทักทายกัน",
    wrongC: "ความคิดส่วนตัว",
    difficulty: "MEDIUM",
  },
  {
    word: "สิ่งแวดล้อม",
    meaning: "สิ่งต่างๆ ที่อยู่รอบตัวเรา ทั้งธรรมชาติและที่มนุษย์สร้างขึ้น",
    wrongA: "อาคารบ้านเรือน",
    wrongB: "อุปกรณ์อิเล็กทรอนิกส์",
    wrongC: "อาหารและเครื่องดื่ม",
    difficulty: "MEDIUM",
  },
  {
    word: "บรรยากาศ",
    meaning: "สภาพอากาศหรือความรู้สึกโดยรวมของสถานที่",
    wrongA: "อุณหภูมิของน้ำ",
    wrongB: "ขนาดของห้อง",
    wrongC: "จำนวนคน",
    difficulty: "MEDIUM",
  },
  {
    word: "ประสบการณ์",
    meaning: "ความรู้หรือทักษะที่ได้จากการเจอเหตุการณ์จริง",
    wrongA: "ความรู้จากตำรา",
    wrongB: "ความฝันในตอนกลางคืน",
    wrongC: "ข่าวลือจากคนอื่น",
    difficulty: "MEDIUM",
  },

  // --- HARD (8 items) ---
  {
    word: "ทรงพระกรุณา",
    meaning: "มีพระเมตตา (ราชาศัพท์)",
    wrongA: "ทรงพระสำราญ",
    wrongB: "ทรงพระพิโรธ",
    wrongC: "ทรงประชวร",
    difficulty: "HARD",
  },
  {
    word: "อริยสัจ",
    meaning: "ความจริงอันประเสริฐ 4 ประการในพุทธศาสนา",
    wrongA: "พิธีกรรมทางศาสนา",
    wrongB: "บทสวดมนต์",
    wrongC: "ชื่อพระพุทธรูปสำคัญ",
    difficulty: "HARD",
  },
  {
    word: "วิสัยทัศน์",
    meaning: "มุมมองหรือภาพในอนาคตที่ต้องการให้เป็น",
    wrongA: "ความสามารถในการมองเห็น",
    wrongB: "ทิศทางลม",
    wrongC: "ระยะทางไกลสุดที่มองเห็น",
    difficulty: "HARD",
  },
  {
    word: "อัตถ์",
    meaning: "เนื้อความ ประโยชน์ ความหมาย (ภาษาบาลี)",
    wrongA: "ตัวอักษร",
    wrongB: "สระในภาษาไทย",
    wrongC: "เครื่องหมายวรรคตอน",
    difficulty: "HARD",
  },
  {
    word: "พิธีกร",
    meaning: "ผู้ดำเนินรายการหรือพิธีการต่างๆ",
    wrongA: "ผู้ชมรายการ",
    wrongB: "ผู้ถ่ายทำรายการ",
    wrongC: "ผู้สนับสนุนรายการ",
    difficulty: "HARD",
  },
  {
    word: "มโนสาเร่",
    meaning: "เรื่องเล็กน้อย ไม่สำคัญ",
    wrongA: "เรื่องใหญ่โต",
    wrongB: "เรื่องน่ากลัว",
    wrongC: "เรื่องลึกลับ",
    difficulty: "HARD",
  },
  {
    word: "สัมผัส",
    meaning: "การคล้องจองเสียงในบทกวี หรือการแตะต้อง",
    wrongA: "การร้องเพลง",
    wrongB: "การเต้นรำ",
    wrongC: "การวาดภาพ",
    difficulty: "HARD",
  },
  {
    word: "ปรัชญา",
    meaning: "ความรู้เกี่ยวกับความจริง เหตุผล และคุณค่าของชีวิต",
    wrongA: "วิชาคำนวณ",
    wrongB: "วิชาทดลองทางวิทยาศาสตร์",
    wrongC: "การศึกษาประวัติศาสตร์",
    difficulty: "HARD",
  },
];

// ============================================================
// 4. Vocabulary Opposite Questions (22 items)
// ============================================================

export const extraVocabOppositeQuestions: {
  word: string;
  opposite: string;
  wrongA: string;
  wrongB: string;
  wrongC: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
}[] = [
  // --- EASY (8 items) ---
  {
    word: "ขึ้น",
    opposite: "ลง",
    wrongA: "ไป",
    wrongB: "มา",
    wrongC: "วิ่ง",
    difficulty: "EASY",
  },
  {
    word: "ซ้าย",
    opposite: "ขวา",
    wrongA: "บน",
    wrongB: "ล่าง",
    wrongC: "หน้า",
    difficulty: "EASY",
  },
  {
    word: "มืด",
    opposite: "สว่าง",
    wrongA: "เงียบ",
    wrongB: "ร้อน",
    wrongC: "เย็น",
    difficulty: "EASY",
  },
  {
    word: "อ้วน",
    opposite: "ผอม",
    wrongA: "สูง",
    wrongB: "เตี้ย",
    wrongC: "สั้น",
    difficulty: "EASY",
  },
  {
    word: "เปิด",
    opposite: "ปิด",
    wrongA: "หยุด",
    wrongB: "เริ่ม",
    wrongC: "พัก",
    difficulty: "EASY",
  },
  {
    word: "หนาว",
    opposite: "ร้อน",
    wrongA: "อุ่น",
    wrongB: "เย็น",
    wrongC: "ชื้น",
    difficulty: "EASY",
  },
  {
    word: "ยาว",
    opposite: "สั้น",
    wrongA: "กว้าง",
    wrongB: "แคบ",
    wrongC: "หนา",
    difficulty: "EASY",
  },
  {
    word: "หวาน",
    opposite: "ขม",
    wrongA: "เปรี้ยว",
    wrongB: "เค็ม",
    wrongC: "เผ็ด",
    difficulty: "EASY",
  },

  // --- MEDIUM (6 items) ---
  {
    word: "สำเร็จ",
    opposite: "ล้มเหลว",
    wrongA: "พยายาม",
    wrongB: "เริ่มต้น",
    wrongC: "ดำเนินการ",
    difficulty: "MEDIUM",
  },
  {
    word: "ยินดี",
    opposite: "เสียใจ",
    wrongA: "ตกใจ",
    wrongB: "ประหลาดใจ",
    wrongC: "สงสัย",
    difficulty: "MEDIUM",
  },
  {
    word: "ขยัน",
    opposite: "ขี้เกียจ",
    wrongA: "เหนื่อย",
    wrongB: "ง่วง",
    wrongC: "เบื่อ",
    difficulty: "MEDIUM",
  },
  {
    word: "ซื่อสัตย์",
    opposite: "ทุจริต",
    wrongA: "เฉลียว",
    wrongB: "โอ้อวด",
    wrongC: "ขี้ขลาด",
    difficulty: "MEDIUM",
  },
  {
    word: "ยอมรับ",
    opposite: "ปฏิเสธ",
    wrongA: "ลังเล",
    wrongB: "สงสัย",
    wrongC: "ถามซ้ำ",
    difficulty: "MEDIUM",
  },
  {
    word: "รวย",
    opposite: "จน",
    wrongA: "ประหยัด",
    wrongB: "ตระหนี่",
    wrongC: "ฟุ่มเฟือย",
    difficulty: "MEDIUM",
  },

  // --- HARD (8 items) ---
  {
    word: "อุดมสมบูรณ์",
    opposite: "แห้งแล้ง",
    wrongA: "กว้างขวาง",
    wrongB: "คับแคบ",
    wrongC: "สงบเงียบ",
    difficulty: "HARD",
  },
  {
    word: "กตัญญู",
    opposite: "อกตัญญู",
    wrongA: "เมตตา",
    wrongB: "กรุณา",
    wrongC: "อิจฉา",
    difficulty: "HARD",
  },
  {
    word: "สันติ",
    opposite: "สงคราม",
    wrongA: "ความเงียบ",
    wrongB: "ความสงบ",
    wrongC: "ความมืด",
    difficulty: "HARD",
  },
  {
    word: "คุณธรรม",
    opposite: "อธรรม",
    wrongA: "ศีลธรรม",
    wrongB: "จริยธรรม",
    wrongC: "ทุจริต",
    difficulty: "HARD",
  },
  {
    word: "ยกย่อง",
    opposite: "ดูถูก",
    wrongA: "ชมเชย",
    wrongB: "สรรเสริญ",
    wrongC: "นับถือ",
    difficulty: "HARD",
  },
  {
    word: "เจริญ",
    opposite: "เสื่อม",
    wrongA: "หยุด",
    wrongB: "พัก",
    wrongC: "เปลี่ยน",
    difficulty: "HARD",
  },
  {
    word: "อนุรักษ์",
    opposite: "ทำลาย",
    wrongA: "สร้างสรรค์",
    wrongB: "ปรับปรุง",
    wrongC: "เปลี่ยนแปลง",
    difficulty: "HARD",
  },
  {
    word: "ประณีต",
    opposite: "หยาบกระด้าง",
    wrongA: "สวยงาม",
    wrongB: "ละเอียด",
    wrongC: "เรียบร้อย",
    difficulty: "HARD",
  },
];

// ============================================================
// 5. Vocabulary Synonym Questions (22 items)
// ============================================================

export const extraVocabSynonymQuestions: {
  word: string;
  synonym: string;
  wrongA: string;
  wrongB: string;
  wrongC: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
}[] = [
  // --- EASY (8 items) ---
  {
    word: "สนุก",
    synonym: "เพลิดเพลิน",
    wrongA: "เบื่อ",
    wrongB: "เหนื่อย",
    wrongC: "เศร้า",
    difficulty: "EASY",
  },
  {
    word: "โกรธ",
    synonym: "โมโห",
    wrongA: "ดีใจ",
    wrongB: "เขิน",
    wrongC: "สงสาร",
    difficulty: "EASY",
  },
  {
    word: "เหนื่อย",
    synonym: "อ่อนเพลีย",
    wrongA: "กระปรี้กระเปร่า",
    wrongB: "ตื่นเต้น",
    wrongC: "สดชื่น",
    difficulty: "EASY",
  },
  {
    word: "หิว",
    synonym: "อยากอาหาร",
    wrongA: "อิ่ม",
    wrongB: "ง่วง",
    wrongC: "เจ็บ",
    difficulty: "EASY",
  },
  {
    word: "ร้องไห้",
    synonym: "หลั่งน้ำตา",
    wrongA: "หัวเราะ",
    wrongB: "ตะโกน",
    wrongC: "กระซิบ",
    difficulty: "EASY",
  },
  {
    word: "กลัว",
    synonym: "หวาดกลัว",
    wrongA: "กล้าหาญ",
    wrongB: "มั่นใจ",
    wrongC: "สบายใจ",
    difficulty: "EASY",
  },
  {
    word: "ช่วย",
    synonym: "ช่วยเหลือ",
    wrongA: "ขัดขวาง",
    wrongB: "ทำลาย",
    wrongC: "ละเลย",
    difficulty: "EASY",
  },
  {
    word: "รัก",
    synonym: "รักใคร่",
    wrongA: "เกลียด",
    wrongB: "กลัว",
    wrongC: "เฉย",
    difficulty: "EASY",
  },

  // --- MEDIUM (6 items) ---
  {
    word: "เฉลียวฉลาด",
    synonym: "ปราดเปรื่อง",
    wrongA: "โง่เขลา",
    wrongB: "เซ่อซ่า",
    wrongC: "ซุ่มซ่าม",
    difficulty: "MEDIUM",
  },
  {
    word: "ทะเลาะ",
    synonym: "วิวาท",
    wrongA: "ปรองดอง",
    wrongB: "คืนดี",
    wrongC: "สมานฉันท์",
    difficulty: "MEDIUM",
  },
  {
    word: "กังวล",
    synonym: "วิตก",
    wrongA: "สบายใจ",
    wrongB: "มั่นใจ",
    wrongC: "ภูมิใจ",
    difficulty: "MEDIUM",
  },
  {
    word: "ขัดสน",
    synonym: "ยากจน",
    wrongA: "มั่งคั่ง",
    wrongB: "ร่ำรวย",
    wrongC: "เพียงพอ",
    difficulty: "MEDIUM",
  },
  {
    word: "แก้ไข",
    synonym: "ซ่อมแซม",
    wrongA: "ทำลาย",
    wrongB: "ละเลย",
    wrongC: "ปรับปรุง",
    difficulty: "MEDIUM",
  },
  {
    word: "ตั้งใจ",
    synonym: "มุ่งมั่น",
    wrongA: "เพิกเฉย",
    wrongB: "ละเลย",
    wrongC: "เลินเล่อ",
    difficulty: "MEDIUM",
  },

  // --- HARD (8 items) ---
  {
    word: "ปัญญา",
    synonym: "สติปัญญา",
    wrongA: "ความโง่เขลา",
    wrongB: "ความหลงผิด",
    wrongC: "ความประมาท",
    difficulty: "HARD",
  },
  {
    word: "อุปถัมภ์",
    synonym: "อุปการะ",
    wrongA: "ทอดทิ้ง",
    wrongB: "กดขี่",
    wrongC: "เอารัดเอาเปรียบ",
    difficulty: "HARD",
  },
  {
    word: "อาพาธ",
    synonym: "ประชวร",
    wrongA: "สิ้นพระชนม์",
    wrongB: "ทรงพระเจริญ",
    wrongC: "เสด็จพระราชดำเนิน",
    difficulty: "HARD",
  },
  {
    word: "วิริยะ",
    synonym: "ความเพียร",
    wrongA: "ความเกียจคร้าน",
    wrongB: "ความท้อแท้",
    wrongC: "ความหดหู่",
    difficulty: "HARD",
  },
  {
    word: "เอกภาพ",
    synonym: "ความเป็นอันหนึ่งอันเดียวกัน",
    wrongA: "ความแตกแยก",
    wrongB: "ความขัดแย้ง",
    wrongC: "ความหลากหลาย",
    difficulty: "HARD",
  },
  {
    word: "อาเพศ",
    synonym: "เหตุร้าย ลางร้าย",
    wrongA: "เหตุดี ลางดี",
    wrongB: "ความสวยงาม",
    wrongC: "ความสุข",
    difficulty: "HARD",
  },
  {
    word: "ทัศนคติ",
    synonym: "ความคิดเห็น มุมมอง",
    wrongA: "ข้อเท็จจริง",
    wrongB: "ความจำ",
    wrongC: "อารมณ์",
    difficulty: "HARD",
  },
  {
    word: "บำเพ็ญ",
    synonym: "ประพฤติปฏิบัติ",
    wrongA: "ละทิ้ง",
    wrongB: "ละเว้น",
    wrongC: "ยกเลิก",
    difficulty: "HARD",
  },
];
