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

export async function GET() {
  try {
    const sessionUser = getSessionUser();

    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db('cgl_core_db');

    const vocabWords = await db.collection('vocab_vault')
      .find({ userId: sessionUser.userId })
      .sort({ addedAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      vocabWords
    }, { status: 200 });

  } catch (error) {
    console.error("Vocab retrieval failed:", error);
    return NextResponse.json({ error: "Failed to fetch vocabulary" }, { status: 500 });
  }
}
