import { describe, it, expect, vi } from 'vitest';
import { GetCustomerUseCase } from '../application/use-cases/get-customer';
import { CreateCustomerUseCase } from '../application/use-cases/create-customer';
import { IdentificationType } from '../domain/entities';
import { Repositories } from '../domain/repositories';

function passportType(): IdentificationType {
  return IdentificationType.fromPersistence({ id: 'pasaporte-local', countryCode: 'EC', code: 'PASAPORTE', name: 'Pasaporte', regex: null });
}

function repos(): Repositories {
  const customers = new Map<string, any>();
  const empty = { findById: vi.fn(), listByCustomer: vi.fn(async () => []), save: vi.fn(), delete: vi.fn() };
  return {
    customers: {
      findById: vi.fn(async (id) => customers.get(id) ?? null),
      findByIdentification: vi.fn(async () => null),
      list: vi.fn(),
      save: vi.fn(async (c) => { customers.set(c.id, c); }),
    },
    contacts: empty,
    addresses: empty,
    tags: { findById: vi.fn(), findByName: vi.fn(), listByOrganization: vi.fn(), save: vi.fn(), delete: vi.fn() },
    customerTags: { listByCustomer: vi.fn(async () => []), assign: vi.fn(), remove: vi.fn() },
    identificationTypes: {
      findById: vi.fn(async (id) => (id === 'pasaporte-local' ? passportType() : null)),
      listByCountry: vi.fn(),
      upsert: vi.fn(),
    },
    outbox: { add: vi.fn() },
  } as unknown as Repositories;
}

describe('GetCustomerUseCase', () => {
  it('devuelve el código del tipo de identificación, que es lo que comparten los servicios (los ids no)', async () => {
    const r = repos();
    const created = await new CreateCustomerUseCase({ execute: async (work) => work(r) }).execute({
      organizationId: 'org-1', userId: 'u', countryCode: 'EC', businessName: 'Turista', type: 'person',
      identificationTypeId: 'pasaporte-local', identification: '1712345678',
    } as never);

    const detail = await new GetCustomerUseCase(r).execute('org-1', created.id);

    expect(detail.identificationTypeId).toBe('pasaporte-local');
    expect(detail.identificationTypeCode).toBe('PASAPORTE');
  });
});
