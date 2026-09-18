export interface CustomerDTO {
  id: string;
  organizationId: string;
  countryCode: string;
  identificationTypeId: string | null;
  identification: string | null;
  businessName: string;
  tradeName: string | null;
  email: string | null;
  phone: string | null;
  type: 'person' | 'company';
  status: 'active' | 'inactive';
  isSystem: boolean;
  imageFileId: string | null;
  metadata: Record<string, unknown> | null;
}

export interface CustomerDetailDTO extends CustomerDTO {
  /**
   * Código del tipo de identificación (`RUC`, `CEDULA`, `PASAPORTE`...). Los ids
   * de este catálogo NO coinciden con los de tax-service (cada servicio sembró el
   * suyo), así que otros servicios tienen que usar el código, no el id: con el
   * id, fiscal-ecuador no encontraba el tipo y declaraba un pasaporte de 10
   * dígitos como cédula.
   */
  identificationTypeCode: string | null;
  contacts: ContactDTO[];
  addresses: AddressDTO[];
  tags: TagDTO[];
}

export interface ContactDTO {
  id: string;
  customerId: string;
  name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
}

export interface AddressDTO {
  id: string;
  customerId: string;
  type: 'billing' | 'shipping' | 'other';
  line1: string;
  line2: string | null;
  city: string | null;
  province: string | null;
  countryCode: string | null;
  postalCode: string | null;
  isPrimary: boolean;
}

export interface TagDTO {
  id: string;
  organizationId: string;
  name: string;
  color: string | null;
}

export interface IdentificationTypeDTO {
  id: string;
  countryCode: string;
  code: string;
  name: string | null;
  regex: string | null;
}

export interface CreateCustomerInput {
  organizationId: string;
  userId: string;
  countryCode: string;
  businessName: string;
  tradeName?: string | null;
  type: 'person' | 'company';
  identificationTypeId?: string | null;
  identification?: string | null;
  email?: string | null;
  phone?: string | null;
  imageFileId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface UpdateCustomerInput {
  organizationId: string;
  id: string;
  businessName?: string;
  tradeName?: string | null;
  identificationTypeId?: string | null;
  identification?: string | null;
  email?: string | null;
  phone?: string | null;
  imageFileId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface AddContactInput {
  organizationId: string;
  customerId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  position?: string | null;
}

export interface UpdateContactInput {
  organizationId: string;
  id: string;
  name?: string;
  email?: string | null;
  phone?: string | null;
  position?: string | null;
}

export interface DeleteContactInput {
  organizationId: string;
  id: string;
}

export interface AddAddressInput {
  organizationId: string;
  customerId: string;
  type?: 'billing' | 'shipping' | 'other';
  line1: string;
  line2?: string | null;
  city?: string | null;
  province?: string | null;
  countryCode?: string | null;
  postalCode?: string | null;
  isPrimary?: boolean;
}

export interface UpdateAddressInput {
  organizationId: string;
  id: string;
  type?: 'billing' | 'shipping' | 'other';
  line1?: string;
  line2?: string | null;
  city?: string | null;
  province?: string | null;
  countryCode?: string | null;
  postalCode?: string | null;
  isPrimary?: boolean;
}

export interface DeleteAddressInput {
  organizationId: string;
  id: string;
}

export interface ListCustomersInput {
  organizationId: string;
  search?: string;
  status?: string;
  tagId?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateTagInput {
  organizationId: string;
  name: string;
  color?: string | null;
}

export interface AssignTagInput {
  organizationId: string;
  customerId: string;
  tagId: string;
}

export interface RemoveTagInput {
  organizationId: string;
  customerId: string;
  tagId: string;
}

export function toCustomerDTO(customer: CustomerDTO): CustomerDTO {
  return { ...customer };
}

export function toContactDTO(contact: ContactDTO): ContactDTO {
  return { ...contact };
}

export function toAddressDTO(address: AddressDTO): AddressDTO {
  return { ...address };
}

export function toTagDTO(tag: TagDTO): TagDTO {
  return { ...tag };
}
