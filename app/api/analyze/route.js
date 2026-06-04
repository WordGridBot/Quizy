import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import OpenAI from 'openai';

// Extend the serverless processing limit to 60 seconds since we are chaining 2 model requests
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const nvidia = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

const client = new MongoClient(process.env.MONGODB_URI);

export async function POST(request) {
  try {
    const { imageBase64, imagesBase64, userId, examType = 'SSC CGL', subject = 'Mixed', questionCount = 5 } = await request.json();

    // Compile into base64 array for multi-page processing
    let base64Array = [];
    if (imagesBase64 && Array.isArray(imagesBase64)) {
      base64Array = imagesBase64;
    } else if (imageBase64) {
      base64Array = [imageBase64];
    }

    if (base64Array.length === 0) {
      return NextResponse.json({ error: "No image(s) provided" }, { status: 400 });
    }

    // --- PIPELINE STEP 1: Highly Accurate Raw Multimodal Extraction ---
    // Process all uploaded images concurrently using a supported active multimodal model
    const ocrPromises = base64Array.map(async (imgBase64, idx) => {
      const ocrResponse = await nvidia.chat.completions.create({
        model: "meta/llama-3.2-11b-vision-instruct", 
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Extract all text, lists, facts, vocabulary words, and handwritten notes from this image with absolute precision. Do not summarize or format. Return only raw text data." },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${imgBase64}` }
              }
            ]
          }
        ]
      });
      return ocrResponse.choices[0].message.content || '';
    });

    const ocrResults = await Promise.all(ocrPromises);
    const rawExtractedText = ocrResults.join('\n\n--- NEXT NOTE PAGE ---\n\n');

    if (!rawExtractedText || rawExtractedText.trim().length === 0) {
      return NextResponse.json({ error: "OCR extraction step yielded zero usable data" }, { status: 422 });
    }

    // --- PIPELINE STEP 2: JSON Processing & MCQ Generation ---
    // We pass the raw text to an elite reasoning model to generate the structured CGL material
    const generatorSystemPrompt = `
      You are an expert ${examType} Content Generator. Review the following raw textbook/note data and perform two tasks:
      1. Extract all high-priority English vocabulary words or advanced facts found.
      2. Construct exactly ${Number(questionCount)} tough Multiple Choice Questions (MCQs) mimicking the TCS examination style for the subject/section "${subject}" based strictly on the text.
      
      You must respond ONLY with a raw, valid JSON object following this exact syntax blueprint:
      {
        "vocabWords": [
          { "word": "string", "meaning": "string", "contextFromNotes": "string" }
        ],
        "quiz": [
          {
            "question": "string",
            "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
            "correctAnswer": "A/B/C/D",
            "explanation": "Detailed exam-oriented breakdown explaining why this choice is correct."
          }
        ]
      }
    `;

    const jsonSynthesisResponse = await nvidia.chat.completions.create({
      model: "nvidia/llama-3.3-nemotron-super-49b-v1.5",
      messages: [
        { role: "system", content: generatorSystemPrompt },
        { role: "user", content: `Here is the raw extracted text from the study notes:\n\n${rawExtractedText}` }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    });

    const structuredOutput = JSON.parse(jsonSynthesisResponse.choices[0].message.content);

    // --- PIPELINE STEP 3: Secure Logging into MongoDB Atlas ---
    await client.connect();
    const db = client.db('cgl_core_db');

    // Store the quiz master document with image and metadata parameters
    const quizDoc = await db.collection('quizzes').insertOne({
      creatorId: userId || 'anonymous',
      createdAt: new Date(),
      questions: structuredOutput.quiz,
      imageBase64: base64Array[0] || null, // fallback for legacy code
      imagesBase64: base64Array, // save all uploaded images
      examType: examType,
      subject: subject,
      questionCount: Number(questionCount),
      sharedWith: []
    });

    // Bulk log words into your personalized Vocab Vault
    if (structuredOutput.vocabWords && structuredOutput.vocabWords.length > 0) {
      const vocabItems = structuredOutput.vocabWords.map(v => ({
        userId: userId || 'anonymous',
        word: v.word,
        meaning: v.meaning,
        context: v.contextFromNotes,
        mastered: false,
        addedAt: new Date()
      }));
      await db.collection('vocab_vault').insertMany(vocabItems);
    }

    // Return the unique quiz ID along with the data payload so the frontend can build shareable links
    return NextResponse.json({
      success: true,
      quizId: quizDoc.insertedId,
      quizData: structuredOutput.quiz,
      vocabData: structuredOutput.vocabWords
    }, { status: 200 });

  } catch (error) {
    console.error("Pipeline failure log:", error);
    return NextResponse.json({ error: "Server failed to process image", logs: error.message }, { status: 500 });
  } finally {
    await client.close();
  }
}