import { CustomerNotFoundError } from '../../domain/errors';
import { Repositories } from '../../domain/repositories';
import { CustomerDetailDTO } from '../dtos';

export class GetCustomerUseCase {
  constructor(private readonly repos: Repositories) {}

  async execute(organizationId: string, id: string): Promise<CustomerDetailDTO> {
    const customer = await this.repos.customers.findById(id);
    if (!customer || !customer.belongsToOrganization(organizationId)) {
      throw new CustomerNotFoundError();
    }

    const [contacts, addresses, tags] = await Promise.all([
      this.repos.contacts.listByCustomer(id),
      this.repos.addresses.listByCustomer(id),
      this.repos.customerTags.listByCustomer(id),
    ]);

    return {
      id: customer.id,
      organizationId: customer.organizationId,
      countryCode: customer.countryCode,
      identificationTypeId: customer.identificationTypeId,
      identification: customer.identification,
      businessName: customer.businessName,
      tradeName: customer.tradeName,
      email: customer.email,
      phone: customer.phone,
      type: customer.type,
      status: customer.status,
      metadata: customer.metadata,
      contacts: contacts.map((c) => ({
        id: c.id,
        customerId: c.customerId,
        name: c.name,
        email: c.email,
        phone: c.phone,
        position: c.position,
      })),
      addresses: addresses.map((a) => ({
        id: a.id,
        customerId: a.customerId,
        type: a.type,
        line1: a.line1,
        line2: a.line2,
        city: a.city,
        province: a.province,
        countryCode: a.countryCode,
        postalCode: a.postalCode,
        isPrimary: a.isPrimary,
      })),
      tags: tags.map((t) => ({
        id: t.id,
        organizationId: t.organizationId,
        name: t.name,
        color: t.color,
      })),
    };
  }
}
