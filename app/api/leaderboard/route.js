import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('cgl_core_db');

    const pipeline = [
      {
        $group: {
          _id: {
            userId: "$userId",
            userKey: {
              $cond: {
                if: { $eq: ["$userId", "guest"] },
                then: "$username",
                else: "$userId"
              }
            },
            quizId: "$quizId"
          },
          username: { $first: "$username" },
          maxScore: { $max: "$score" },
          attemptsOnQuiz: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: "$_id.userKey",
          userId: { $first: "$_id.userId" },
          username: { $first: "$username" },
          totalHighestMarks: { $sum: "$maxScore" },
          totalAttempts: { $sum: "$attemptsOnQuiz" },
          uniqueQuizzesAttempted: { $sum: 1 }
        }
      },
      {
        $sort: { totalHighestMarks: -1, totalAttempts: -1 }
      },
      {
        $limit: 100 // Top 100 players
      }
    ];

    const results = await db.collection('score_logs').aggregate(pipeline).toArray();

    const formattedLeaderboard = results.map((user, idx) => ({
      rank: idx + 1,
      username: user.username || 'Anonymous Node',
      totalHighestMarks: parseFloat(user.totalHighestMarks.toFixed(2)),
      totalAttempts: user.totalAttempts,
      uniqueQuizzes: user.uniqueQuizzesAttempted,
      isGuest: user.userId === 'guest'
    }));

    return NextResponse.json({
      success: true,
      leaderboard: formattedLeaderboard
    }, { status: 200 });

  } catch (error) {
    console.error("Global leaderboard aggregation failed:", error);
    return NextResponse.json({ error: "Failed to load global leaderboard standings" }, { status: 500 });
  }
}
