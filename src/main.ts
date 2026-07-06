import { serve } from '@hono/node-server';
import { config } from './infrastructure/config';
import { sequelize } from './infrastructure/persistence/sequelize';
import './infrastructure/persistence/models';
import { buildRepositories, SequelizeUnitOfWork } from './infrastructure/persistence/repositories';
import { startConsumers } from './infrastructure/messaging/consumer';
import { CreateCustomerUseCase } from './application/use-cases/create-customer';
import { ListCustomersUseCase } from './application/use-cases/list-customers';
import { GetCustomerUseCase } from './application/use-cases/get-customer';
import { UpdateCustomerUseCase } from './application/use-cases/update-customer';
import { DisableCustomerUseCase } from './application/use-cases/disable-customer';
import { ListCustomerContactsUseCase } from './application/use-cases/list-customer-contacts';
import { AddContactUseCase } from './application/use-cases/add-contact';
import { UpdateContactUseCase } from './application/use-cases/update-contact';
import { DeleteContactUseCase } from './application/use-cases/delete-contact';
import { ListCustomerAddressesUseCase } from './application/use-cases/list-customer-addresses';
import { AddAddressUseCase } from './application/use-cases/add-address';
import { UpdateAddressUseCase } from './application/use-cases/update-address';
import { DeleteAddressUseCase } from './application/use-cases/delete-address';
import { ListTagsUseCase } from './application/use-cases/list-tags';
import { CreateTagUseCase } from './application/use-cases/create-tag';
import { AssignTagUseCase } from './application/use-cases/assign-tag';
import { RemoveTagUseCase } from './application/use-cases/remove-tag';
import { ListIdentificationTypesUseCase } from './application/use-cases/list-identification-types';
import { createApp } from './interface/http/app';

async function main(): Promise<void> {
  await sequelize.authenticate();

  const repos = buildRepositories();
  const uow = new SequelizeUnitOfWork();

  const app = createApp({
    useCases: {
      createCustomer: new CreateCustomerUseCase(uow),
      listCustomers: new ListCustomersUseCase(repos.customers),
      getCustomer: new GetCustomerUseCase(repos),
      updateCustomer: new UpdateCustomerUseCase(uow),
      disableCustomer: new DisableCustomerUseCase(uow),
      listCustomerContacts: new ListCustomerContactsUseCase(repos),
      addContact: new AddContactUseCase(repos),
      updateContact: new UpdateContactUseCase(repos),
      deleteContact: new DeleteContactUseCase(repos),
      listCustomerAddresses: new ListCustomerAddressesUseCase(repos),
      addAddress: new AddAddressUseCase(repos),
      updateAddress: new UpdateAddressUseCase(repos),
      deleteAddress: new DeleteAddressUseCase(repos),
      listTags: new ListTagsUseCase(repos.tags),
      createTag: new CreateTagUseCase(repos),
      assignTag: new AssignTagUseCase(repos),
      removeTag: new RemoveTagUseCase(repos),
      listIdentificationTypes: new ListIdentificationTypesUseCase(repos.identificationTypes),
    },
    corsOrigin: config.CORS_ORIGIN,
  });

  await startConsumers();

  serve({ fetch: app.fetch, port: config.PORT });
  console.log(`[customer-service] corriendo en puerto ${config.PORT}`);
}

main().catch((err) => {
  console.error('[customer-service] error al iniciar:', err);
  process.exit(1);
});
