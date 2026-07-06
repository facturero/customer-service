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
