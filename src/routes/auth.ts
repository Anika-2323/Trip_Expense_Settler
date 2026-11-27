// src/routes/auth.ts
import { Router, Request, Response } from 'express';
import { User } from '../models/User';
import { signToken, hashPassword, comparePassword } from '../utils/auth';

const router = Router();

// Register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and password are required' });
      return;
    }

    const existing = await User.findOne({ email });
    if (existing) {
      res.status(400).json({ error: 'User with this email already exists' });
      return;
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({ name, email, passwordHash });

    const token = signToken({
      userId: user._id.toString(),
      name: user.name,
      email: user.email,
    });

    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await User.findOne({ email });
    if (!user || !user.passwordHash) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = signToken({
      userId: user._id.toString(),
      name: user.name,
      email: user.email,
    });

    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Guest Join
router.post('/guest-join', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Name is required to join as guest' });
      return;
    }

    const guestUser = await User.create({ name });
    const token = signToken({
      userId: guestUser._id.toString(),
      name: guestUser.name,
      isGuest: true,
    });

    res.status(201).json({ token, user: { id: guestUser._id, name: guestUser.name, isGuest: true } });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

export default router;