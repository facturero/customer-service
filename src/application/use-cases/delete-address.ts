import { AddressNotFoundError } from '../../domain/errors';
import { UnitOfWork } from '../ports';

export class DeleteAddressUseCase {
  constructor(private readonly uow: UnitOfWork) {}

  async execute(organizationId: string, id: string): Promise<void> {
    // Todo en UNA transacción: el cambio y su evento de auditoría se confirman juntos o ninguno. Fuera de ella, un fallo entre
    // ambos pierde el evento (o publica uno de algo que no quedó guardado), y el relé no se entera hasta su siguiente barrido.
    await this.uow.execute(async (repos) => {
      const address = await repos.addresses.findById(id);
      if (!address) throw new AddressNotFoundError();

      const customer = await repos.customers.findById(address.customerId);
      if (!customer || !customer.belongsToOrganization(organizationId)) {
        throw new AddressNotFoundError();
      }

      await repos.addresses.delete(id);

      // Direcciones, contactos y etiquetas del cliente: hasta ahora solo el alta,
      // edición y baja del CLIENTE emitían evento, así que todo lo que colgaba de
      // él se podía cambiar sin dejar rastro en la bitácora.
      await repos.outbox.add({
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

    });
  }
}
