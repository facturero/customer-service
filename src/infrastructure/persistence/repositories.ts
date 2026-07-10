import { randomUUID } from 'node:crypto';
import { Op, Transaction } from 'sequelize';
import { sequelize } from './sequelize';
import {
  AddressModel,
  ContactModel,
  CustomerModel,
  CustomerTagModel,
  IdentificationTypeModel,
  OutboxModel,
  TagModel,
} from './models';
import {
  Address,
  Contact,
  Customer,
  IdentificationType,
  Tag,
} from '../../domain/entities';
import {
  AddressRepository,
  ContactRepository,
  CustomerRepository,
  CustomerTagRepository,
  DomainEvent,
  IdentificationTypeReadModelRepository,
  OutboxRepository,
  Repositories,
  TagRepository,
} from '../../domain/repositories';
import { UnitOfWork } from '../../application/ports';

function toCustomer(m: CustomerModel): Customer {
  return Customer.fromPersistence({
    id: m.id,
    organizationId: m.organization_id,
    countryCode: m.country_code,
    identificationTypeId: m.identification_type_id,
    identification: m.identification,
    businessName: m.business_name,
    tradeName: m.trade_name,
    email: m.email,
    phone: m.phone,
    type: m.type,
    status: m.status,
    imageFileId: m.image_file_id,
    metadata: m.metadata as Record<string, unknown> | null,
    createdAt: m.created_at,
    updatedAt: m.updated_at,
  });
}

function toContact(m: ContactModel): Contact {
  return Contact.fromPersistence({
    id: m.id,
    customerId: m.customer_id,
    name: m.name,
    email: m.email,
    phone: m.phone,
    position: m.position,
    createdAt: m.created_at,
    updatedAt: m.updated_at,
  });
}

function toAddress(m: AddressModel): Address {
  return Address.fromPersistence({
    id: m.id,
    customerId: m.customer_id,
    type: m.type,
    line1: m.line1,
    line2: m.line2,
    city: m.city,
    province: m.province,
    countryCode: m.country_code,
    postalCode: m.postal_code,
    isPrimary: m.is_primary,
    createdAt: m.created_at,
    updatedAt: m.updated_at,
  });
}

function toTag(m: TagModel): Tag {
  return Tag.fromPersistence({
    id: m.id,
    organizationId: m.organization_id,
    name: m.name,
    color: m.color,
    createdAt: m.created_at,
    updatedAt: m.updated_at,
  });
}

function toIdentificationType(m: IdentificationTypeModel): IdentificationType {
  return IdentificationType.fromPersistence({
    id: m.id,
    countryCode: m.country_code,
    code: m.code,
    name: m.name,
    regex: m.regex,
  });
}

function customerRepository(tx?: Transaction): CustomerRepository {
  return {
    async findById(id) {
      const m = await CustomerModel.findByPk(id, { transaction: tx });
      return m ? toCustomer(m) : null;
    },
    async findByIdentification(organizationId, identification) {
      const m = await CustomerModel.findOne({
        where: { organization_id: organizationId, identification },
        transaction: tx,
      });
      return m ? toCustomer(m) : null;
    },
    async list(organizationId, filters) {
      const where: Record<string, unknown> = { organization_id: organizationId };
      if (filters.status) where.status = filters.status;

      if (filters.search) {
        where[Op.or as unknown as string] = [
          { business_name: { [Op.like]: `%${filters.search}%` } },
          { identification: { [Op.like]: `%${filters.search}%` } },
          { email: { [Op.like]: `%${filters.search}%` } },
        ];
      }

      if (filters.tagId) {
        const customerIds = (
          await CustomerTagModel.findAll({
            where: { tag_id: filters.tagId },
            attributes: ['customer_id'],
            transaction: tx,
          })
        ).map((r) => r.customer_id);

        where.id = { [Op.in]: customerIds };
      }

      const rows = await CustomerModel.findAll({
        where,
        transaction: tx,
        order: [['created_at', 'DESC']],
      });
      return rows.map(toCustomer);
    },
    async save(customer) {
      const p = customer.toPersistence();
      await CustomerModel.upsert(
        {
          id: p.id,
          organization_id: p.organizationId,
          country_code: p.countryCode,
          identification_type_id: p.identificationTypeId,
          identification: p.identification,
          business_name: p.businessName,
          trade_name: p.tradeName,
          email: p.email,
          phone: p.phone,
          type: p.type,
          status: p.status,
          image_file_id: p.imageFileId,
          metadata: p.metadata,
          created_at: p.createdAt,
          updated_at: new Date(),
        },
        { transaction: tx },
      );
    },
  };
}

function contactRepository(tx?: Transaction): ContactRepository {
  return {
    async findById(id) {
      const m = await ContactModel.findByPk(id, { transaction: tx });
      return m ? toContact(m) : null;
    },
    async listByCustomer(customerId) {
      const rows = await ContactModel.findAll({
        where: { customer_id: customerId },
        transaction: tx,
      });
      return rows.map(toContact);
    },
    async save(contact) {
      const p = contact.toPersistence();
      await ContactModel.upsert(
        {
          id: p.id,
          customer_id: p.customerId,
          name: p.name,
          email: p.email,
          phone: p.phone,
          position: p.position,
          created_at: p.createdAt,
          updated_at: new Date(),
        },
        { transaction: tx },
      );
    },
    async delete(id) {
      await ContactModel.destroy({ where: { id }, transaction: tx });
    },
  };
}

