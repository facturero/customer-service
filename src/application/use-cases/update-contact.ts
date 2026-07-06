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
