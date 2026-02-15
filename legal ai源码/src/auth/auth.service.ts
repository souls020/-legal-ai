import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb, dbGet, dbRun, dbAll, saveDb } from '../db/index.js';
import type { User, UserProfile, Session, InsertUser, InsertUserProfile, InsertSession } from '../db/types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const TOKEN_EXPIRY = '7d';
const SESSION_EXPIRY_DAYS = 7;

export interface AuthResult {
  success: boolean;
  message?: string;
  user?: Omit<User, 'password_hash'>;
  profile?: UserProfile;
  token?: string;
  session?: Session;
}

export interface TokenPayload {
  userId: number;
  phone: string;
  sessionId: number;
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Generate JWT token
export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

// Verify JWT token
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

// Generate session token
export function generateSessionToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Get session expiry date
export function getSessionExpiry(): Date {
  const date = new Date();
  date.setDate(date.getDate() + SESSION_EXPIRY_DAYS);
  return date;
}

// Register new user
export async function register(phone: string, password: string, email?: string): Promise<AuthResult> {
  const db = await getDb();

  // Check if phone already exists
  const existingUser = dbGet<User>('SELECT id FROM users WHERE phone = ?', [phone]);
  if (existingUser) {
    return { success: false, message: '该手机号已注册' };
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Insert user
  dbRun(
    'INSERT INTO users (phone, email, password_hash, status) VALUES (?, ?, ?, ?)',
    [phone, email || null, passwordHash, 'active']
  );

  const userId = db.exec('SELECT last_insert_rowid()')[0].values[0][0] as number;

  // Create user profile
  dbRun(
    'INSERT INTO user_profiles (user_id, name, default_role) VALUES (?, ?, ?)',
    [userId, null, 'user']
  );

  // Create session for auto-login after registration
  const sessionToken = generateSessionToken();
  const expiresAt = getSessionExpiry().toISOString();

  dbRun(
    'INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)',
    [userId, sessionToken, expiresAt]
  );

  const sessionId = db.exec('SELECT last_insert_rowid()')[0].values[0][0] as number;

  await saveDb();

  // Get created user
  const user = dbGet<User>('SELECT id, phone, email, status, created_at, updated_at FROM users WHERE id = ?', [userId]);
  const profile = dbGet<UserProfile>('SELECT * FROM user_profiles WHERE user_id = ?', [userId]);

  // Generate JWT token
  const jwtToken = user ? generateToken({ userId: user.id, phone: user.phone, sessionId }) : undefined;

  return {
    success: true,
    message: '注册成功',
    user: user || undefined,
    profile: profile || undefined,
    token: jwtToken
  };
}

// Login with phone and password
export async function login(phone: string, password: string, ipAddress?: string, userAgent?: string): Promise<AuthResult> {
  const db = await getDb();

  // Find user
  const user = dbGet<User & { password_hash: string }>(
    'SELECT id, phone, email, password_hash, status, created_at, updated_at FROM users WHERE phone = ?',
    [phone]
  );

  if (!user) {
    return { success: false, message: '手机号或密码错误' };
  }

  if (user.status !== 'active') {
    return { success: false, message: '账户已被禁用' };
  }

  if (!user.password_hash) {
    return { success: false, message: '请使用微信登录' };
  }

  // Verify password
  const validPassword = await verifyPassword(password, user.password_hash);
  if (!validPassword) {
    return { success: false, message: '手机号或密码错误' };
  }

  // Create session
  const token = generateSessionToken();
  const expiresAt = getSessionExpiry().toISOString();

  dbRun(
    'INSERT INTO sessions (user_id, token, expires_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
    [user.id, token, expiresAt, ipAddress || null, userAgent || null]
  );

  const sessionId = db.exec('SELECT last_insert_rowid()')[0].values[0][0] as number;

  // Update last login
  dbRun('UPDATE user_profiles SET last_login_at = CURRENT_TIMESTAMP WHERE user_id = ?', [user.id]);

  await saveDb();

  // Generate JWT
  const jwtToken = generateToken({ userId: user.id, phone: user.phone, sessionId });

  const { password_hash, ...safeUser } = user;

  return {
    success: true,
    message: '登录成功',
    user: safeUser,
    token: jwtToken,
    session: { id: sessionId, user_id: user.id, token, expires_at: expiresAt, ip_address: ipAddress || null, user_agent: userAgent || null, created_at: new Date().toISOString() }
  };
}

// WeChat login
export async function wechatLogin(wechatOpenId: string, wechatUnionId?: string, ipAddress?: string, userAgent?: string): Promise<AuthResult> {
  const db = await getDb();

  // Find existing user by WeChat
  let user = dbGet<User & { password_hash: string }>(
    'SELECT id, phone, email, password_hash, status, created_at, updated_at FROM users WHERE wechat_openid = ?',
    [wechatOpenId]
  );

  if (!user) {
    // Create new user with WeChat - use unique placeholder phone to avoid UNIQUE constraint violation
    const placeholderPhone = `wx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    dbRun(
      'INSERT INTO users (phone, wechat_openid, wechat_unionid, status) VALUES (?, ?, ?, ?)',
      [placeholderPhone, wechatOpenId, wechatUnionId || null, 'active']
    );

    const userId = db.exec('SELECT last_insert_rowid()')[0].values[0][0] as number;

    dbRun(
      'INSERT INTO user_profiles (user_id, name, default_role) VALUES (?, ?, ?)',
      [userId, '微信用户', 'user']
    );

    await saveDb();

    user = dbGet<User & { password_hash: string }>(
      'SELECT id, phone, email, password_hash, status, created_at, updated_at FROM users WHERE id = ?',
      [userId]
    );
  }

  if (!user) {
    return { success: false, message: '微信登录失败' };
  }

  if (user.status !== 'active') {
    return { success: false, message: '账户已被禁用' };
  }

  // Create session
  const token = generateSessionToken();
  const expiresAt = getSessionExpiry().toISOString();

  dbRun(
    'INSERT INTO sessions (user_id, token, expires_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
    [user.id, token, expiresAt, ipAddress || null, userAgent || null]
  );

  const sessionId = db.exec('SELECT last_insert_rowid()')[0].values[0][0] as number;

  // Update last login
  dbRun('UPDATE user_profiles SET last_login_at = CURRENT_TIMESTAMP WHERE user_id = ?', [user.id]);

  await saveDb();

  // Generate JWT
  const jwtToken = generateToken({ userId: user.id, phone: user.phone, sessionId });

  const { password_hash, ...safeUser } = user;

  return {
    success: true,
    message: '微信登录成功',
    user: safeUser,
    token: jwtToken,
    session: { id: sessionId, user_id: user.id, token, expires_at: expiresAt, ip_address: ipAddress || null, user_agent: userAgent || null, created_at: new Date().toISOString() }
  };
}

// Logout
export async function logout(token: string): Promise<AuthResult> {
  const db = await getDb();

  // Decode JWT to get sessionId, then delete the session by ID
  const payload = verifyToken(token);

  if (payload) {
    dbRun('DELETE FROM sessions WHERE id = ? AND user_id = ?', [payload.sessionId, payload.userId]);
  }

  await saveDb();

  return { success: true, message: '已退出登录' };
}

// Forgot password - send reset code (simplified - in production use SMS service)
export async function forgotPassword(phone: string): Promise<AuthResult> {
  const db = await getDb();

  const user = dbGet<User>('SELECT id FROM users WHERE phone = ? AND phone NOT LIKE ?', [phone, 'wx_%']);
  if (!user) {
    return { success: false, message: '手机号未注册' };
  }

  // Generate 6-digit reset code
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

  // In production, send SMS here
  console.log(`Password reset code for ${phone}: ${resetCode}`);

  // Store reset code in sessions table instead of overwriting password_hash
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes
  dbRun(
    'INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)',
    [user.id, `reset_${resetCode}`, expiresAt]
  );

  await saveDb();

  return { success: true, message: '验证码已发送' };
}

// Reset password with code
export async function resetPassword(phone: string, resetCode: string, newPassword: string): Promise<AuthResult> {
  const db = await getDb();

  const user = dbGet<User>(
    'SELECT id FROM users WHERE phone = ?',
    [phone]
  );

  if (!user) {
    return { success: false, message: '用户不存在' };
  }

  // Verify reset code from sessions table
  const resetSession = dbGet<{ id: number; expires_at: string }>(
    'SELECT id, expires_at FROM sessions WHERE user_id = ? AND token = ?',
    [user.id, `reset_${resetCode}`]
  );

  if (!resetSession) {
    return { success: false, message: '验证码错误或已过期' };
  }

  if (new Date(resetSession.expires_at) < new Date()) {
    // Clean up expired reset code
    dbRun('DELETE FROM sessions WHERE id = ?', [resetSession.id]);
    await saveDb();
    return { success: false, message: '验证码已过期，请重新获取' };
  }

  // Hash new password
  const passwordHash = await hashPassword(newPassword);

  dbRun('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, user.id]);
  // Clean up used reset code
  dbRun('DELETE FROM sessions WHERE id = ?', [resetSession.id]);
  await saveDb();

  return { success: true, message: '密码重置成功' };
}

// Get user by token
export async function getUserByToken(token: string): Promise<User | null> {
  const payload = verifyToken(token);
  if (!payload) return null;

  const db = await getDb();
  const user = dbGet<User>('SELECT * FROM users WHERE id = ?', [payload.userId]);
  return user || null;
}

// Get profile by user ID
export async function getProfileByUserId(userId: number): Promise<UserProfile | null> {
  const db = await getDb();
  const profile = dbGet<UserProfile>('SELECT * FROM user_profiles WHERE user_id = ?', [userId]);
  return profile || null;
}

// Update profile
export async function updateProfile(userId: number, data: Partial<InsertUserProfile>): Promise<AuthResult> {
  const db = await getDb();

  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.avatar !== undefined) { fields.push('avatar = ?'); values.push(data.avatar); }
  if (data.bio !== undefined) { fields.push('bio = ?'); values.push(data.bio); }

  if (fields.length === 0) {
    return { success: false, message: '没有要更新的字段' };
  }

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(userId);

  dbRun(`UPDATE user_profiles SET ${fields.join(', ')} WHERE user_id = ?`, values);
  await saveDb();

  const profile = await getProfileByUserId(userId);
  return { success: true, message: '更新成功', profile: profile || undefined };
}

export { JWT_SECRET };
