import { AddressNotFoundError } from '../../domain/errors';
import { Repositories } from '../../domain/repositories';

export class DeleteAddressUseCase {
  constructor(private readonly repos: Repositories) {}

  async execute(organizationId: string, id: string): Promise<void> {
    const address = await this.repos.addresses.findById(id);
    if (!address) throw new AddressNotFoundError();

    const customer = await this.repos.customers.findById(address.customerId);
    if (!customer || !customer.belongsToOrganization(organizationId)) {
      throw new AddressNotFoundError();
    }

    await this.repos.addresses.delete(id);
  }
}
