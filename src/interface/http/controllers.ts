import { Context } from 'hono';
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
import { ContextVariables } from './middlewares';

export function createCustomerController(useCase: CreateCustomerUseCase) {
  return async (c: Context<{ Variables: ContextVariables }>) => {
    const organizationId = c.get('organizationId');
    const userId = c.get('userId');
    const countryCode = c.get('countryCode') || 'EC';
    const body = c.req.valid('json' as never) as {
      businessName: string;
      tradeName?: string;
      type: 'person' | 'company';
      identificationTypeId?: string;
      identification?: string;
      email?: string;
      phone?: string;
      imageFileId?: string;
      metadata?: Record<string, unknown>;
    };
    const result = await useCase.execute({
      organizationId,
      userId,
      countryCode,
      businessName: body.businessName,
      tradeName: body.tradeName,
      type: body.type,
      identificationTypeId: body.identificationTypeId,
      identification: body.identification,
      email: body.email || null,
      phone: body.phone,
      imageFileId: body.imageFileId,
      metadata: body.metadata,
    });
    return c.json(result, 201);
  };
}

export function listCustomersController(useCase: ListCustomersUseCase) {
  return async (c: Context<{ Variables: ContextVariables }>) => {
    const organizationId = c.get('organizationId');
    const search = c.req.query('search');
    const status = c.req.query('status');
    const tagId = c.req.query('tagId');
    const result = await useCase.execute({ organizationId, search, status, tagId });
    return c.json(result, 200);
  };
}

export function getCustomerController(useCase: GetCustomerUseCase) {
  return async (c: Context<{ Variables: ContextVariables }>) => {
    const organizationId = c.get('organizationId');
    const id = c.req.param('id') ?? '';
    const result = await useCase.execute(organizationId, id);
    return c.json(result, 200);
  };
}

export function updateCustomerController(useCase: UpdateCustomerUseCase) {
  return async (c: Context<{ Variables: ContextVariables }>) => {
    const organizationId = c.get('organizationId');
    const id = c.req.param('id') ?? '';
    const body = c.req.valid('json' as never) as {
      businessName?: string;
      tradeName?: string | null;
      identificationTypeId?: string | null;
      identification?: string | null;
      email?: string | null;
      phone?: string | null;
      imageFileId?: string | null;
      metadata?: Record<string, unknown> | null;
    };
    const result = await useCase.execute({ organizationId, id, ...body });
    return c.json(result, 200);
  };
}

export function disableCustomerController(useCase: DisableCustomerUseCase) {
  return async (c: Context<{ Variables: ContextVariables }>) => {
    const organizationId = c.get('organizationId');
    const id = c.req.param('id') ?? '';
    await useCase.execute(organizationId, id);
    return c.body(null, 204);
  };
}

export function listCustomerContactsController(useCase: ListCustomerContactsUseCase) {
  return async (c: Context<{ Variables: ContextVariables }>) => {
    const organizationId = c.get('organizationId');
    const customerId = c.req.param('id') ?? '';
    const result = await useCase.execute(organizationId, customerId);
    return c.json(result, 200);
  };
}

export function addContactController(useCase: AddContactUseCase) {
  return async (c: Context<{ Variables: ContextVariables }>) => {
    const organizationId = c.get('organizationId');
    const customerId = c.req.param('id') ?? '';
    const body = c.req.valid('json' as never) as {
      name: string;
      email?: string;
      phone?: string;
      position?: string;
    };
    const result = await useCase.execute({
      organizationId,
      customerId,
      name: body.name,
      email: body.email,
      phone: body.phone,
      position: body.position,
    });
    return c.json(result, 201);
  };
}

export function updateContactController(useCase: UpdateContactUseCase) {
  return async (c: Context<{ Variables: ContextVariables }>) => {
    const organizationId = c.get('organizationId');
    const id = c.req.param('id') ?? '';
    const body = c.req.valid('json' as never) as {
      name?: string;
      email?: string | null;
      phone?: string | null;
      position?: string | null;
    };
    const result = await useCase.execute({ organizationId, id, ...body });
    return c.json(result, 200);
  };
}

