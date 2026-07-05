import crypto from 'crypto';
import { Setting } from '../models/Setting';

export async function getSettings(userId: string) {
  let settings = await Setting.findOne({ user: userId });
  if (!settings) {
    settings = await Setting.create({ user: userId });
  }
  return settings;
}

export async function updateSettings(userId: string, patch: Record<string, unknown>) {
  const settings = await Setting.findOneAndUpdate(
    { user: userId },
    { $set: patch },
    { new: true, upsert: true },
  );
  return settings;
}

export async function createApiKey(userId: string, name: string) {
  const rawKey = `croo_${crypto.randomBytes(24).toString('hex')}`;
  const preview = `${rawKey.slice(0, 10)}...${rawKey.slice(-4)}`;

  const settings = await Setting.findOneAndUpdate(
    { user: userId },
    { $push: { 'apiSettings.apiKeys': { name, keyPreview: preview, createdAt: new Date() } } },
    { new: true, upsert: true },
  );

  return { settings, rawKey };
}
