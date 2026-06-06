import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { fetchQuizFromGithub, uploadQuizToGithub } from '@/lib/githubStorage';

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

    // Fetch original quizzes metadata
    const originalQuizzesRaw = await db.collection('quizzes')
      .find({ _id: { $in: objectIds } })
      .toArray();

    if (originalQuizzesRaw.length === 0) {
      return NextResponse.json({ error: "No matching quizzes found in database" }, { status: 404 });
    }

    // Fetch full quiz payloads from GitHub CDN / local DB in parallel
    const resolvedQuizzes = await Promise.all(
      originalQuizzesRaw.map(async (quiz) => {
        let questions = quiz.questions || [];
        let imagesBase64 = quiz.imagesBase64 || [];

        if (quiz.githubPath) {
          try {
            const payload = await fetchQuizFromGithub(quiz.githubPath);
            questions = payload.questions || [];
            imagesBase64 = payload.imagesBase64 || [];
          } catch (githubErr) {
            console.error(`Failed to fetch quiz payload from GitHub for path ${quiz.githubPath}:`, githubErr);
          }
        }
        return {
          ...quiz,
          questions,
          imagesBase64
        };
      })
    );

    // Pool questions and images
    let pooledQuestions = [];
    let imagesPool = [];

    resolvedQuizzes.forEach(quiz => {
      if (quiz.questions && Array.isArray(quiz.questions)) {
        const questionsWithContext = quiz.questions.map(q => ({
          ...q,
          sourceQuizId: quiz._id.toString()
        }));
        pooledQuestions = pooledQuestions.concat(questionsWithContext);
      }
      
      if (quiz.imagesBase64 && Array.isArray(quiz.imagesBase64)) {
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

    const mixedQuizId = new ObjectId();

    // Save mixed quiz JSON payload to GitHub CDN
    let githubPath = null;
    try {
      githubPath = await uploadQuizToGithub(mixedQuizId.toString(), {
        questions: finalQuestions,
        imagesBase64: uniqueImages
      });
    } catch (githubErr) {
      console.error("Failed to commit mixed quiz payload to GitHub:", githubErr);
      return NextResponse.json({ error: "GitHub CDN storage failed: " + githubErr.message }, { status: 502 });
    }

    // Save consolidated mixed quiz metadata in MongoDB
    await db.collection('quizzes').insertOne({
      _id: mixedQuizId,
      title: title || 'Mixed Revision',
      creatorId,
      createdAt: new Date(),
      githubPath,
      examType: 'Mixed Revision',
      subject: 'Combined Topics',
      questionCount: finalQuestions.length,
      isMixed: true,
      sharedWith: []
    });

    return NextResponse.json({
      success: true,
      quizId: mixedQuizId.toString(),
      questionCount: finalQuestions.length
    }, { status: 201 });

  } catch (error) {
    console.error("Quiz mixing pipeline failed:", error);
    return NextResponse.json({ error: "Failed to create mixed mock exam" }, { status: 500 });
  }
}
