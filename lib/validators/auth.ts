import { z } from "zod";

/** An identifier is either an email or a Bangladeshi phone number. */
export const identifierSchema = z
  .string()
  .trim()
  .min(3)
  .refine(
    (v) => /\S+@\S+\.\S+/.test(v) || /^01\d{9}$/.test(v),
    "Enter a valid email or phone number (01XXXXXXXXX)"
  );

export function isEmail(identifier: string): boolean {
  return /\S+@\S+\.\S+/.test(identifier);
}

export const sendOtpSchema = z.object({
  identifier: identifierSchema,
});

export const verifyOtpSchema = z.object({
  identifier: identifierSchema,
  code: z.string().trim().length(6),
});

export const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  identifier: identifierSchema,
  code: z.string().trim().length(6),
  password: z.string().min(8).max(200),
  sector: z.enum(["STUDENT", "INSTRUCTOR", "AGENT"]),
});

export const loginSchema = z.object({
  identifier: identifierSchema,
  password: z.string().min(1),
});

export const resetPassSchema = z.object({
  identifier: identifierSchema,
  code: z.string().trim().length(6),
  password: z.string().min(8).max(200),
});
