import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

function getSessionUser() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('cgl_session_token')?.value;
    if (!token) return null;
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export async function POST(request) {
  try {
    const { quizData, vocabData, imagesBase64, examType, subject, questionCount } = await request.json();

    const sessionUser = getSessionUser();
    const creatorId = sessionUser ? sessionUser.userId : 'anonymous';

    const client = await clientPromise;
    const db = client.db('cgl_core_db');

    // Save quiz
    const quizDoc = await db.collection('quizzes').insertOne({
      creatorId,
      createdAt: new Date(),
      questions: quizData,
      imageBase64: imagesBase64 ? imagesBase64[0] : null,
      imagesBase64: imagesBase64 || [],
      examType: examType || 'SSC CGL',
      subject: subject || 'Mixed',
      questionCount: Number(questionCount) || quizData.length,
      sharedWith: []
    });

    // Save vocab
    if (vocabData && vocabData.length > 0) {
      const vocabItems = vocabData.map(v => ({
        userId: creatorId,
        word: v.word,
        meaning: v.meaning,
        context: v.contextFromNotes,
        mastered: false,
        addedAt: new Date()
      }));
      await db.collection('vocab_vault').insertMany(vocabItems);
    }

    return NextResponse.json({
      success: true,
      quizId: quizDoc.insertedId
    }, { status: 201 });

  } catch (error) {
    console.error("Failed to save client-generated quiz:", error);
    return NextResponse.json({ error: "Failed to save exam session" }, { status: 500 });
  }
}
