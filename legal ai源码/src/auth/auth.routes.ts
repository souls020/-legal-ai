import { Request, Response } from 'express';
import { z } from 'zod';
import { register, login, wechatLogin, logout, forgotPassword, resetPassword, getUserByToken, updateProfile, getProfileByUserId } from '../auth/auth.service.js';

// Validation schemas
const registerSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
  password: z.string().min(6, '密码至少6位'),
  email: z.string().email('邮箱格式不正确').optional()
});

const loginSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
  password: z.string().min(1, '密码不能为空')
});

const wechatLoginSchema = z.object({
  code: z.string().min(1, '微信code不能为空'),
  userInfo: z.object({
    nickName: z.string().optional(),
    avatarUrl: z.string().optional()
  }).optional()
});

const forgotPasswordSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确')
});

const resetPasswordSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
  code: z.string().length(6, '验证码6位'),
  password: z.string().min(6, '密码至少6位')
});

const updateProfileSchema = z.object({
  name: z.string().max(50, '名称最长50字符').optional(),
  avatar: z.string().url('头像URL格式不正确').optional(),
  bio: z.string().max(500, '简介最长500字符').optional()
});

// Helper to get client info
function getClientInfo(req: Request): { ipAddress: string | undefined; userAgent: string | undefined } {
  return {
    ipAddress: req.ip || req.socket.remoteAddress || undefined,
    userAgent: req.headers['user-agent'] || undefined
  };
}

// Register
export async function registerHandler(req: Request, res: Response) {
  try {
    const data = registerSchema.parse(req.body);
    const result = await register(data.phone, data.password, data.email);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }

    res.status(201).json({
      success: true,
      message: result.message,
      data: {
        user: result.user,
        token: result.token
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
}

// Login
export async function loginHandler(req: Request, res: Response) {
  try {
    const data = loginSchema.parse(req.body);
    const { ipAddress, userAgent } = getClientInfo(req);
    const result = await login(data.phone, data.password, ipAddress, userAgent);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }

    res.json({
      success: true,
      message: result.message,
      data: {
        user: result.user,
        token: result.token
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
}

// WeChat login
export async function wechatLoginHandler(req: Request, res: Response) {
  try {
    const data = wechatLoginSchema.parse(req.body);
    const { ipAddress, userAgent } = getClientInfo(req);

    // In production, exchange code for openid via WeChat API
    // For now, use code as openid directly (simplified)
    const result = await wechatLogin(data.code, undefined, ipAddress, userAgent);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }

    res.json({
      success: true,
      message: result.message,
      data: {
        user: result.user,
        token: result.token
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    console.error('WeChat login error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
}

// Logout
export async function logoutHandler(req: Request, res: Response) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      await logout(token);
    }

    res.json({ success: true, message: '已退出登录' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
}

// Forgot password
export async function forgotPasswordHandler(req: Request, res: Response) {
  try {
    const data = forgotPasswordSchema.parse(req.body);
    const result = await forgotPassword(data.phone);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }

    res.json({ success: true, message: result.message });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
}

// Reset password
export async function resetPasswordHandler(req: Request, res: Response) {
  try {
    const data = resetPasswordSchema.parse(req.body);
    const result = await resetPassword(data.phone, data.code, data.password);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }

    res.json({ success: true, message: result.message });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
}

// Get current user
export async function getCurrentUserHandler(req: Request, res: Response) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: '未登录' });
    }

    const user = await getUserByToken(token);
    if (!user) {
      return res.status(401).json({ success: false, message: '登录已过期' });
    }

    const profile = await getProfileByUserId(user.id);

    const { password_hash, ...safeUser } = user;

    res.json({
      success: true,
      data: {
        user: safeUser,
        profile
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
}

// Update profile
export async function updateProfileHandler(req: Request, res: Response) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: '未登录' });
    }

    const user = await getUserByToken(token);
    if (!user) {
      return res.status(401).json({ success: false, message: '登录已过期' });
    }

    const data = updateProfileSchema.parse(req.body);
    const result = await updateProfile(user.id, data);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }

    res.json({ success: true, message: result.message, data: { profile: result.profile } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
}
