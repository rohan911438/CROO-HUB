import { Organization } from '../models/Organization';
import { AppError } from '../utils/AppError';

export async function getOrganization(id: string) {
  const org = await Organization.findById(id).populate('members', 'name email avatarUrl role');
  if (!org) throw AppError.notFound('Organization not found');
  return org;
}

export async function updateOrganization(id: string, input: Partial<{ name: string; billingEmail: string }>) {
  const org = await Organization.findByIdAndUpdate(id, input, { new: true });
  if (!org) throw AppError.notFound('Organization not found');
  return org;
}
