import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  workspaceName: z.string().min(2)
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const createWorkspaceSchema = z.object({
  name: z.string().min(2).max(120)
});

export const createChatbotSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(2).max(120)
});

export const deleteChatbotSchema = z.object({
  workspaceId: z.string().min(1),
  chatbotId: z.string().min(1)
});

export const createCheckoutSchema = z.object({
  workspaceId: z.string().min(1),
  plan: z.enum(['PRO', 'BUSINESS'])
});
