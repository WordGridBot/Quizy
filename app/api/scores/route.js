import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

// --- HELPER FUNCTION: Securely Parse User Session from Cookies ---
function getSessionUser() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('cgl_session_token')?.value;
    
    if (!token) return null;
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    return null;
  }
}

// ==========================================
// 1. POST: Log a New Completed Exam Attempt
// ==========================================
export async function POST(request) {
  try {
    const { quizId, score, totalQuestions, timeSpentSeconds, guestName } = await request.json();

    if (!quizId || score === undefined || !totalQuestions) {
      return NextResponse.json({ error: "Missing essential score metrics" }, { status: 400 });
    }

    const sessionUser = getSessionUser();
    const client = await clientPromise;
    const db = client.db('cgl_core_db');

    // Calculate immediate performance accuracy percentage
    const accuracyPercentage = Math.round((score / totalQuestions) * 100);

    // Build standard score logging payload
    const finalScoreLog = {
      quizId: new ObjectId(quizId),
      score: Number(score),
      totalQuestions: Number(totalQuestions),
      accuracy: accuracyPercentage,
      timeSpentSeconds: Number(timeSpentSeconds) || 0,
      completedAt: new Date(),
    };

    // If authenticated user, map to their unique ID. If shared guest, save their alias
    if (sessionUser) {
      finalScoreLog.userId = new ObjectId(sessionUser.userId);
      finalScoreLog.username = sessionUser.username;
      finalScoreLog.isGuest = false;
    } else {
      finalScoreLog.userId = 'guest';
      finalScoreLog.username = guestName ? guestName.trim() : 'Anonymous Peer';
      finalScoreLog.isGuest = true;
    }

    // Insert document record into MongoDB cluster collection
    const result = await db.collection('score_logs').insertOne(finalScoreLog);

    return NextResponse.json({
      success: true,
      logId: result.insertedId,
      summary: {
        accuracy: accuracyPercentage,
        recordedFor: finalScoreLog.username
      }
    }, { status: 201 });

  } catch (error) {
    console.error("Score submission error:", error);
    return NextResponse.json({ error: "Failed to record exam score log" }, { status: 500 });
  }
}

// ==========================================
// 2. GET: Retrieve User History for Charts
// ==========================================
export async function GET() {
  try {
    const sessionUser = getSessionUser();

    // Security Check: Block historical lookups if user is unauthenticated
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized access path. Please log in." }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db('cgl_core_db');

    // Pull attempts for this specific user. 
    // Sorted by 'completedAt: 1' (Chronological Order) so tracking lines chart correctly from left to right.
    const userHistory = await db.collection('score_logs')
      .find({ userId: new ObjectId(sessionUser.userId) })
      .sort({ completedAt: 1 }) 
      .toArray();

    // Formatting payload optimization for lightweight data payload transmission
    const performanceTrackingLines = userHistory.map(log => ({
      logId: log._id,
      quizId: log.quizId,
      score: log.score,
      totalQuestions: log.totalQuestions,
      accuracy: log.accuracy,
      speedMinutes: parseFloat((log.timeSpentSeconds / 60).toFixed(1)),
      dateString: log.completedAt.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      })
    }));

    return NextResponse.json({
      success: true,
      username: sessionUser.username,
      totalAttemptsRecorded: performanceTrackingLines.length,
      history: performanceTrackingLines
    }, { status: 200 });

  } catch (error) {
    console.error("History retrieval breakdown:", error);
    return NextResponse.json({ error: "Failed to compute tracking analytics" }, { status: 500 });
  }
}