export function deleteContactController(useCase: DeleteContactUseCase) {
  return async (c: Context<{ Variables: ContextVariables }>) => {
    const organizationId = c.get('organizationId');
    const id = c.req.param('id') ?? '';
    await useCase.execute(organizationId, id);
    return c.body(null, 204);
  };
}

export function listCustomerAddressesController(useCase: ListCustomerAddressesUseCase) {
  return async (c: Context<{ Variables: ContextVariables }>) => {
    const organizationId = c.get('organizationId');
    const customerId = c.req.param('id') ?? '';
    const result = await useCase.execute(organizationId, customerId);
    return c.json(result, 200);
  };
}

export function addAddressController(useCase: AddAddressUseCase) {
  return async (c: Context<{ Variables: ContextVariables }>) => {
    const organizationId = c.get('organizationId');
    const customerId = c.req.param('id') ?? '';
    const body = c.req.valid('json' as never) as {
      type?: 'billing' | 'shipping' | 'other';
      line1: string;
      line2?: string;
      city?: string;
      province?: string;
      countryCode?: string;
      postalCode?: string;
      isPrimary?: boolean;
    };
    const result = await useCase.execute({
      organizationId,
      customerId,
      type: body.type,
      line1: body.line1,
      line2: body.line2,
      city: body.city,
      province: body.province,
      countryCode: body.countryCode,
      postalCode: body.postalCode,
      isPrimary: body.isPrimary,
    });
    return c.json(result, 201);
  };
}

export function updateAddressController(useCase: UpdateAddressUseCase) {
  return async (c: Context<{ Variables: ContextVariables }>) => {
    const organizationId = c.get('organizationId');
    const id = c.req.param('id') ?? '';
    const body = c.req.valid('json' as never) as {
      type?: 'billing' | 'shipping' | 'other';
      line1?: string;
      line2?: string | null;
      city?: string | null;
      province?: string | null;
      countryCode?: string | null;
      postalCode?: string | null;
      isPrimary?: boolean;
    };
    const result = await useCase.execute({ organizationId, id, ...body });
    return c.json(result, 200);
  };
}

export function deleteAddressController(useCase: DeleteAddressUseCase) {
  return async (c: Context<{ Variables: ContextVariables }>) => {
    const organizationId = c.get('organizationId');
    const id = c.req.param('id') ?? '';
    await useCase.execute(organizationId, id);
    return c.body(null, 204);
  };
}

export function listTagsController(useCase: ListTagsUseCase) {
  return async (c: Context<{ Variables: ContextVariables }>) => {
    const organizationId = c.get('organizationId');
    const result = await useCase.execute(organizationId);
    return c.json(result, 200);
  };
}

export function createTagController(useCase: CreateTagUseCase) {
  return async (c: Context<{ Variables: ContextVariables }>) => {
    const organizationId = c.get('organizationId');
    const body = c.req.valid('json' as never) as { name: string; color?: string };
    const result = await useCase.execute({
      organizationId,
      name: body.name,
      color: body.color,
    });
    return c.json(result, 201);
  };
}

export function assignTagController(useCase: AssignTagUseCase) {
  return async (c: Context<{ Variables: ContextVariables }>) => {
    const organizationId = c.get('organizationId');
    const customerId = c.req.param('id') ?? '';
    const body = c.req.valid('json' as never) as { tagId: string };
    await useCase.execute(organizationId, customerId, body.tagId);
    return c.body(null, 204);
  };
}

export function removeTagController(useCase: RemoveTagUseCase) {
  return async (c: Context<{ Variables: ContextVariables }>) => {
    const organizationId = c.get('organizationId');
    const customerId = c.req.param('id') ?? '';
    const tagId = c.req.param('tagId') ?? '';
    await useCase.execute(organizationId, customerId, tagId);
    return c.body(null, 204);
  };
}

export function listIdentificationTypesController(useCase: ListIdentificationTypesUseCase) {
  return async (c: Context<{ Variables: ContextVariables }>) => {
    const countryCode = c.get('countryCode') || 'EC';
    const result = await useCase.execute(countryCode);
    return c.json(result, 200);
  };
}
