import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(request) {
  try {
    const { username, email, password } = await request.json();

    // 1. Basic inputs verification
    if (!username || !email || !password) {
      return NextResponse.json({ error: "All profile fields are mandatory" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('cgl_core_db');

    // 2. Safeguard against duplicate user records
    const lowerEmail = email.toLowerCase().trim();
    const cleanUsername = username.trim();

    const existingUser = await db.collection('users').findOne({
      $or: [
        { email: lowerEmail },
        { username: { $regex: new RegExp(`^${cleanUsername}$`, 'i') } }
      ]
    });

    if (existingUser) {
      return NextResponse.json({ error: "Username or Email already registered" }, { status: 409 });
    }

    // 3. Hash the cleartext password using bcrypt
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 4. Save the user record to the cluster database
    const newUserRecord = await db.collection('users').insertOne({
      username: cleanUsername,
      email: lowerEmail,
      passwordHash,
      createdAt: new Date()
    });

    // 5. Build an authentication token for immediate seamless login
    const token = jwt.sign(
      { userId: newUserRecord.insertedId, username: cleanUsername },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 6. Return response while baking the secure cookie directly into the header payload
    const response = NextResponse.json({
      success: true,
      user: { id: newUserRecord.insertedId, username: cleanUsername }
    }, { status: 201 });

    response.cookies.set({
      name: 'cgl_session_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // Keeps session live for exactly 7 days
    });

    return response;

  } catch (error) {
    console.error("Registration route broken:", error);
    return NextResponse.json({ error: "Internal registry failure" }, { status: 500 });
  }
}