function addressRepository(tx?: Transaction): AddressRepository {
  return {
    async findById(id) {
      const m = await AddressModel.findByPk(id, { transaction: tx });
      return m ? toAddress(m) : null;
    },
    async listByCustomer(customerId) {
      const rows = await AddressModel.findAll({
        where: { customer_id: customerId },
        transaction: tx,
      });
      return rows.map(toAddress);
    },
    async save(address) {
      const p = address.toPersistence();
      await AddressModel.upsert(
        {
          id: p.id,
          customer_id: p.customerId,
          type: p.type,
          line1: p.line1,
          line2: p.line2,
          city: p.city,
          province: p.province,
          country_code: p.countryCode,
          postal_code: p.postalCode,
          is_primary: p.isPrimary,
          created_at: p.createdAt,
          updated_at: new Date(),
        },
        { transaction: tx },
      );
    },
    async delete(id) {
      await AddressModel.destroy({ where: { id }, transaction: tx });
    },
  };
}

function tagRepository(tx?: Transaction): TagRepository {
  return {
    async findById(id) {
      const m = await TagModel.findByPk(id, { transaction: tx });
      return m ? toTag(m) : null;
    },
    async findByName(organizationId, name) {
      const m = await TagModel.findOne({
        where: { organization_id: organizationId, name },
        transaction: tx,
      });
      return m ? toTag(m) : null;
    },
    async listByOrganization(organizationId) {
      const rows = await TagModel.findAll({
        where: { organization_id: organizationId },
        transaction: tx,
        order: [['name', 'ASC']],
      });
      return rows.map(toTag);
    },
    async save(tag) {
      const p = tag.toPersistence();
      await TagModel.upsert(
        {
          id: p.id,
          organization_id: p.organizationId,
          name: p.name,
          color: p.color,
          created_at: p.createdAt,
          updated_at: new Date(),
        },
        { transaction: tx },
      );
    },
    async delete(id) {
      await TagModel.destroy({ where: { id }, transaction: tx });
    },
  };
}

function customerTagRepository(tx?: Transaction): CustomerTagRepository {
  return {
    async listByCustomer(customerId) {
      const rows = await CustomerTagModel.findAll({
        where: { customer_id: customerId },
        include: [{ model: TagModel, required: true }],
        transaction: tx,
      });
      return rows.map((r) => toTag((r as unknown as { tag: TagModel }).tag));
    },
    async add(customerId, tagId) {
      await CustomerTagModel.findOrCreate({
        where: { customer_id: customerId, tag_id: tagId },
        transaction: tx,
      });
    },
    async remove(customerId, tagId) {
      await CustomerTagModel.destroy({
        where: { customer_id: customerId, tag_id: tagId },
        transaction: tx,
      });
    },
  };
}

function identificationTypeReadModelRepository(tx?: Transaction): IdentificationTypeReadModelRepository {
  return {
    async findById(id) {
      const m = await IdentificationTypeModel.findByPk(id, { transaction: tx });
      return m ? toIdentificationType(m) : null;
    },
    async listByCountry(countryCode) {
      const rows = await IdentificationTypeModel.findAll({
        where: { country_code: countryCode },
        transaction: tx,
      });
      return rows.map(toIdentificationType);
    },
    async upsert(type) {
      const p = type.toPersistence();
      await IdentificationTypeModel.upsert(
        {
          id: p.id,
          country_code: p.countryCode,
          code: p.code,
          name: p.name,
          regex: p.regex,
          created_at: new Date(),
          updated_at: new Date(),
        },
        { transaction: tx },
      );
    },
  };
}

function outboxRepository(tx?: Transaction): OutboxRepository {
  return {
    async add(event: DomainEvent) {
      await OutboxModel.create(
        {
          id: randomUUID(),
          aggregate_type: event.aggregateType,
          aggregate_id: event.aggregateId,
          type: event.type,
          payload: event.payload,
          occurred_at: event.occurredAt,
          processed_at: null,
        },
        { transaction: tx },
      );
    },
  };
}

export function buildRepositories(tx?: Transaction): Repositories {
  return {
    customers: customerRepository(tx),
    contacts: contactRepository(tx),
    addresses: addressRepository(tx),
    tags: tagRepository(tx),
    customerTags: customerTagRepository(tx),
    identificationTypes: identificationTypeReadModelRepository(tx),
    outbox: outboxRepository(tx),
  };
}

export class SequelizeUnitOfWork implements UnitOfWork {
  async execute<T>(work: (repos: Repositories) => Promise<T>): Promise<T> {
    return sequelize.transaction(async (tx) => work(buildRepositories(tx)));
  }
}
