import { CustomerNotFoundError, CannotEditSystemCustomerError, IdentificationTypeNotFoundError, InvalidIdentificationError, CustomerAlreadyExistsError } from '../../domain/errors';
import { UnitOfWork } from '../ports';
import { CustomerDTO, UpdateCustomerInput } from '../dtos';

export class UpdateCustomerUseCase {
  constructor(private readonly uow: UnitOfWork) {}

  async execute(input: UpdateCustomerInput): Promise<CustomerDTO> {
    return this.uow.execute(async (repos) => {
      const customer = await repos.customers.findById(input.id);
      if (!customer || !customer.belongsToOrganization(input.organizationId)) {
        throw new CustomerNotFoundError();
      }

      if (customer.isSystem) {
        if (input.identificationTypeId !== undefined || input.identification !== undefined) {
          throw new CannotEditSystemCustomerError();
        }
      }

      if (input.identificationTypeId !== undefined || input.identification !== undefined) {
        const idTypeId = input.identificationTypeId ?? customer.identificationTypeId;
        const idValue = input.identification ?? customer.identification;

        if (idTypeId && idValue) {
          const idType = await repos.identificationTypes.findById(idTypeId);
          if (!idType) throw new IdentificationTypeNotFoundError();

          if (idType.regex) {
            const regex = new RegExp(idType.regex);
            if (!regex.test(idValue)) {
              throw new InvalidIdentificationError();
            }
          }
        }

        // Pre-check de unicidad antes de persistir: si la identificación
        // efectiva cambió a una que ya usa OTRO cliente de la organización,
        // respondemos 409 limpio en vez de reventar en el UPDATE con el
        // índice único (TEST-PLAN.md #22).
        if (idValue && idValue !== customer.identification) {
          const existing = await repos.customers.findByIdentification(input.organizationId, idValue);
          if (existing && existing.id !== customer.id) throw new CustomerAlreadyExistsError();
        }
      }

      customer.update({
        businessName: input.businessName,
        tradeName: input.tradeName,
        identificationTypeId: input.identificationTypeId,
        identification: input.identification,
        email: input.email,
        phone: input.phone,
        imageFileId: input.imageFileId,
        metadata: input.metadata,
      });

      await repos.customers.save(customer);

      await repos.outbox.add({
        type: 'customer.customer.updated',
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
        isSystem: customer.isSystem,
        imageFileId: customer.imageFileId,
        metadata: customer.metadata,
      };
    });
  }
}
