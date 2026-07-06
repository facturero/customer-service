import { Address } from '../../domain/entities';
import { CustomerNotFoundError } from '../../domain/errors';
import { Repositories } from '../../domain/repositories';
import { AddAddressInput, AddressDTO } from '../dtos';

export class AddAddressUseCase {
  constructor(private readonly repos: Repositories) {}

  async execute(input: AddAddressInput): Promise<AddressDTO> {
    const customer = await this.repos.customers.findById(input.customerId);
    if (!customer || !customer.belongsToOrganization(input.organizationId)) {
      throw new CustomerNotFoundError();
    }

    const address = Address.create({
      customerId: input.customerId,
      type: input.type ?? 'other',
      line1: input.line1,
      line2: input.line2 ?? null,
      city: input.city ?? null,
      province: input.province ?? null,
      countryCode: input.countryCode ?? null,
      postalCode: input.postalCode ?? null,
      isPrimary: input.isPrimary ?? false,
    });

    await this.repos.addresses.save(address);

    return {
      id: address.id,
      customerId: address.customerId,
      type: address.type,
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      province: address.province,
      countryCode: address.countryCode,
      postalCode: address.postalCode,
      isPrimary: address.isPrimary,
    };
  }
}
