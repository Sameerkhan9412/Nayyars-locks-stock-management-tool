import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { signupSchema } from '@/lib/validations';
import { signToken, setSessionCookie } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    return NextResponse.json(
      { error: 'Registration is disabled. Please use the configured admin credentials.' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
