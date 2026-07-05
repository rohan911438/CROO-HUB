import { Template } from '../models/Template';
import { Workflow } from '../models/Workflow';
import { AppError } from '../utils/AppError';

export async function listTemplates(category?: string) {
  const filter = category ? { category } : {};
  return Template.find(filter).sort({ featured: -1, usageCount: -1 });
}

export async function getTemplate(slug: string) {
  const template = await Template.findOne({ slug });
  if (!template) throw AppError.notFound('Template not found');
  return template;
}

export async function duplicateTemplateAsWorkflow(slug: string, owner: string, name?: string) {
  const template = await Template.findOne({ slug });
  if (!template) throw AppError.notFound('Template not found');

  template.usageCount += 1;
  await template.save();

  return Workflow.create({
    owner,
    name: name ?? `${template.name} (copy)`,
    description: template.description,
    nodes: template.nodes,
    edges: template.edges,
    templateSource: template._id,
    status: 'draft',
  });
}
