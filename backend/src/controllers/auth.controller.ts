import { Request, Response } from 'express';
import { registerUser, loginUser } from '../services/auth.service';

/**
 * Controller for user registration.
 * @param req Express Request object.
 * @param res Express Response object.
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Basic input validation
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ message: 'Email and password are required and must be strings.' });
      return;
    }

    // New password validation rules
    const hasAlphabet = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    if (
      password.length < 8 ||
      !hasAlphabet ||
      !hasNumber ||
      !hasSpecialSymbol
    ) {
      res.status(400).json({
        message:
          'Password must be at least 8 characters long and include at least one alphabetical character, one number, and one special symbol.',
      });
      return;
    }
    // More sophisticated email validation could be added here if desired

    const user = await registerUser(email, password);
    res.status(201).json(user);
  } catch (error: any) {
    if (error.message === 'User already exists with this email.') {
      res.status(409).json({ message: error.message });
    } else {
      console.error('Error during registration:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
};

/**
 * Controller for user login.
 * @param req Express Request object.
 * @param res Express Response object.
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Basic input validation
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ message: 'Email and password are required and must be strings.' });
      return;
    }

    const result = await loginUser(email, password);

    if (!result) {
      res.status(401).json({ message: 'Invalid email or password.' });
      return;
    }

    res.status(200).json(result);
  } catch (error: any) {
    console.error('Error during login:', error);
    // Catch-all for unexpected errors from the service, though loginUser currently returns null for known issues
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
