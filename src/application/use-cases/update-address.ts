import { AddressNotFoundError } from '../../domain/errors';
import { UnitOfWork } from '../ports';
import { AddressDTO, UpdateAddressInput } from '../dtos';

export class UpdateAddressUseCase {
  constructor(private readonly uow: UnitOfWork) {}

  async execute(input: UpdateAddressInput): Promise<AddressDTO> {
    // Todo en UNA transacción: el cambio y su evento de auditoría se confirman juntos o ninguno. Fuera de ella, un fallo entre
    // ambos pierde el evento (o publica uno de algo que no quedó guardado), y el relé no se entera hasta su siguiente barrido.
    return this.uow.execute(async (repos) => {
      const address = await repos.addresses.findById(input.id);
      if (!address) throw new AddressNotFoundError();

      const customer = await repos.customers.findById(address.customerId);
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

      await repos.addresses.save(address);

      // Direcciones, contactos y etiquetas del cliente: hasta ahora solo el alta,
      // edición y baja del CLIENTE emitían evento, así que todo lo que colgaba de
      // él se podía cambiar sin dejar rastro en la bitácora.
      await repos.outbox.add({
        type: 'customer.address.updated',
        aggregateType: 'address',
        aggregateId: address.id,
        payload: {
          organizationId: input.organizationId,
          customerId: address.customerId,
          addressId: address.id,
        },
        occurredAt: new Date(),
      });


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
    });
  }
}
