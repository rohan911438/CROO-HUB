import { Notification } from '../models/Notification';
import { AppError } from '../utils/AppError';

export async function listNotifications(user: string, unreadOnly?: boolean) {
  const filter: Record<string, unknown> = { user };
  if (unreadOnly) filter.isRead = false;
  return Notification.find(filter).sort({ createdAt: -1 }).limit(100);
}

export async function markAsRead(id: string, user: string) {
  const notification = await Notification.findOneAndUpdate(
    { _id: id, user },
    { isRead: true },
    { new: true },
  );
  if (!notification) throw AppError.notFound('Notification not found');
  return notification;
}

export async function markAllAsRead(user: string) {
  await Notification.updateMany({ user, isRead: false }, { isRead: true });
  return { acknowledged: true };
}
