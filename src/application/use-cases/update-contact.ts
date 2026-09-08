import { ContactNotFoundError } from '../../domain/errors';
import { Repositories } from '../../domain/repositories';
import { ContactDTO, UpdateContactInput } from '../dtos';

export class UpdateContactUseCase {
  constructor(private readonly repos: Repositories) {}

  async execute(input: UpdateContactInput): Promise<ContactDTO> {
    const contact = await this.repos.contacts.findById(input.id);
    if (!contact) throw new ContactNotFoundError();

    const customer = await this.repos.customers.findById(contact.customerId);
    if (!customer || !customer.belongsToOrganization(input.organizationId)) {
      throw new ContactNotFoundError();
    }

    contact.update({
      name: input.name,
      email: input.email,
      phone: input.phone,
      position: input.position,
    });

    await this.repos.contacts.save(contact);

    // Direcciones, contactos y etiquetas del cliente: hasta ahora solo el alta,
    // edición y baja del CLIENTE emitían evento, así que todo lo que colgaba de
    // él se podía cambiar sin dejar rastro en la bitácora.
    await this.repos.outbox.add({
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
  }
}
