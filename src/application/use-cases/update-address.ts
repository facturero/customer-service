import { AddressNotFoundError } from '../../domain/errors';
import { Repositories } from '../../domain/repositories';
import { AddressDTO, UpdateAddressInput } from '../dtos';

export class UpdateAddressUseCase {
  constructor(private readonly repos: Repositories) {}

  async execute(input: UpdateAddressInput): Promise<AddressDTO> {
    const address = await this.repos.addresses.findById(input.id);
    if (!address) throw new AddressNotFoundError();

    const customer = await this.repos.customers.findById(address.customerId);
    if (!customer || !customer.belongsToOrganization(input.organizationId)) {
      throw new AddressNotFoundError();
    }

    address.update({
      type: input.type,
      line1: input.line1,
      line2: input.line2,
      city: input.city,
      province: input.province,
      countryCode: input.countryCode,
      postalCode: input.postalCode,
      isPrimary: input.isPrimary,
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
