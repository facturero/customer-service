import { describe, it, expect, vi } from 'vitest';
import { UpdateCustomerUseCase } from '../application/use-cases/update-customer';
import { Customer, IdentificationType } from '../domain/entities';
import { Repositories, DomainEvent } from '../domain/repositories';
import { UnitOfWork } from '../application/ports';
import { CustomerAlreadyExistsError } from '../domain/errors';

function fakeIdentificationType(overrides = {}): IdentificationType {
  return IdentificationType.fromPersistence({
    id: 'id-type-1',
    countryCode: 'EC',
    code: 'RUC',
    name: 'RUC',
    regex: '^\\d{13}$',
    ...overrides,
  });
}

function fakeCustomer(overrides: Record<string, any> = {}): Customer {
  return Customer.fromPersistence({
    id: overrides.id ?? 'cust-1',
    organizationId: overrides.organizationId ?? 'org-1',
    countryCode: 'EC',
    identificationTypeId: 'id-type-1',
    identification: overrides.identification ?? '1790012345000',
    businessName: overrides.businessName ?? 'Acme S.A.',
    tradeName: null,
    email: null,
    phone: null,
    type: 'company',
    status: 'active',
    isSystem: false,
    imageFileId: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function buildFakeRepos(initial: Customer[]): Repositories {
  const customers: Map<string, any> = new Map(initial.map((c) => [c.id, c]));
  let events: DomainEvent[] = [];

  return {
    customers: {
      findById: vi.fn(async (id) => customers.get(id) ?? null),
      findByIdentification: vi.fn(async (orgId, identification) => {
        for (const c of customers.values()) {
          if (c.organizationId === orgId && c.identification === identification) return c;
        }
        return null;
      }),
      list: vi.fn(),
      save: vi.fn(async (customer) => {
        customers.set(customer.id, customer);
      }),
    },
    contacts: {
      findById: vi.fn(),
      listByCustomer: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    },
    addresses: {
      findById: vi.fn(),
      listByCustomer: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    },
    tags: {
      findById: vi.fn(),
      findByName: vi.fn(),
      listByOrganization: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    },
    customerTags: {
      listByCustomer: vi.fn(),
      add: vi.fn(),
      remove: vi.fn(),
    },
    identificationTypes: {
      findById: vi.fn(async (id) => id === 'id-type-1' ? fakeIdentificationType() : null),
      listByCountry: vi.fn(),
      upsert: vi.fn(),
    },
    outbox: {
      add: vi.fn(async (event) => { events.push(event); }),
    },
  };
}

function buildUnitOfWork(repos: Repositories): UnitOfWork {
  return {
    async execute<T>(work: (r: Repositories) => Promise<T>): Promise<T> {
      return work(repos);
    },
  };
}

describe('UpdateCustomerUseCase', () => {
  it('updates a customer keeping its own identification (no duplicate check trip)', async () => {
    const repos = buildFakeRepos([fakeCustomer()]);
    const uow = buildUnitOfWork(repos);
    const useCase = new UpdateCustomerUseCase(uow);

    const result = await useCase.execute({
      organizationId: 'org-1',
      id: 'cust-1',
      businessName: 'Acme Actualizada S.A.',
      identificationTypeId: 'id-type-1',
      identification: '1790012345000',
    });

    expect(result.businessName).toBe('Acme Actualizada S.A.');
    expect(result.identification).toBe('1790012345000');
    expect(repos.outbox.add).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'customer.customer.updated' }),
    );
  });

  it('rejects changing to an identification already used by another customer', async () => {
    const repos = buildFakeRepos([
      fakeCustomer({ id: 'cust-1', identification: '1790012345000' }),
      fakeCustomer({ id: 'cust-2', identification: '1790012345001' }),
    ]);
    const uow = buildUnitOfWork(repos);
    const useCase = new UpdateCustomerUseCase(uow);

    await expect(
      useCase.execute({
        organizationId: 'org-1',
        id: 'cust-1',
        identificationTypeId: 'id-type-1',
        identification: '1790012345001',
      }),
    ).rejects.toThrow(CustomerAlreadyExistsError);
    // Sin guardar: el cambio conflictivo no debe persistir (TEST-PLAN.md #22).
    expect(repos.customers.save).not.toHaveBeenCalled();
  });

  it('allows clearing identification (null)', async () => {
    const repos = buildFakeRepos([fakeCustomer()]);
    const uow = buildUnitOfWork(repos);
    const useCase = new UpdateCustomerUseCase(uow);

    const result = await useCase.execute({
      organizationId: 'org-1',
      id: 'cust-1',
      identification: null,
    });

    expect(result.identification).toBeNull();
    expect(repos.outbox.add).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'customer.customer.updated' }),
    );
  });
});