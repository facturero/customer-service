import { Contact } from '../../domain/entities';
import { CustomerNotFoundError } from '../../domain/errors';
import { UnitOfWork } from '../ports';
import { AddContactInput, ContactDTO } from '../dtos';

export class AddContactUseCase {
  constructor(private readonly uow: UnitOfWork) {}

  async execute(input: AddContactInput): Promise<ContactDTO> {
    // Todo en UNA transacción: el cambio y su evento de auditoría se confirman juntos o ninguno. Fuera de ella, un fallo entre
    // ambos pierde el evento (o publica uno de algo que no quedó guardado), y el relé no se entera hasta su siguiente barrido.
    return this.uow.execute(async (repos) => {
      const customer = await repos.customers.findById(input.customerId);
      if (!customer || !customer.belongsToOrganization(input.organizationId)) {
        throw new CustomerNotFoundError();
      }

      const contact = Contact.create({
        customerId: input.customerId,
        name: input.name,
        email: input.email ?? null,
        phone: input.phone ?? null,
        position: input.position ?? null,
      });

      await repos.contacts.save(contact);

      // Direcciones, contactos y etiquetas del cliente: hasta ahora solo el alta,
      // edición y baja del CLIENTE emitían evento, así que todo lo que colgaba de
      // él se podía cambiar sin dejar rastro en la bitácora.
      await repos.outbox.add({
        type: 'customer.contact.added',
        aggregateType: 'contact',
        aggregateId: contact.id,
        payload: {
          organizationId: input.organizationId,
          customerId: input.customerId,
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
