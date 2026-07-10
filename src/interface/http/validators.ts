import { zValidator } from '@hono/zod-validator';
import { z, ZodSchema } from 'zod';
import { ValidationError } from '../../domain/errors';

export const createCustomerSchema = z.object({
  businessName: z.string().min(1, 'La razón social es obligatoria.').max(255),
  tradeName: z.string().max(255).optional(),
  type: z.enum(['person', 'company']),
  identificationTypeId: z.string().uuid().optional(),
  identification: z.string().max(30).optional(),
  email: z.string().email('Email inválido.').optional().or(z.literal('')),
  phone: z.string().max(30).optional(),
  imageFileId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateCustomerSchema = z.object({
  businessName: z.string().max(255).optional(),
  tradeName: z.string().max(255).optional().nullable(),
  identificationTypeId: z.string().uuid().optional().nullable(),
  identification: z.string().max(30).optional().nullable(),
  email: z.string().email('Email inválido.').optional().nullable().or(z.literal('')),
  phone: z.string().max(30).optional().nullable(),
  imageFileId: z.string().uuid().optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
});

export const contactSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio.').max(255),
  email: z.string().email('Email inválido.').optional().or(z.literal('')),
  phone: z.string().max(30).optional(),
  position: z.string().max(100).optional(),
});

export const updateContactSchema = z.object({
  name: z.string().max(255).optional(),
  email: z.string().email('Email inválido.').optional().nullable().or(z.literal('')),
  phone: z.string().max(30).optional().nullable(),
  position: z.string().max(100).optional().nullable(),
});

export const addressSchema = z.object({
  type: z.enum(['billing', 'shipping', 'other']).default('other'),
  line1: z.string().min(1, 'La dirección es obligatoria.').max(255),
  line2: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  province: z.string().max(100).optional(),
  countryCode: z.string().length(2, 'El código de país debe tener 2 caracteres.').optional(),
  postalCode: z.string().max(20).optional(),
  isPrimary: z.boolean().default(false),
});

export const updateAddressSchema = z.object({
  type: z.enum(['billing', 'shipping', 'other']).optional(),
  line1: z.string().max(255).optional(),
  line2: z.string().max(255).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  province: z.string().max(100).optional().nullable(),
  countryCode: z.string().length(2).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  isPrimary: z.boolean().optional(),
});

export const createTagSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio.').max(100),
  color: z.string().max(20).optional(),
});

export const assignTagSchema = z.object({
  tagId: z.string().uuid('El ID de la etiqueta no es válido.'),
});

export function validateJson<T extends ZodSchema>(schema: T) {
  return zValidator('json', schema, (result) => {
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        field: i.path.join('.') || '(root)',
        message: i.message,
      }));
      throw new ValidationError(details);
    }
  });
}
