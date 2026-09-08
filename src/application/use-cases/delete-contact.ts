import { ContactNotFoundError } from '../../domain/errors';
import { Repositories } from '../../domain/repositories';

export class DeleteContactUseCase {
  constructor(private readonly repos: Repositories) {}

  async execute(organizationId: string, id: string): Promise<void> {
    const contact = await this.repos.contacts.findById(id);
    if (!contact) throw new ContactNotFoundError();

    const customer = await this.repos.customers.findById(contact.customerId);
    if (!customer || !customer.belongsToOrganization(organizationId)) {
      throw new ContactNotFoundError();
    }

    await this.repos.contacts.delete(id);

    // Direcciones, contactos y etiquetas del cliente: hasta ahora solo el alta,
    // edición y baja del CLIENTE emitían evento, así que todo lo que colgaba de
    // él se podía cambiar sin dejar rastro en la bitácora.
    await this.repos.outbox.add({
      type: 'customer.contact.deleted',
      aggregateType: 'contact',
      aggregateId: id,
      payload: {
        organizationId: organizationId,
        customerId: contact.customerId,
        contactId: id,
      },
      occurredAt: new Date(),
    });

  }
}
