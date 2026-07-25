import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "5mb" }));

// Initialize the Gemini AI client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Helper to handle missing api key safely
const checkApiKey = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY") {
    return res.status(500).json({
      error: "مفتاح Gemini API غير متاح في خادم التطبيق. يرجى تهيئته في لوحة Secrets في AI Studio.",
    });
  }
  next();
};

// 1. Generate questions from content
app.post("/api/generate-questions", checkApiKey, async (req, res) => {
  try {
    const { content, qType, qCount, bloomTarget, lang } = req.body;

    if (!content) {
      return res.status(400).json({ error: "المحتوى العلمي مطلوب للتوليد" });
    }

    const isEnglish = lang === "en";
    const count = parseInt(qCount, 10) || 3;
    const typeLabel =
      qType === "mcq"
        ? isEnglish ? "Multiple Choice (MCQ) with 4 choices" : "اختيار من متعدد (إجابة واحدة) بأربعة بدائل"
        : qType === "tf"
        ? isEnglish ? "True / False" : "صواب وخطأ"
        : qType === "fill"
        ? isEnglish ? "Fill in the blank with '___'" : "إكمال الفراغ بجملة مفيدة تحتوي على فراغ واحد ___"
        : qType === "matching"
        ? isEnglish ? "Matching & Pairing (Column A items to Column B items)" : "المزاوَجة والربط (ربط عناصر القائمة أ بعناصر القائمة ب)"
        : qType === "essay"
        ? isEnglish ? "Short Essay Question (Requires a concise written response + Model Answer & Rubric)" : "سؤال مقالي قصير (يتطلب إجابة كتابية مركزة مع إجابة نموذجية ودليل تصحيح)"
        : qType === "multi_mcq"
        ? isEnglish ? "Multiple Answer (Select ALL correct options among 4-5 choices)" : "اختيار متعدد الإجابات (تحديد جميع الإجابات الصحيحة من بين 4-5 خيارات)"
        : isEnglish ? "Ordering / Sequential Ranking (Arrange items in correct chronological or logical sequence)" : "الترتيب والتسلسل المنطقي/الزمني (ترتيب المفاهيم أو الخطوات في تسلسل صحيح)";

    const prompt = isEnglish
      ? `You are an expert pedagogical item writer and psychometric assessment reviewer.
Formulate ${count} questions of format "${typeLabel}" targeting the cognitive level "${bloomTarget}" from Bloom's Taxonomy based on the following scientific content:

"${content}"

Strict Psychometric Standards & Guidelines:
1. Multiple Choice Questions (MCQ):
   - CRITICAL RULE: The stem MUST ALWAYS be written as a clear declarative statement ending with a colon (:). STRICTLY DO NOT start the stem with question words or phrases (e.g. 'Which of the following...', 'What is...', 'How does...'), and DO NOT end with a question mark (?).
     - Example GOOD: "The primary distinction between validity and reliability in measurement tools is:"
     - Example BAD (FORBIDDEN): "Which of the following represents the main difference between validity and reliability?"
   - The stem must contain a single clear concept.
   - Avoid repeating common phrases across choices — place shared words into the item stem.
   - Never provide grammatical or verbal clues pointing to the correct key.
   - Distractors and choices must be strictly homogeneous, plausible, and equal in length and grammatical pattern to minimize guessing.
   - Do NOT use negative phrasing unless absolutely essential.
   - Ensure exactly ONE clear, indisputably correct answer.
   - STRICTLY avoid "All of the above", "None of the above", absolute words ("always", "never"), and vague qualifiers ("sometimes", "usually").

2. True / False Questions:
   - State a single factual, unambiguous idea per statement.
   - Distribute True and False keys evenly to avoid guessing patterns.
   - Avoid compound clauses or ambiguous terms.

3. Fill in the Blank Questions:
   - Provide sufficient sentence context so the blank ('___') requires an exact word or short phrase.
   - Limit to a single blank per sentence.

4. Matching Questions:
   - Format Column A (Premises) in options array, and Column B (Responses) mapped in correctAnswer.
   - Ensure Column B contains MORE responses than Column A premises to eliminate guessing by deduction.

5. Ordering / Sequencing Questions:
   - Provide unordered steps or concepts in options array, and the exact chronological/logical sequence in correctAnswer.

6. Short Essay Questions:
   - Provide concise prompt in stem, leave options empty, and provide clear model rubric & answer key in correctAnswer.`
      : `أنت خبير تربوي ومحكم اختبارات وأخصائي قياس وتقويم سيكومتري.
قم بصياغة ${count} أسئلة من نوع "${typeLabel}" مستهدفاً المستوى المعرفي "${bloomTarget}" من تصنيف بلوم المحدّث بناءً على المحتوى العلمي التالي:

"${content}"

معايير ضوابط الصياغة والتحكيم التربوي المعتمدة:

١. أسئلة الاختيار من متعدد (MCQ):
   - ضابط حاسم للجذع (رأس السؤال): يجب أن يصاغ رأس السؤال دائماً كجملة خبرية واضحة ومحددة تنتهي بنقطتين (:). يمنع منعاً باتاً البدء بأدوات أو صيغ استفهام مثل ("أي مما يلي"، "ما هو"، "ما هي"، "كيف"، "ما الفرق بين"، "أيها")، ويمنع الانتهاء بعلامة استفهام (؟).
     - مثال للرأس الصحيح (جملة خبرية): "الفرق الرئيسي بين الصدق والثبات في أدوات القياس يتمثل في:"
     - مثال للرأس الخاطئ الممنوع: "أي مما يلي يمثل الفرق الرئيسي بين الصدق والثبات في أدوات القياس؟"
   - أن يتضمن الجذع فكرة واحدة محددة وواضحة، مع صياغته بشكل موجز وتجنب تكرار الكلمات بالخيارات.
   - تجنب إعطاء الطالب أي دليل أو إيحاء لفظي أو نحوي على مفتاح الإجابة.
   - الخيارات/البدائل متجانسة ومتشابهة ومستقلة ومتساوية تماماً في الطول والنمط لتقليل عملية التخمين.
   - تجنب استخدام النفي أو النفي المزدوج إلا عند الضرورة القصوى.
   - وجود إجابة واحدة صحيحة ومحددة تماماً.
   - تجنب تماماً عبارات "كل ما سبق"، "لا شيء مما سبق"، والعبارات المطلقة مثل (دائماً، أبداً)، والكلمات الفضفاضة مثل (أحياناً، عادةً).

٢. أسئلة الصواب والخطأ (True/False):
   - احتواء الجملة على فكرة علمية واحدة محددة ودقيقة فقط.
   - توزيع الأسئلة بتوازن بين الصواب والخطأ للابتعاد عن النمطية والتخمين.
   - تجنب العبارات المركبة والعبارات الغامضة التي تحتمل التأويل.

٣. أسئلة إكمال الفراغ (Complete Questions):
   - صياغة جملة بسياق كافٍ يحدد الإجابة بدقة من خلال كلمة أو عبارة محددة بـ '___'.
   - اقتصار السؤال على فراغ واحد فقط في الجملة.

٤. أسئلة المزاوجة والربط (Matching):
   - عرض عناصر القائمة أ في الخيارات، واستجابات القائمة ب المزاوجة في الإجابة الصحيحة.
   - مراعاة أن يكون عدد الاستجابات (العمود ب) أكثر من عدد المثيرات (العمود أ) لتقليل التخمين بالاستبعاد.

٥. أسئلة الترتيب والتسلسل (Ordering/Sequencing):
   - عرض الخيارات غير المرتبة في الخيارات، والتسلسل الصحيح (الزمني أو المنطقي أو الإجرائي) في الإجابة الصحيحة.

٦. الأسئلة المقالية القصيرة (Short Essay):
   - صياغة السؤال بوضوح وإدراج دليل التصحيح والإجابة النموذجية في الإجابة الصحيحة.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              qType: { type: Type.STRING, description: "Type of question: 'mcq', 'tf', or 'fill'" },
              stem: { type: Type.STRING, description: "The question stem or sentence. For fill, contain '___'." },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Array of exactly 4 choices (only for mcq type). Otherwise empty.",
              },
              correctAnswer: { type: Type.STRING, description: "The correct choice/answer." },
              bloom: { type: Type.STRING, description: "Cognitive level of Bloom's Taxonomy." },
              difficulty: { type: Type.STRING, description: "Estimated difficulty level." },
              difficultyIndex: { type: Type.NUMBER, description: "Estimated facility/difficulty index p-value between 0.15 and 0.90 (e.g., 0.65)" },
              discriminationIndex: { type: Type.NUMBER, description: "Estimated discrimination index D-value between 0.15 and 0.60 (e.g., 0.42)" },
              discriminationStatus: { type: Type.STRING, description: "Discrimination classification: 'ممتاز', 'جيد', 'مقبول', or 'ضعيف'" },
              notes: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Brief educational reviews or design tips on this question.",
              },
            },
            required: ["qType", "stem", "correctAnswer", "bloom", "difficulty"],
          },
        },
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response from Gemini");
    }

    const questions = JSON.parse(resultText);
    res.json({ questions });
  } catch (error: any) {
    console.error("Error generating questions:", error);
    res.status(500).json({ error: error.message || "حدث خطأ أثناء توليد الأسئلة" });
  }
});

// 2. Audit/Improve question
const handleAuditQuestion = async (req: express.Request, res: express.Response) => {
  try {
    const { qType, stem, options, correctAnswer, lang, stage } = req.body;

    if (!stem) {
      return res.status(400).json({ error: "نص السؤال مطلوب" });
    }

    const isEnglish = lang === "en";
    const isStage3 = String(stage) === "3";
    const typeLabel =
      qType === "mcq" ? "Multiple Choice" : qType === "tf" ? "True / False" : "Fill in the Blank";
    const optionsText =
      options && options.length
        ? `\nCurrent choices:\n${options.map((o: string, i: number) => `${i + 1}- ${o}`).join("\n")}`
        : "";

    let prompt = "";
    if (isStage3) {
      prompt = isEnglish
        ? `You are a senior psychometrician and academic test auditing expert evaluating Stage 3: Comprehensive Psychometric Audit & Academic Certification.
Review the following academic test item of format "${typeLabel}":

Current Question Stem: "${stem}"${optionsText}
Current Correct Answer: "${correctAnswer || ""}"

Stage 3 Psychometric & Vetting Audit Criteria:
1. Cognitive Alignment & Bloom's Taxonomy: Ensure the item procedural verb aligns strictly with targeted cognitive depth without degradation.
2. Scientific Validity & Absolute Truth: Ensure complete scientific factual accuracy of the stem and model answer with zero ambiguity.
3. Distractor Misconception Diagnostic Power: Ensure distractors target genuine student misconceptions rather than arbitrary filler.
4. Psychometric Fairness & Bias-Free Wording: Ensure complete absence of cultural, gender, or contextual bias for all test takers.
5. Clear Scoring Rubric & Time Estimation: Ensure clear answer key, point weight, and estimated completion time.
6. Declarative Stem Format: STRICT REQUIREMENT: Stem MUST be a clear DECLARATIVE STATEMENT ending with a colon (:), NOT a question. Remove question words ("Which of the following", "What is", "How...") and remove question mark (?).

Requirements:
1. Provide a psychometrically certified version of the question stem (declarative statement ending with a colon :), optimized choices, correct answer, Bloom level, and difficulty.
2. Provide a psychometric quality score (0-100) based on Stage 3 audit rigor.
3. Provide a list of specific psychometric audit defect notes and recommendations in defectsFound.
4. Provide direct text replacement suggestions in 'criterionFixes' array for each criterion evaluated, specifying targetField ('stem', 'options', 'correctAnswer'), issueDescription, suggestedFixText, and action labels so teachers can apply fixes with a single click.`
        : `أنت خبير قياس وتقويم تربوي وأخصائي تحكيم اختبارات وسيكومترية أكاديمية لتقييم (المرحلة الثالثة: التقييم والتحكيم السيكومتري الشامل والاعتماد الأكاديمي).
قم بمراجعة ودراسة السؤال الأكاديمي التالي من نوع "${typeLabel}" وفحصه دقيقاً وفق معايير الاعتماد والتحكيم السيكومتري الشامل:

السؤال الحالي: "${stem}"${optionsText}
الإجابة الصحيحة الحالية: "${correctAnswer || ""}"

معايير التقييم والتحكيم السيكومتري للمرحلة الثالثة:
١. التوافق التام مع مستوى بلوم المعرفي ونواتج التعلم المستهدفة ومنع انخفاض المستوى المعرفي لسطحية الاسترجاع.
٢. الصدق العلمي والدقة الموضوعية القاطعة للمفهوم والإجابة النموذجية دون أي احتمالية للاختلاف الأكاديمي.
٣. فاعلية المشتتات والقدرة التشخيصية للمفاهيم الخاطئة الشائعة لدى المتعلمين وليس مجرد خيارات شكلية.
٤. العدالة السيكومترية وخلو السؤال تماماً من أي تحيّز ثقافي أو جندري أو سياقي لضمان فرصة متكافئة للجميع.
٥. وضوح مفتاح الإجابة والتقدير الزمني والدرجة وسُلم التقدير (Rubric).
٦. ضابط الجذع الأساسي: يجب تحويل رأس السؤال (الجذع) إلى "جملة خبرية" تنتهي بنقطتين (:)، وحذف أي أدوات أو صيغ استفهام وعلامة الاستفهام (؟).

المهام المطلوبة منك:
١. صغ نسخة محكمة ومجازة أكاديمياً من السؤال (الجذع جملة خبرية تنتهي بنقطتين : دون أسئلة).
٢. احسب درجة جودة سيكومترية دقيقة من (٠ إلى ١٠٠) بناءً على صرامة تحكيم المرحلة الثالثة.
٣. حدد مستوى بلوم المعرفي، وسجل قائمة بملاحظات وعيوب التقييم السيكومتري المكتشفة (defectsFound/feedback) بوضوح.
٤. قدم اقتراحات تعديل نصية مباشرة لكل معيار في مصفوفة 'criterionFixes' تتضمن النص المعدل الجاهز للاستبدال المباشر بضغطة زر واحدة.`;
    } else {
      prompt = isEnglish
        ? `You are a professional psychometric measurement and evaluation expert evaluating Stage 2: Item Refinement & Phrasing Rules.
Review the following academic test item of format "${typeLabel}" against strict item-writing rules:

Current Question Stem: "${stem}"${optionsText}
Current Correct Answer: "${correctAnswer || ""}"

Stage 2 Evaluation Criteria:
1. For MCQ: STRICT REQUIREMENT: The enhanced stem MUST be a clear DECLARATIVE STATEMENT ending with a colon (:), NOT a question. Remove question words ("Which of the following", "What is", "How...") and remove question mark (?). Ensure stem contains ONE clear concept. Check if common words are repeated in options (should be in stem). Check if choices are homogeneous and equal in length. Check for clues/verbal hints, negative words, "All/None of above", absolute words ("always/never"), or vague words ("sometimes/usually").
2. For True/False: Check for single factual idea, absence of double negatives or complex clauses.
3. For Fill-in-the-blank: Check for sufficient context and single blank ('___').
4. For Matching: Check that responses outnumber premises and items are homogeneous.
5. For Ordering: Check that sequence is unambiguous and logically linear.

Requirements:
1. Provide an enhanced/corrected question stem (MUST BE A DECLARATIVE STATEMENT ending with a colon : for MCQ/Multi-MCQ, with NO question words or question marks), balanced options (for MCQ), accurate correct answer, Bloom level, and difficulty.
2. Provide a quality score (0-100) based on compliance with these rules.
3. Provide a list of specific defect notes (feedback/defects found) highlighting any violated rules.
4. Provide direct text replacement suggestions in 'criterionFixes' array for each evaluated quality rule, specifying targetField ('stem', 'options', 'correctAnswer'), issueDescription, suggestedFixText, suggestedOptions (if applicable), and action labels.`
        : `أنت خبير قياس وتقويم تربوي وأخصائي تحكيم اختبارات لتقييم (المرحلة الثانية: التحسين والتدقيق الصياغي اللغوي).
قم بمراجعة ودراسة السؤال الأكاديمي التالي من نوع "${typeLabel}" وفحصه دقيقاً وفق معايير وقواعد صياغة بنود الاختبارات:

السؤال الحالي: "${stem}"${optionsText}
الإجابة الصحيحة الحالية: "${correctAnswer || ""}"

معايير التحكيم والتدقيق الصياغي للمرحلة الثانية:
١. في الاختيار من متعدد (MCQ):
   - شرط أساسي حاسم للجذع المُحسَّن: يجب تحويل رأس السؤال (الجذع) إلى "جملة خبرية" محددة تنتهي بنقطتين (:)، وحذف أي أدوات أو صيغ استفهام (مثل: "أي مما يلي"، "ما هو"، "ما هي"، "كيف"، "أيها"، "ما الفرق") وحذف علامة الاستفهام (؟).
   - التحقق من أن الجذع يحمل فكرة واحدة، خلو الخيارات من تكرار كلمات الجذع (الحشو)، تكافئ وتجانس البدائل في الطول والنمط، خلو السؤال من الإيحاء بالإجابة، عدم استخدام "كل ما سبق" أو "لا شيء مما سبق" أو ألفاظ مطلقة (دائماً/أبداً) أو فضفاضة (أحياناً/عادةً).
٢. في صواب وخطأ: التحقق من احتواء العبارة على فكرة علمية واحدة دقيقة دون تعقيد أو نفي مزدوج.
٣. في إكمال الفراغ: توفير سياق كافٍ يحدد الكلمة بوضوح وبفراغ واحد '___'.
٤. في المزاوجة: أن يكون عدد استجابات العمود (ب) أكثر من مثيرات العمود (أ) لمنع الاستبعاد بالتخمين.
٥. في الترتيب: وضوح التسلسل الإجرائي أو الزمني المباشر.

المهام المطلوبة منك:
١. صغ نسخة محسنة من السؤال (المتن يجب أن يكون جملة خبرية تنتهي بنقطتين : دون أدوات أو علامات استفهام، والخيارات المحسنة متقاربة الطول والنمط، والإجابة الصحيحة الدقيقة).
٢. احسب درجة جودة سيكومترية دقيقة من (٠ إلى ١٠٠) بناءً على مدى مدعاة السؤال لهذه الضوابط.
٣. حدد مستوى بلوم المعرفي، وسجل قائمة بملاحظات وعيوب الصياغة المكتشفة (defectsFound/feedback) بوضوح.
٤. قدم اقتراحات تعديل نصية مباشرة لكل معيار يواجه ملحوظة أو تحسيناً في مصفوفة 'criterionFixes' تتضمن النص المُعدل الجاهز للاستبدال المباشر بضغطة زر واحدة.`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            enhancedStem: { type: Type.STRING, description: "The enhanced/refined question stem." },
            enhancedOptions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "For MCQ, 4 optimized choice strings. Otherwise empty.",
            },
            enhancedCorrectAnswer: { type: Type.STRING, description: "The optimized correct answer value." },
            bloomClassification: { type: Type.STRING, description: "Bloom taxonomy level." },
            difficultyLevel: { type: Type.STRING, description: "Estimated difficulty level." },
            difficultyIndex: { type: Type.NUMBER, description: "Estimated facility/difficulty index p-value between 0.15 and 0.90 (e.g., 0.62)" },
            discriminationIndex: { type: Type.NUMBER, description: "Estimated discrimination index D-value between 0.15 and 0.60 (e.g., 0.45)" },
            discriminationStatus: { type: Type.STRING, description: "Discrimination classification: 'ممتاز', 'جيد', 'مقبول', or 'ضعيف'" },
            qualityScore: { type: Type.INTEGER, description: "Quality score from 0 to 100." },
            defectsFound: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Audit feedback and defect report points.",
            },
            criterionFixes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  criterionId: { type: Type.STRING, description: "ID or rule title of criterion, e.g., 'mcq_stem_declarative', 'mcq_homogeneous_distractors', 'mcq_no_clues', 'stem_clarity', 'correct_answer_explicit', 'bloom_alignment'" },
                  issueDescription: { type: Type.STRING, description: "Short description of the identified flaw" },
                  targetField: { type: Type.STRING, description: "'stem', 'options', 'correctAnswer', or 'all'" },
                  suggestedFixText: { type: Type.STRING, description: "Direct replacement text for stem/answer" },
                  suggestedOptions: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Array of proposed replacement options if options are targeted"
                  },
                  actionLabelAr: { type: Type.STRING, description: "Action button label in Arabic e.g. 'تطبيق التعديل على جذع السؤال'" },
                  actionLabelEn: { type: Type.STRING, description: "Action button label in English e.g. 'Apply Fix to Stem'" }
                },
                required: ["criterionId", "issueDescription", "targetField", "suggestedFixText"]
              },
              description: "Direct per-criterion text fix proposals for one-click approval"
            }
          },
          required: ["enhancedStem", "enhancedCorrectAnswer", "bloomClassification", "difficultyLevel", "qualityScore", "defectsFound"],
        },
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response from Gemini");
    }

    const evaluation = JSON.parse(resultText);
    res.json(evaluation);
  } catch (error: any) {
    console.error("Error auditing question:", error);
    res.status(500).json({ error: error.message || "حدث خطأ أثناء تحسين السؤال" });
  }
};

app.post("/api/audit-question", checkApiKey, handleAuditQuestion);
app.post("/api/improve-question", checkApiKey, handleAuditQuestion);

// 3. Generate alternative phrasings
app.post("/api/generate-alternatives", checkApiKey, async (req, res) => {
  try {
    const { qType, stem, correctAnswer, lang } = req.body;

    if (!stem) {
      return res.status(400).json({ error: "نص السؤال مطلوب" });
    }

    const isEnglish = lang === "en";
    const prompt = isEnglish
      ? `Suggest 2 alternative attractive rephrasings for this item stem (format: ${qType}) while preserving core knowledge and correct answer "${correctAnswer || ""}":
"${stem}"`
      : `اقترح صياغتين بديلتين بأسلوبين مختلفين للسؤال التالي مع الحفاظ على الفكرة والإجابة الصحيحة "${correctAnswer || ""}":
"${stem}"`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "An array of exactly 2 alternative phrased question strings",
        },
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response from Gemini");
    }

    const alternatives = JSON.parse(resultText);
    res.json({ alternatives });
  } catch (error: any) {
    console.error("Error generating alternatives:", error);
    res.status(500).json({ error: error.message || "حدث خطأ أثناء اقتراح الصياغات البديلة" });
  }
});

// 4. Extract text from uploaded document or file (PDF, DOCX, Images, etc.)
app.post("/api/extract-file-text", checkApiKey, async (req, res) => {
  try {
    const { fileData, mimeType, fileName, lang } = req.body;

    if (!fileData) {
      return res.status(400).json({ error: "بيانات الملف مطلوبة لاستخراج النص" });
    }

    let base64String = fileData;
    if (base64String.includes(",")) {
      base64String = base64String.split(",")[1];
    }

    const isEnglish = lang === "en";

    // Handle DOCX or non-standard mime types gracefully
    let normalizedMimeType = mimeType || "application/pdf";
    if (fileName && fileName.endsWith(".pdf")) {
      normalizedMimeType = "application/pdf";
    } else if (fileName && (fileName.endsWith(".png") || fileName.endsWith(".jpg") || fileName.endsWith(".jpeg"))) {
      normalizedMimeType = mimeType || "image/jpeg";
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [
        {
          inlineData: {
            data: base64String,
            mimeType: normalizedMimeType,
          },
        },
        {
          text: isEnglish
            ? "Extract and output the full, complete educational and academic text content from this file clearly. Do not add intro/outro comments or summarize — provide the complete readable text so it can be used for test item generation."
            : "قم باستخراج جميع النص الأكاديمي والمضمون العلمي للمقرر الوارد في هذا الملف بدقة وكامل المضمون، دون اختصار ودون كتابة مقدمات أو تعليقات خارجية، ليتسنّى استخدامه مباشرة في صياغة الأسئلة.",
        },
      ],
    });

    const text = response.text || "";
    if (!text.trim()) {
      throw new Error("لم يتم العثور على نص مكتوب أو مقروء داخل الملف");
    }

    res.json({ extractedText: text.trim(), fileName });
  } catch (error: any) {
    console.error("Error extracting text from file:", error);
    res.status(500).json({ error: error.message || "حدث خطأ أثناء استخراج النص من الملف المرفق" });
  }
});

// Endpoint to generate and download full Word (.docx) report for the application
app.get("/api/export-app-report-docx", async (req, res) => {
  try {
    const { generateFullAppDocxReport } = await import("./src/lib/docxReportBuilder.js");
    const docxBuffer = await generateFullAppDocxReport();

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="Itqan_System_Comprehensive_Report.docx"'
    );
    res.send(docxBuffer);
  } catch (error: any) {
    console.error("Error generating DOCX report:", error);
    res.status(500).json({ error: "حدث خطأ أثناء إنشاء تقرير وورد (.docx) للتطبيق" });
  }
});

// Setup Vite or Static serving
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Taqwimi server booted at http://localhost:${PORT}`);
  });
}

setupServer();
