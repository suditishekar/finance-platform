import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import { signToken } from '../utils/jwt';
import { sendSuccess, sendError } from '../utils/response';
import { registerSchema, loginSchema } from '../validators/auth.validator';
import catchAsync from '../utils/catchAsync';

export const register = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, parsed.error.errors[0].message, 422);
    return;
  }

  const { name, email, password } = parsed.data;

  const existing = await User.findOne({ email });
  if (existing) {
    sendError(res, 'An account with this email already exists', 409);
    return;
  }

  const user = await User.create({ name, email, password });
  const token = signToken(String(user._id), user.role);

  sendSuccess(
    res,
    {
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    },
    201
  );
});

export const login = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, parsed.error.errors[0].message, 422);
    return;
  }

  const { email, password } = parsed.data;

  // explicitly select password since it is excluded by default in the schema
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    sendError(res, 'Invalid email or password', 401);
    return;
  }

  if (user.status === 'inactive') {
    sendError(res, 'Your account has been deactivated', 403);
    return;
  }

  const match = await user.comparePassword(password);
  if (!match) {
    sendError(res, 'Invalid email or password', 401);
    return;
  }

  const token = signToken(String(user._id), user.role);

  sendSuccess(res, {
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
});

export const getMe = catchAsync(async (req: Request, res: Response): Promise<void> => {
  // req.user is attached by auth middleware
  sendSuccess(res, { user: req.user });
});
