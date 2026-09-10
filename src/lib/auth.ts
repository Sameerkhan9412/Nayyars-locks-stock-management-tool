import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const AUTH_SECRET = process.env.AUTH_SECRET || 'nayyar_locks_super_secret_key_1234567890_security_key';

export interface UserPayload {
  id: string;
  email: string;
  name: string;
}

export function signToken(payload: UserPayload): string {
  return jwt.sign(payload, AUTH_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): UserPayload | null {
  try {
    return jwt.verify(token, AUTH_SECRET) as UserPayload;
  } catch (error) {
    return null;
  }
}

export async function getSessionUser(): Promise<UserPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('nayyar_session')?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set('nayyar_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

export async function deleteSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set('nayyar_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
}
