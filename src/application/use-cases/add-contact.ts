import { Contact } from '../../domain/entities';
import { CustomerNotFoundError } from '../../domain/errors';
import { Repositories } from '../../domain/repositories';
import { AddContactInput, ContactDTO } from '../dtos';

export class AddContactUseCase {
  constructor(private readonly repos: Repositories) {}

  async execute(input: AddContactInput): Promise<ContactDTO> {
    const customer = await this.repos.customers.findById(input.customerId);
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

    await this.repos.contacts.save(contact);

    // Direcciones, contactos y etiquetas del cliente: hasta ahora solo el alta,
    // edición y baja del CLIENTE emitían evento, así que todo lo que colgaba de
    // él se podía cambiar sin dejar rastro en la bitácora.
    await this.repos.outbox.add({
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
  }
}
