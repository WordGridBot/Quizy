import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(request) {
  try {
    const { identifier, password } = await request.json(); // identifier can be email or username

    if (!identifier || !password) {
      return NextResponse.json({ error: "Credentials inputs are missing" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('cgl_core_db');

    const cleanIdentifier = identifier.trim();

    // 1. Search database for corresponding email OR username profile records
    const targetedUser = await db.collection('users').findOne({
      $or: [
        { email: cleanIdentifier.toLowerCase() },
        { username: { $regex: new RegExp(`^${cleanIdentifier}$`, 'i') } }
      ]
    });

    if (!targetedUser) {
      return NextResponse.json({ error: "Invalid credential parameters provided" }, { status: 401 });
    }

    // 2. Decrypt and check password integrity match
    const passwordMatch = await bcrypt.compare(password, targetedUser.passwordHash);

    if (!passwordMatch) {
      return NextResponse.json({ error: "Invalid credential parameters provided" }, { status: 401 });
    }

    // 3. Re-sign session identifier payload
    const token = jwt.sign(
      { userId: targetedUser._id, username: targetedUser.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 4. Return user packet and mount httpOnly cookie container profile
    const response = NextResponse.json({
      success: true,
      user: { id: targetedUser._id, username: targetedUser.username }
    }, { status: 200 });

    response.cookies.set({
      name: 'cgl_session_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7
    });

    return response;

  } catch (error) {
    console.error("Login verification breakdown:", error);
    return NextResponse.json({ error: "Internal verification pipeline failed" }, { status: 500 });
  }
}