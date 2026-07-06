import { Customer } from '../../domain/entities';
import { CustomerAlreadyExistsError, IdentificationTypeNotFoundError, InvalidIdentificationError } from '../../domain/errors';
import { UnitOfWork } from '../ports';
import { CreateCustomerInput, CustomerDTO } from '../dtos';

export class CreateCustomerUseCase {
  constructor(private readonly uow: UnitOfWork) {}

  async execute(input: CreateCustomerInput): Promise<CustomerDTO> {
    return this.uow.execute(async (repos) => {
      if (input.identificationTypeId && input.identification) {
        const idType = await repos.identificationTypes.findById(input.identificationTypeId);
        if (!idType) throw new IdentificationTypeNotFoundError();

        if (idType.regex) {
          const regex = new RegExp(idType.regex);
          if (!regex.test(input.identification)) {
            throw new InvalidIdentificationError();
          }
        }

        const existing = await repos.customers.findByIdentification(
          input.organizationId,
          input.identification,
        );
        if (existing) throw new CustomerAlreadyExistsError();
      }

      const customer = Customer.create({
        organizationId: input.organizationId,
        countryCode: input.countryCode,
        identificationTypeId: input.identificationTypeId ?? null,
        identification: input.identification ?? null,
        businessName: input.businessName,
        tradeName: input.tradeName ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
        type: input.type,
        metadata: input.metadata ?? null,
      });

      await repos.customers.save(customer);

      await repos.outbox.add({
        type: 'customer.customer.created',
        aggregateType: 'customer',
        aggregateId: customer.id,
        payload: {
          customerId: customer.id,
          organizationId: customer.organizationId,
          businessName: customer.businessName,
          type: customer.type,
          identification: customer.identification,
        },
        occurredAt: new Date(),
      });

      return {
        id: customer.id,
        organizationId: customer.organizationId,
        countryCode: customer.countryCode,
        identificationTypeId: customer.identificationTypeId,
        identification: customer.identification,
        businessName: customer.businessName,
        tradeName: customer.tradeName,
        email: customer.email,
        phone: customer.phone,
        type: customer.type,
        status: customer.status,
        metadata: customer.metadata,
      };
    });
  }
}
