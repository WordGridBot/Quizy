import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Extend the serverless processing limit to 60 seconds since we are chaining 2 model requests
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const nvidia = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

export async function POST(request) {
  try {
    const { imageBase64, imagesBase64, examType = 'SSC CGL', subject = 'Mixed' } = await request.json();

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

    // --- GOOGLE AI STUDIO / GEMINI 1.5 / GEMINI 4.0 PIPELINE (Preferred Single-Stage Vision) ---
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (geminiKey) {
      try {
        console.log("Google AI Studio key detected. Querying single-stage Gemma 4 31B Vision pipeline...");
        const geminiClient = new OpenAI({
          apiKey: geminiKey,
          baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
        });

        const geminiModel = process.env.GEMINI_MODEL || 'gemma-4-31b';

        // Prepare message payload with text prompt and base64 images
        const messagesContent = [
          {
            type: "text",
            text: `You are an expert ${examType} Content Generator. Review all the provided note/textbook images and perform two tasks:
1. Extract all high-priority English vocabulary words or advanced facts found in the images.
2. Construct as many tough Multiple Choice Questions (MCQs) as possible from the images, mimicking the TCS examination style for the subject/section "${subject}".
DO NOT exceed 25 MCQs.

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
}`
          }
        ];

        base64Array.forEach(img => {
          messagesContent.push({
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${img}` }
          });
        });

        const geminiResponse = await geminiClient.chat.completions.create({
          model: geminiModel,
          messages: [
            { role: "user", content: messagesContent }
          ],
          response_format: { type: "json_object" },
          temperature: 0.3
        });

        const structuredOutput = JSON.parse(geminiResponse.choices[0].message.content);

        return NextResponse.json({
          success: true,
          quizData: structuredOutput.quiz || [],
          vocabData: structuredOutput.vocabWords || []
        }, { status: 200 });

      } catch (geminiErr) {
        console.error("Google AI Studio Vision pipeline failed, falling back to NVIDIA:", geminiErr);
      }
    }

    // --- PIPELINE STEP 1: Highly Accurate Raw Multimodal Extraction ---
    // Process all uploaded images concurrently using a supported active multimodal model
    const ocrPromises = base64Array.map(async (imgBase64, idx) => {
      const ocrResponse = await nvidia.chat.completions.create({
        model: "meta/llama-3.2-90b-vision-instruct", 
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
      2. Construct as many tough Multiple Choice Questions (MCQs) as possible from the text, mimicking the TCS examination style for the subject/section "${subject}".
      DO NOT exceed 25 MCQs.
      
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

    // Return the data payload so the frontend can handle finalizing, naming, and saving
    return NextResponse.json({
      success: true,
      quizData: structuredOutput.quiz || [],
      vocabData: structuredOutput.vocabWords || []
    }, { status: 200 });

  } catch (error) {
    console.error("Pipeline failure log:", error);
    return NextResponse.json({ error: "Server failed to process image", logs: error.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}