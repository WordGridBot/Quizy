import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { quizId } = params;

    if (!quizId || !ObjectId.isValid(quizId)) {
      return NextResponse.json({ error: "Invalid or missing Quiz Identification Token" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('cgl_core_db');

    // 1. Fetch the targeted quiz layout sheet
    const quizDoc = await db.collection('quizzes').findOne({ _id: new ObjectId(quizId) });

    if (!quizDoc) {
      return NextResponse.json({ error: "Requested exam matrix does not exist inside system core" }, { status: 404 });
    }

    // 2. Fetch and aggregate all scores for this specific quiz to generate ranks
    const leaderboardRaw = await db.collection('score_logs')
      .find({ quizId: new ObjectId(quizId) })
      .sort({ accuracy: -1, timeSpentSeconds: 1 }) // Highest precision first, breaking ties with speed
      .toArray();

    // Map into clean, lightweight display values
    const rankings = leaderboardRaw.map((entry, index) => ({
      rank: index + 1,
      username: entry.username || 'Anonymous Node',
      accuracy: entry.accuracy,
      score: entry.score,
      total: entry.totalQuestions,
      timeMinutes: parseFloat((entry.timeSpentSeconds / 60).toFixed(1)),
      isGuest: entry.isGuest || false
    }));

    return NextResponse.json({
      success: true,
      quizId: quizDoc._id,
      questions: quizDoc.questions,
      imageBase64: quizDoc.imageBase64 || null,
      imagesBase64: quizDoc.imagesBase64 || null,
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