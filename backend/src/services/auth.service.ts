import { PrismaClient, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Check for JWT_SECRET in environment variables
if (!process.env.JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET is not defined in environment variables.");
  // In a real app, you might want to exit the process or prevent server start more gracefully
  throw new Error("FATAL ERROR: JWT_SECRET is not defined. Server cannot start without it.");
}
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Registers a new user.
 * @param email User's email.
 * @param password User's password.
 * @returns The created user object (excluding password).
 * @throws Error if user already exists or other database error.
 */
export const registerUser = async (email: string, password_raw: string): Promise<Omit<User, 'password'>> => {
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error('User already exists with this email.');
  }

  const hashedPassword = await bcrypt.hash(password_raw, 10);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

/**
 * Logs in an existing user.
 * @param email User's email.
 * @param password_raw User's raw password.
 * @returns Object containing user details (excluding password) and JWT token.
 * @throws Error if user not found, password doesn't match, or other error.
 */
export const loginUser = async (email: string, password_raw: string): Promise<{ user: Omit<User, 'password'>; token: string } | null> => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    // Consider throwing a specific error or returning a more informative object
    // For now, returning null to indicate user not found or invalid credentials
    return null;
  }

  const isPasswordValid = await bcrypt.compare(password_raw, user.password);

  if (!isPasswordValid) {
     // Consider throwing a specific error or returning a more informative object
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...userWithoutPassword } = user;

  const token = jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '1h' } // Token expires in 1 hour
  );

  return { user: userWithoutPassword, token };
};
