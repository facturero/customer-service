import { ContactNotFoundError } from '../../domain/errors';
import { UnitOfWork } from '../ports';
import { ContactDTO, UpdateContactInput } from '../dtos';

export class UpdateContactUseCase {
  constructor(private readonly uow: UnitOfWork) {}

  async execute(input: UpdateContactInput): Promise<ContactDTO> {
    // Todo en UNA transacción: el cambio y su evento de auditoría se confirman juntos o ninguno. Fuera de ella, un fallo entre
    // ambos pierde el evento (o publica uno de algo que no quedó guardado), y el relé no se entera hasta su siguiente barrido.
    return this.uow.execute(async (repos) => {
      const contact = await repos.contacts.findById(input.id);
      if (!contact) throw new ContactNotFoundError();

      const customer = await repos.customers.findById(contact.customerId);
      if (!customer || !customer.belongsToOrganization(input.organizationId)) {
        throw new ContactNotFoundError();
      }

      contact.update({
        name: input.name,
        email: input.email,
        phone: input.phone,
        position: input.position,
      });

      await repos.contacts.save(contact);

      // Direcciones, contactos y etiquetas del cliente: hasta ahora solo el alta,
      // edición y baja del CLIENTE emitían evento, así que todo lo que colgaba de
      // él se podía cambiar sin dejar rastro en la bitácora.
      await repos.outbox.add({
        type: 'customer.contact.updated',
        aggregateType: 'contact',
        aggregateId: contact.id,
        payload: {
          organizationId: input.organizationId,
          customerId: contact.customerId,
          contactId: contact.id,
        },
        occurredAt: new Date(),
      });


      return {
        id: contact.id,
        customerId: contact.customerId,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        position: contact.position,
      };
    });
  }
}
