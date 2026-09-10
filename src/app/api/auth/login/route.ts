import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { loginSchema } from '@/lib/validations';
import { signToken, setSessionCookie } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const result = loginSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }
    
    const { email, password } = result.data;
    
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@nayyarlocks.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456';
    
    if (email.toLowerCase() !== adminEmail.toLowerCase() || password !== adminPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 400 }
      );
    }
    
    let user = await User.findOne({ email: adminEmail.toLowerCase() });
    if (!user) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      user = await User.create({
        name: 'Admin',
        email: adminEmail.toLowerCase(),
        password: hashedPassword,
      });
    }
    
    const payload = { id: user._id.toString(), email: user.email, name: user.name };
    const token = signToken(payload);
    await setSessionCookie(token);
    
    return NextResponse.json({
      success: true,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
