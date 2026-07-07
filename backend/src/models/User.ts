import { Schema, model, Document, Types } from 'mongoose';

export type UserRole = 'owner' | 'admin' | 'member';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash?: string;
  walletAddress?: string;
  avatarUrl?: string;
  role: UserRole;
  organization?: Types.ObjectId;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  onboardingCompleted: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, select: false },
    walletAddress: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    avatarUrl: { type: String },
    role: { type: String, enum: ['owner', 'admin', 'member'], default: 'owner' },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    onboardingCompleted: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

export const User = model<IUser>('User', userSchema);
