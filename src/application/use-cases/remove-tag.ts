import { CustomerNotFoundError, TagNotFoundError } from '../../domain/errors';
import { UnitOfWork } from '../ports';

export class RemoveTagUseCase {
  constructor(private readonly uow: UnitOfWork) {}

  async execute(organizationId: string, customerId: string, tagId: string): Promise<void> {
    // Todo en UNA transacción: el cambio y su evento de auditoría se confirman juntos o ninguno. Fuera de ella, un fallo entre
    // ambos pierde el evento (o publica uno de algo que no quedó guardado), y el relé no se entera hasta su siguiente barrido.
    await this.uow.execute(async (repos) => {
      const customer = await repos.customers.findById(customerId);
      if (!customer || !customer.belongsToOrganization(organizationId)) {
        throw new CustomerNotFoundError();
      }

      const tag = await repos.tags.findById(tagId);
      if (!tag || !tag.belongsToOrganization(organizationId)) {
        throw new TagNotFoundError();
      }

      await repos.customerTags.remove(customerId, tagId);

      // Direcciones, contactos y etiquetas del cliente: hasta ahora solo el alta,
      // edición y baja del CLIENTE emitían evento, así que todo lo que colgaba de
      // él se podía cambiar sin dejar rastro en la bitácora.
      await repos.outbox.add({
        type: 'customer.tag.removed',
        aggregateType: 'customer_tag',
        aggregateId: customerId,
        payload: {
          organizationId: organizationId,
          customerId,
          tagId,
        },
        occurredAt: new Date(),
      });

    });
  }
}
