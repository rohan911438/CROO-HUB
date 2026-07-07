import crypto from 'crypto';
import { ethers } from 'ethers';
import { User } from '../models/User';
import { Setting } from '../models/Setting';
import { Organization } from '../models/Organization';
import { AppError } from '../utils/AppError';
import { comparePassword, hashPassword } from '../utils/hash';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';

interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export async function registerUser(input: RegisterInput) {
  const existing = await User.findOne({ email: input.email.toLowerCase() });
  if (existing) {
    throw AppError.conflict('An account with this email already exists');
  }

  const passwordHash = await hashPassword(input.password);
  const emailVerificationToken = crypto.randomBytes(32).toString('hex');

  const user = await User.create({
    name: input.name,
    email: input.email.toLowerCase(),
    passwordHash,
    emailVerificationToken,
    emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  await Setting.create({ user: user._id });

  return { user, emailVerificationToken };
}

export async function loginUser(email: string, password: string) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user || !user.passwordHash) {
    throw AppError.unauthorized('Invalid email or password');
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    throw AppError.unauthorized('Invalid email or password');
  }

  user.lastLoginAt = new Date();
  await user.save();

  return issueTokens(user.id, user.email, user.role);
}

export function issueTokens(sub: string, email: string, role: 'owner' | 'admin' | 'member') {
  const accessToken = signAccessToken({ sub, email, role });
  const refreshToken = signRefreshToken({ sub });
  return { accessToken, refreshToken };
}

export async function refreshAccessToken(refreshToken: string) {
  let payload: { sub: string };
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw AppError.unauthorized('Invalid or expired refresh token');
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    throw AppError.unauthorized('User no longer exists');
  }

  return issueTokens(user.id, user.email, user.role);
}

export async function verifyEmailToken(token: string) {
  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: new Date() },
  }).select('+emailVerificationToken +emailVerificationExpires');

  if (!user) {
    throw AppError.badRequest('Verification link is invalid or has expired');
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  return user;
}

export async function requestPasswordReset(email: string) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    // Do not reveal whether the account exists
    return { token: null };
  }

  const token = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = token;
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();

  return { token };
}

/**
 * SIWE-style wallet authentication: the frontend requests a nonce for an address, signs the
 * exact returned message with the connected wallet, then posts the signature back for
 * verification. On first sign-in for an address, a User (+ Organization + Setting) is
 * auto-provisioned so the connect-wallet flow needs no separate email/password sign-up step.
 */
const walletNonces = new Map<string, { message: string; expiresAt: number }>();
const NONCE_TTL_MS = 5 * 60 * 1000;

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function getWalletNonce(address: string) {
  const normalized = address.toLowerCase();
  const nonce = crypto.randomBytes(16).toString('hex');
  const message = [
    'CROO Hub wants you to sign in with your Ethereum account:',
    normalized,
    '',
    `Nonce: ${nonce}`,
    `Issued At: ${new Date().toISOString()}`,
  ].join('\n');

  walletNonces.set(normalized, { message, expiresAt: Date.now() + NONCE_TTL_MS });
  return { message };
}

export async function verifyWalletSignature(address: string, signature: string) {
  const normalized = address.toLowerCase();
  const entry = walletNonces.get(normalized);
  if (!entry || entry.expiresAt < Date.now()) {
    throw AppError.unauthorized('Signing request expired - reconnect your wallet and try again');
  }

  let recovered: string;
  try {
    recovered = ethers.verifyMessage(entry.message, signature);
  } catch {
    throw AppError.unauthorized('Invalid signature');
  }

  if (recovered.toLowerCase() !== normalized) {
    throw AppError.unauthorized('Signature does not match the connected wallet address');
  }

  walletNonces.delete(normalized);

  let user = await User.findOne({ walletAddress: normalized });
  if (!user) {
    const org = await Organization.create({
      name: `${shortAddress(normalized)}'s Workspace`,
      slug: `wallet-${normalized.slice(2, 10)}`,
      plan: 'free',
      seats: 1,
      billingEmail: `${normalized}@wallet.croohub.local`,
    });

    user = await User.create({
      name: shortAddress(normalized),
      email: `${normalized}@wallet.croohub.local`,
      walletAddress: normalized,
      role: 'owner',
      organization: org._id,
      isEmailVerified: true,
      onboardingCompleted: true,
      avatarUrl: `https://api.dicebear.com/7.x/notionists/svg?seed=${normalized}`,
    });

    org.members = [user._id];
    await org.save();
    await Setting.create({ user: user._id });
  }

  user.lastLoginAt = new Date();
  await user.save();

  return issueTokens(user.id, user.email, user.role);
}

export async function resetPassword(token: string, newPassword: string) {
  const user = await User.findOne({
    passwordResetToken: token,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) {
    throw AppError.badRequest('Reset link is invalid or has expired');
  }

  user.passwordHash = await hashPassword(newPassword);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  return user;
}
