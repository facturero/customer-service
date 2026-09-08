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

    // Direcciones, contactos y etiquetas del cliente: hasta ahora solo el alta,
    // edición y baja del CLIENTE emitían evento, así que todo lo que colgaba de
    // él se podía cambiar sin dejar rastro en la bitácora.
    await this.repos.outbox.add({
      type: 'customer.address.deleted',
      aggregateType: 'address',
      aggregateId: id,
      payload: {
        organizationId: organizationId,
        customerId: address.customerId,
        addressId: id,
      },
      occurredAt: new Date(),
    });

  }
}
