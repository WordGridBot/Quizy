import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { uploadQuizToGithub } from '@/lib/githubStorage';

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
    const sessionUser = getSessionUser();
    // Associate with logged-in user or default to anonymous
    const creatorId = sessionUser ? sessionUser.userId : 'anonymous';

    const { title, questions, imagesBase64, examType, subject, vocabWords } = await request.json();

    if (!questions || !Array.isArray(questions)) {
      return NextResponse.json({ error: "Missing quiz questions" }, { status: 400 });
    }

    const quizId = new ObjectId();

    // 1. Upload heavy questions + images payload to GitHub Repository CDN
    let githubPath = null;
    try {
      githubPath = await uploadQuizToGithub(quizId.toString(), {
        questions,
        imagesBase64: imagesBase64 || []
      });
    } catch (githubErr) {
      console.error("Failed to commit quiz payload to GitHub:", githubErr);
      return NextResponse.json({ error: "GitHub CDN storage failed: " + githubErr.message }, { status: 502 });
    }

    const client = await clientPromise;
    const db = client.db('cgl_core_db');

    // 2. Store only the lightweight metadata document in MongoDB
    const quizDoc = await db.collection('quizzes').insertOne({
      _id: quizId,
      title: title || `${examType} - ${subject} Quiz`,
      creatorId: creatorId,
      createdAt: new Date(),
      githubPath: githubPath,
      examType: examType || 'SSC CGL',
      subject: subject || 'Mixed',
      questionCount: questions.length,
      sharedWith: []
    });

    // 3. Bulk log words into Vocab Vault if provided (keeps them searchable in DB)
    if (vocabWords && Array.isArray(vocabWords) && vocabWords.length > 0) {
      const vocabItems = vocabWords.map(v => ({
        userId: creatorId,
        word: v.word,
        meaning: v.meaning,
        context: v.contextFromNotes || v.context || '',
        mastered: false,
        addedAt: new Date()
      }));
      await db.collection('vocab_vault').insertMany(vocabItems);
    }

    return NextResponse.json({
      success: true,
      quizId: quizId.toString()
    }, { status: 201 });

  } catch (error) {
    console.error("Quiz saving failed:", error);
    return NextResponse.json({ error: "Failed to save quiz" }, { status: 500 });
  }
}
