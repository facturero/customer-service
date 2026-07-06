import { CustomerNotFoundError } from '../../domain/errors';
import { Repositories } from '../../domain/repositories';
import { ContactDTO } from '../dtos';

export class ListCustomerContactsUseCase {
  constructor(private readonly repos: Repositories) {}

  async execute(organizationId: string, customerId: string): Promise<ContactDTO[]> {
    const customer = await this.repos.customers.findById(customerId);
    if (!customer || !customer.belongsToOrganization(organizationId)) {
      throw new CustomerNotFoundError();
    }

    const contacts = await this.repos.contacts.listByCustomer(customerId);
    return contacts.map((c) => ({
      id: c.id,
      customerId: c.customerId,
      name: c.name,
      email: c.email,
      phone: c.phone,
      position: c.position,
    }));
  }
}
