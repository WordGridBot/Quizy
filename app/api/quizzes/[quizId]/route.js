import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { fetchQuizFromGithub } from '@/lib/githubStorage';

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

export async function GET(request, { params }) {
  try {
    const { quizId } = params;

    if (!quizId || !ObjectId.isValid(quizId)) {
      return NextResponse.json({ error: "Invalid or missing Quiz Identification Token" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('cgl_core_db');

    // 1. Fetch the targeted quiz metadata from MongoDB
    const quizDoc = await db.collection('quizzes').findOne({ _id: new ObjectId(quizId) });

    if (!quizDoc) {
      return NextResponse.json({ error: "Requested exam matrix does not exist inside system core" }, { status: 404 });
    }

    // 2. Fetch the heavy questions and note images payload from GitHub CDN if stored on Git
    let questions = quizDoc.questions || [];
    let imagesBase64 = quizDoc.imagesBase64 || [];

    if (quizDoc.githubPath) {
      try {
        const payload = await fetchQuizFromGithub(quizDoc.githubPath);
        questions = payload.questions || [];
        imagesBase64 = payload.imagesBase64 || [];
      } catch (githubErr) {
        console.error(`Failed to fetch quiz payload from GitHub for path ${quizDoc.githubPath}:`, githubErr);
        // Fallback to empty states on critical Git failure so user sees standard interface
        questions = [];
        imagesBase64 = [];
      }
    }

    // 3. Fetch and aggregate all scores for this specific quiz to generate ranks (excluding reattempts)
    const leaderboardRaw = await db.collection('score_logs')
      .find({ quizId: new ObjectId(quizId), isReattempt: { $ne: true } })
      .sort({ accuracy: -1, timeSpentSeconds: 1 }) // Highest precision first, breaking ties with speed
      .toArray();

    // Map into clean, lightweight display values
    const rankings = leaderboardRaw.map((entry, index) => ({
      rank: index + 1,
      username: entry.username || 'Anonymous Node',
      accuracy: entry.accuracy,
      score: entry.score,
      correctCount: entry.correctCount,
      incorrectCount: entry.incorrectCount,
      total: entry.totalQuestions,
      timeMinutes: parseFloat((entry.timeSpentSeconds / 60).toFixed(1)),
      isGuest: entry.isGuest || false
    }));

    // Fetch creator's username
    let creatorUsername = 'Anonymous';
    if (quizDoc.creatorId && quizDoc.creatorId !== 'anonymous') {
      try {
        const creatorUser = await db.collection('users').findOne({ _id: new ObjectId(quizDoc.creatorId) });
        if (creatorUser) {
          creatorUsername = creatorUser.username;
        }
      } catch (err) {
        console.error("Failed to fetch creator user:", err);
      }
    }

    return NextResponse.json({
      success: true,
      quizId: quizDoc._id,
      title: quizDoc.title || `${quizDoc.examType || 'SSC CGL'} - ${quizDoc.subject || 'Mixed'} Quiz`,
      creatorUsername,
      questions,
      imageBase64: imagesBase64?.[0] || null,
      imagesBase64,
      examType: quizDoc.examType || 'SSC CGL',
      subject: quizDoc.subject || 'Mixed',
      isMixed: quizDoc.isMixed || false,
      leaderboard: rankings
    }, { status: 200 });

  } catch (error) {
    console.error("Dynamic quiz lookup failed:", error);
    return NextResponse.json({ error: "Internal processing error reading quiz node" }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const { quizId } = params;
    const sessionUser = getSessionUser();

    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized access. Please log in." }, { status: 401 });
    }

    if (!quizId || !ObjectId.isValid(quizId)) {
      return NextResponse.json({ error: "Invalid or missing Quiz ID" }, { status: 400 });
    }

    const { title } = await request.json();
    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('cgl_core_db');

    const quizDoc = await db.collection('quizzes').findOne({ _id: new ObjectId(quizId) });
    if (!quizDoc) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    if (quizDoc.creatorId !== sessionUser.userId) {
      return NextResponse.json({ error: "You are not authorized to rename this quiz" }, { status: 403 });
    }

    await db.collection('quizzes').updateOne(
      { _id: new ObjectId(quizId) },
      { $set: { title: title.trim() } }
    );

    return NextResponse.json({ success: true, title: title.trim() }, { status: 200 });

  } catch (error) {
    console.error("Quiz renaming failed:", error);
    return NextResponse.json({ error: "Failed to rename quiz" }, { status: 500 });
  }
}