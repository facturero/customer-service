import { Hono } from 'hono';
import { CreateCustomerUseCase } from '../../application/use-cases/create-customer';
import { ListCustomersUseCase } from '../../application/use-cases/list-customers';
import { GetCustomerUseCase } from '../../application/use-cases/get-customer';
import { UpdateCustomerUseCase } from '../../application/use-cases/update-customer';
import { DisableCustomerUseCase } from '../../application/use-cases/disable-customer';
import { ListCustomerContactsUseCase } from '../../application/use-cases/list-customer-contacts';
import { AddContactUseCase } from '../../application/use-cases/add-contact';
import { UpdateContactUseCase } from '../../application/use-cases/update-contact';
import { DeleteContactUseCase } from '../../application/use-cases/delete-contact';
import { ListCustomerAddressesUseCase } from '../../application/use-cases/list-customer-addresses';
import { AddAddressUseCase } from '../../application/use-cases/add-address';
import { UpdateAddressUseCase } from '../../application/use-cases/update-address';
import { DeleteAddressUseCase } from '../../application/use-cases/delete-address';
import { ListTagsUseCase } from '../../application/use-cases/list-tags';
import { CreateTagUseCase } from '../../application/use-cases/create-tag';
import { AssignTagUseCase } from '../../application/use-cases/assign-tag';
import { RemoveTagUseCase } from '../../application/use-cases/remove-tag';
import { ListIdentificationTypesUseCase } from '../../application/use-cases/list-identification-types';
import {
  createCustomerController,
  listCustomersController,
  getCustomerController,
  updateCustomerController,
  disableCustomerController,
  listCustomerContactsController,
  addContactController,
  updateContactController,
  deleteContactController,
  listCustomerAddressesController,
  addAddressController,
  updateAddressController,
  deleteAddressController,
  listTagsController,
  createTagController,
  assignTagController,
  removeTagController,
  listIdentificationTypesController,
} from './controllers';
import {
  addressSchema,
  assignTagSchema,
  contactSchema,
  createCustomerSchema,
  createTagSchema,
  updateAddressSchema,
  updateContactSchema,
  updateCustomerSchema,
  validateJson,
} from './validators';
import { ContextVariables, requireOrganization, requirePermission } from './middlewares';

type Vars = { Variables: ContextVariables };

export interface AppDependencies {
  useCases: {
    createCustomer: CreateCustomerUseCase;
    listCustomers: ListCustomersUseCase;
    getCustomer: GetCustomerUseCase;
    updateCustomer: UpdateCustomerUseCase;
    disableCustomer: DisableCustomerUseCase;
    listCustomerContacts: ListCustomerContactsUseCase;
    addContact: AddContactUseCase;
    updateContact: UpdateContactUseCase;
    deleteContact: DeleteContactUseCase;
    listCustomerAddresses: ListCustomerAddressesUseCase;
    addAddress: AddAddressUseCase;
    updateAddress: UpdateAddressUseCase;
    deleteAddress: DeleteAddressUseCase;
    listTags: ListTagsUseCase;
    createTag: CreateTagUseCase;
    assignTag: AssignTagUseCase;
    removeTag: RemoveTagUseCase;
    listIdentificationTypes: ListIdentificationTypesUseCase;
  };
  corsOrigin: string;
}

export function healthRoutes(): Hono {
  const r = new Hono();
  r.get('/health', (c) => c.json({ status: 'ok' }));
  return r;
}

export function customerRoutes(deps: AppDependencies): Hono<Vars> {
  const r = new Hono<Vars>();
  const { useCases } = deps;

  r.get('/customers',
    requireOrganization(),
    requirePermission('customer:read'),
    listCustomersController(useCases.listCustomers));

  r.post('/customers',
    requireOrganization(),
    requirePermission('customer:create'),
    validateJson(createCustomerSchema),
    createCustomerController(useCases.createCustomer));

  r.get('/customers/:id',
    requireOrganization(),
    requirePermission('customer:read'),
    getCustomerController(useCases.getCustomer));

  r.patch('/customers/:id',
    requireOrganization(),
    requirePermission('customer:update'),
    validateJson(updateCustomerSchema),
    updateCustomerController(useCases.updateCustomer));

  r.post('/customers/:id/disable',
    requireOrganization(),
    requirePermission('customer:update'),
    disableCustomerController(useCases.disableCustomer));

  r.get('/customers/:id/contacts',
    requireOrganization(),
    requirePermission('customer:read'),
    listCustomerContactsController(useCases.listCustomerContacts));

  r.post('/customers/:id/contacts',
    requireOrganization(),
    requirePermission('customer:update'),
    validateJson(contactSchema),
    addContactController(useCases.addContact));

  r.get('/customers/:id/addresses',
    requireOrganization(),
    requirePermission('customer:read'),
    listCustomerAddressesController(useCases.listCustomerAddresses));

  r.post('/customers/:id/addresses',
    requireOrganization(),
    requirePermission('customer:update'),
    validateJson(addressSchema),
    addAddressController(useCases.addAddress));

  r.post('/customers/:id/tags',
    requireOrganization(),
    requirePermission('customer:update'),
    validateJson(assignTagSchema),
    assignTagController(useCases.assignTag));

  r.delete('/customers/:id/tags/:tagId',
    requireOrganization(),
    requirePermission('customer:update'),
    removeTagController(useCases.removeTag));

  r.get('/tags',
    requireOrganization(),
    requirePermission('customer:read'),
    listTagsController(useCases.listTags));

  r.post('/tags',
    requireOrganization(),
    requirePermission('customer:update'),
    validateJson(createTagSchema),
    createTagController(useCases.createTag));

  r.get('/identification-types',
    requireOrganization(),
    requirePermission('customer:read'),
    listIdentificationTypesController(useCases.listIdentificationTypes));

  return r;
}

export function contactRoutes(deps: AppDependencies): Hono<Vars> {
  const r = new Hono<Vars>();
  const { useCases } = deps;

  r.patch('/contacts/:id',
    requireOrganization(),
    requirePermission('customer:update'),
    validateJson(updateContactSchema),
    updateContactController(useCases.updateContact));

  r.delete('/contacts/:id',
    requireOrganization(),
    requirePermission('customer:update'),
    deleteContactController(useCases.deleteContact));

  return r;
}

export function addressRoutes(deps: AppDependencies): Hono<Vars> {
  const r = new Hono<Vars>();
  const { useCases } = deps;

  r.patch('/addresses/:id',
    requireOrganization(),
    requirePermission('customer:update'),
    validateJson(updateAddressSchema),
    updateAddressController(useCases.updateAddress));

  r.delete('/addresses/:id',
    requireOrganization(),
    requirePermission('customer:update'),
    deleteAddressController(useCases.deleteAddress));

  return r;
}
