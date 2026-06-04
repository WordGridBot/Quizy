import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

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
    const { quizIds, title, questionCount } = await request.json();

    if (!quizIds || !Array.isArray(quizIds) || quizIds.length === 0) {
      return NextResponse.json({ error: "No quiz IDs provided to mix" }, { status: 400 });
    }

    const sessionUser = getSessionUser();
    const creatorId = sessionUser ? sessionUser.userId : 'anonymous';

    const client = await clientPromise;
    const db = client.db('cgl_core_db');

    // Parse ObjectIds
    const objectIds = quizIds
      .filter(id => ObjectId.isValid(id))
      .map(id => new ObjectId(id));

    if (objectIds.length === 0) {
      return NextResponse.json({ error: "Invalid quiz IDs provided" }, { status: 400 });
    }

    // Fetch original quizzes
    const originalQuizzes = await db.collection('quizzes')
      .find({ _id: { $in: objectIds } })
      .toArray();

    if (originalQuizzes.length === 0) {
      return NextResponse.json({ error: "No matching quizzes found in database" }, { status: 404 });
    }

    // Pool questions and images
    let pooledQuestions = [];
    let imagesPool = [];

    originalQuizzes.forEach(quiz => {
      if (quiz.questions && Array.isArray(quiz.questions)) {
        // Tag questions with original quiz details if necessary (e.g. for explanation context)
        const questionsWithContext = quiz.questions.map(q => ({
          ...q,
          sourceQuizId: quiz._id.toString()
        }));
        pooledQuestions = pooledQuestions.concat(questionsWithContext);
      }
      
      if (quiz.imageBase64) {
        imagesPool.push(quiz.imageBase64);
      } else if (quiz.imagesBase64 && Array.isArray(quiz.imagesBase64)) {
        imagesPool = imagesPool.concat(quiz.imagesBase64);
      }
    });

    // Remove duplicates from images pool
    const uniqueImages = [...new Set(imagesPool)].filter(Boolean);

    if (pooledQuestions.length === 0) {
      return NextResponse.json({ error: "Selected quizzes do not contain any questions" }, { status: 422 });
    }

    // Shuffle questions using Fisher-Yates algorithm
    for (let i = pooledQuestions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pooledQuestions[i], pooledQuestions[j]] = [pooledQuestions[j], pooledQuestions[i]];
    }

    // Limit combined quiz to requested count or keep all
    const limitCount = questionCount ? Number(questionCount) : pooledQuestions.length;
    const finalQuestions = pooledQuestions.slice(0, limitCount);

    // Save consolidated mixed quiz doc
    const mixedQuizDoc = await db.collection('quizzes').insertOne({
      title: title || 'Mixed Revision',
      creatorId,
      createdAt: new Date(),
      questions: finalQuestions,
      imagesBase64: uniqueImages, // Store as array of base64 strings
      examType: 'Mixed Revision',
      subject: 'Combined Topics',
      questionCount: finalQuestions.length,
      isMixed: true,
      sharedWith: []
    });

    return NextResponse.json({
      success: true,
      quizId: mixedQuizDoc.insertedId,
      questionCount: finalQuestions.length
    }, { status: 201 });

  } catch (error) {
    console.error("Quiz mixing pipeline failed:", error);
    return NextResponse.json({ error: "Failed to create mixed mock exam" }, { status: 500 });
  }
}
