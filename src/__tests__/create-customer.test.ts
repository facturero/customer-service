import { describe, it, expect, vi } from 'vitest';
import { CreateCustomerUseCase } from '../application/use-cases/create-customer';
import { IdentificationType } from '../domain/entities';
import { Repositories, DomainEvent } from '../domain/repositories';
import { UnitOfWork } from '../application/ports';

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

function buildFakeRepos(): Repositories {
  const customers: Map<string, any> = new Map();
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

describe('CreateCustomerUseCase', () => {
  it('creates a customer and emits customer.customer.created event', async () => {
    const repos = buildFakeRepos();
    const uow = buildUnitOfWork(repos);
    const useCase = new CreateCustomerUseCase(uow);

    const result = await useCase.execute({
      organizationId: 'org-1',
      userId: 'user-1',
      countryCode: 'EC',
      businessName: 'Acme S.A.',
      type: 'company',
      identificationTypeId: 'id-type-1',
      identification: '1790012345001',
    });

    expect(result.id).toBeDefined();
    expect(result.businessName).toBe('Acme S.A.');
    expect(result.type).toBe('company');
    expect(result.status).toBe('active');
    expect(repos.outbox.add).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'customer.customer.created' }),
    );
  });

  it('rejects duplicate identification for the same organization', async () => {
    const repos = buildFakeRepos();
    const uow = buildUnitOfWork(repos);
    const useCase = new CreateCustomerUseCase(uow);

    await useCase.execute({
      organizationId: 'org-1',
      userId: 'user-1',
      countryCode: 'EC',
      businessName: 'Acme S.A.',
      type: 'company',
      identificationTypeId: 'id-type-1',
      identification: '1790012345001',
    });

    await expect(
      useCase.execute({
        organizationId: 'org-1',
        userId: 'user-1',
        countryCode: 'EC',
        businessName: 'Acme S.A.',
        type: 'company',
        identificationTypeId: 'id-type-1',
        identification: '1790012345001',
      }),
    ).rejects.toThrow('Ya existe un cliente con esa identificación.');
  });

  it('rejects invalid identification format', async () => {
    const repos = buildFakeRepos();
    const uow = buildUnitOfWork(repos);
    const useCase = new CreateCustomerUseCase(uow);

    await expect(
      useCase.execute({
        organizationId: 'org-1',
        userId: 'user-1',
        countryCode: 'EC',
        businessName: 'Acme S.A.',
        type: 'company',
        identificationTypeId: 'id-type-1',
        identification: '123',
      }),
    ).rejects.toThrow('La identificación no cumple el formato del tipo.');
  });

  it('rejects non-existent identification type', async () => {
    const repos = buildFakeRepos();
    const uow = buildUnitOfWork(repos);
    const useCase = new CreateCustomerUseCase(uow);

    await expect(
      useCase.execute({
        organizationId: 'org-1',
        userId: 'user-1',
        countryCode: 'EC',
        businessName: 'Acme S.A.',
        type: 'company',
        identificationTypeId: 'non-existent',
        identification: '1790012345001',
      }),
    ).rejects.toThrow('El tipo de identificación no existe para el país.');
  });

  it('creates a customer without identification', async () => {
    const repos = buildFakeRepos();
    const uow = buildUnitOfWork(repos);
    const useCase = new CreateCustomerUseCase(uow);

    const result = await useCase.execute({
      organizationId: 'org-1',
      userId: 'user-1',
      countryCode: 'EC',
      businessName: 'Consumidor Final',
      type: 'person',
    });

    expect(result.id).toBeDefined();
    expect(result.identification).toBeNull();
    expect(repos.outbox.add).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'customer.customer.created' }),
    );
  });
});
