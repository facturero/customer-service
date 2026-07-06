import { CustomerNotFoundError } from '../../domain/errors';
import { Repositories } from '../../domain/repositories';
import { AddressDTO } from '../dtos';

export class ListCustomerAddressesUseCase {
  constructor(private readonly repos: Repositories) {}

  async execute(organizationId: string, customerId: string): Promise<AddressDTO[]> {
    const customer = await this.repos.customers.findById(customerId);
    if (!customer || !customer.belongsToOrganization(organizationId)) {
      throw new CustomerNotFoundError();
    }

    const addresses = await this.repos.addresses.listByCustomer(customerId);
    return addresses.map((a) => ({
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
    }));
  }
}
