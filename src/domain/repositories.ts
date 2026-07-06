import {
  Customer,
  Contact,
  Address,
  Tag,
  IdentificationType,
} from './entities';

export interface DomainEvent {
  type: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
}

export interface ListCustomersFilters {
  search?: string;
  status?: string;
  tagId?: string;
}

export interface CustomerRepository {
  findById(id: string): Promise<Customer | null>;
  findByIdentification(organizationId: string, identification: string): Promise<Customer | null>;
  list(organizationId: string, filters: ListCustomersFilters): Promise<Customer[]>;
  save(customer: Customer): Promise<void>;
}

export interface ContactRepository {
  findById(id: string): Promise<Contact | null>;
  listByCustomer(customerId: string): Promise<Contact[]>;
  save(contact: Contact): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface AddressRepository {
  findById(id: string): Promise<Address | null>;
  listByCustomer(customerId: string): Promise<Address[]>;
  save(address: Address): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface TagRepository {
  findById(id: string): Promise<Tag | null>;
  findByName(organizationId: string, name: string): Promise<Tag | null>;
  listByOrganization(organizationId: string): Promise<Tag[]>;
  save(tag: Tag): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface CustomerTagRepository {
  listByCustomer(customerId: string): Promise<Tag[]>;
  add(customerId: string, tagId: string): Promise<void>;
  remove(customerId: string, tagId: string): Promise<void>;
}

export interface IdentificationTypeReadModelRepository {
  findById(id: string): Promise<IdentificationType | null>;
  listByCountry(countryCode: string): Promise<IdentificationType[]>;
  upsert(type: IdentificationType): Promise<void>;
}

export interface OutboxRepository {
  add(event: DomainEvent): Promise<void>;
}

export interface Repositories {
  customers: CustomerRepository;
  contacts: ContactRepository;
  addresses: AddressRepository;
  tags: TagRepository;
  customerTags: CustomerTagRepository;
  identificationTypes: IdentificationTypeReadModelRepository;
  outbox: OutboxRepository;
}
