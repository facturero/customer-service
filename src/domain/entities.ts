import { randomUUID } from 'node:crypto';

export type CustomerType = 'person' | 'company';
export type CustomerStatus = 'active' | 'inactive';
export type AddressType = 'billing' | 'shipping' | 'other';

export interface CustomerProps {
  id: string;
  organizationId: string;
  countryCode: string;
  identificationTypeId: string | null;
  identification: string | null;
  businessName: string;
  tradeName: string | null;
  email: string | null;
  phone: string | null;
  type: CustomerType;
  status: CustomerStatus;
  isSystem: boolean;
  imageFileId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Customer {
  private constructor(private props: CustomerProps) {}

  static create(params: {
    organizationId: string;
    countryCode: string;
    identificationTypeId?: string | null;
    identification?: string | null;
    businessName: string;
    tradeName?: string | null;
    email?: string | null;
    phone?: string | null;
    type: CustomerType;
    isSystem?: boolean;
    imageFileId?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Customer {
    const now = new Date();
    return new Customer({
      id: randomUUID(),
      organizationId: params.organizationId,
      countryCode: params.countryCode,
      identificationTypeId: params.identificationTypeId ?? null,
      identification: params.identification ?? null,
      businessName: params.businessName,
      tradeName: params.tradeName ?? null,
      email: params.email ?? null,
      phone: params.phone ?? null,
      type: params.type,
      status: 'active',
      isSystem: params.isSystem ?? false,
      imageFileId: params.imageFileId ?? null,
      metadata: params.metadata ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(props: CustomerProps): Customer {
    return new Customer({ ...props });
  }

  get id(): string { return this.props.id; }
  get organizationId(): string { return this.props.organizationId; }
  get countryCode(): string { return this.props.countryCode; }
  get identificationTypeId(): string | null { return this.props.identificationTypeId; }
  get identification(): string | null { return this.props.identification; }
  get businessName(): string { return this.props.businessName; }
  get tradeName(): string | null { return this.props.tradeName; }
  get email(): string | null { return this.props.email; }
  get phone(): string | null { return this.props.phone; }
  get type(): CustomerType { return this.props.type; }
  get status(): CustomerStatus { return this.props.status; }
  get isSystem(): boolean { return this.props.isSystem; }
  get imageFileId(): string | null { return this.props.imageFileId; }
  get metadata(): Record<string, unknown> | null { return this.props.metadata; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  canBeDisabled(): boolean {
    return !this.props.isSystem;
  }

  belongsToOrganization(organizationId: string): boolean {
    return this.props.organizationId === organizationId;
  }

  update(params: {
    businessName?: string;
    tradeName?: string | null;
    identificationTypeId?: string | null;
    identification?: string | null;
    email?: string | null;
    phone?: string | null;
    imageFileId?: string | null;
    metadata?: Record<string, unknown> | null;
  }): void {
    if (params.businessName !== undefined) this.props.businessName = params.businessName;
    if (params.tradeName !== undefined) this.props.tradeName = params.tradeName;
    if (params.identificationTypeId !== undefined) this.props.identificationTypeId = params.identificationTypeId;
    if (params.identification !== undefined) this.props.identification = params.identification;
    if (params.email !== undefined) this.props.email = params.email;
    if (params.phone !== undefined) this.props.phone = params.phone;
    if (params.imageFileId !== undefined) this.props.imageFileId = params.imageFileId;
    if (params.metadata !== undefined) this.props.metadata = params.metadata;
    this.props.updatedAt = new Date();
  }

  disable(): void {
    this.props.status = 'inactive';
    this.props.updatedAt = new Date();
  }

  toPersistence(): CustomerProps {
    return { ...this.props };
  }
}

export interface ContactProps {
  id: string;
  customerId: string;
  name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Contact {
  private constructor(private props: ContactProps) {}

  static create(params: {
    customerId: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    position?: string | null;
  }): Contact {
    const now = new Date();
    return new Contact({
      id: randomUUID(),
      customerId: params.customerId,
      name: params.name,
      email: params.email ?? null,
      phone: params.phone ?? null,
      position: params.position ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(props: ContactProps): Contact {
    return new Contact({ ...props });
  }

  get id(): string { return this.props.id; }
  get customerId(): string { return this.props.customerId; }
  get name(): string { return this.props.name; }
  get email(): string | null { return this.props.email; }
  get phone(): string | null { return this.props.phone; }
  get position(): string | null { return this.props.position; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  update(params: { name?: string; email?: string | null; phone?: string | null; position?: string | null }): void {
    if (params.name !== undefined) this.props.name = params.name;
    if (params.email !== undefined) this.props.email = params.email;
    if (params.phone !== undefined) this.props.phone = params.phone;
    if (params.position !== undefined) this.props.position = params.position;
    this.props.updatedAt = new Date();
  }

  toPersistence(): ContactProps {
    return { ...this.props };
  }
}

export interface AddressProps {
  id: string;
  customerId: string;
  type: AddressType;
  line1: string;
  line2: string | null;
  city: string | null;
  province: string | null;
  countryCode: string | null;
  postalCode: string | null;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Address {
  private constructor(private props: AddressProps) {}

  static create(params: {
    customerId: string;
    type?: AddressType;
    line1: string;
    line2?: string | null;
    city?: string | null;
    province?: string | null;
    countryCode?: string | null;
    postalCode?: string | null;
    isPrimary?: boolean;
  }): Address {
    const now = new Date();
    return new Address({
      id: randomUUID(),
      customerId: params.customerId,
      type: params.type ?? 'other',
      line1: params.line1,
      line2: params.line2 ?? null,
      city: params.city ?? null,
      province: params.province ?? null,
      countryCode: params.countryCode ?? null,
      postalCode: params.postalCode ?? null,
      isPrimary: params.isPrimary ?? false,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(props: AddressProps): Address {
    return new Address({ ...props });
  }

  get id(): string { return this.props.id; }
  get customerId(): string { return this.props.customerId; }
  get type(): AddressType { return this.props.type; }
  get line1(): string { return this.props.line1; }
  get line2(): string | null { return this.props.line2; }
  get city(): string | null { return this.props.city; }
  get province(): string | null { return this.props.province; }
  get countryCode(): string | null { return this.props.countryCode; }
  get postalCode(): string | null { return this.props.postalCode; }
  get isPrimary(): boolean { return this.props.isPrimary; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  update(params: {
    type?: AddressType;
    line1?: string;
    line2?: string | null;
    city?: string | null;
    province?: string | null;
    countryCode?: string | null;
    postalCode?: string | null;
    isPrimary?: boolean;
  }): void {
    if (params.type !== undefined) this.props.type = params.type;
    if (params.line1 !== undefined) this.props.line1 = params.line1;
    if (params.line2 !== undefined) this.props.line2 = params.line2;
    if (params.city !== undefined) this.props.city = params.city;
    if (params.province !== undefined) this.props.province = params.province;
    if (params.countryCode !== undefined) this.props.countryCode = params.countryCode;
    if (params.postalCode !== undefined) this.props.postalCode = params.postalCode;
    if (params.isPrimary !== undefined) this.props.isPrimary = params.isPrimary;
    this.props.updatedAt = new Date();
  }

  toPersistence(): AddressProps {
    return { ...this.props };
  }
}

export interface TagProps {
  id: string;
  organizationId: string;
  name: string;
  color: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Tag {
  private constructor(private props: TagProps) {}

  static create(params: {
    organizationId: string;
    name: string;
    color?: string | null;
  }): Tag {
    const now = new Date();
    return new Tag({
      id: randomUUID(),
      organizationId: params.organizationId,
      name: params.name,
      color: params.color ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(props: TagProps): Tag {
    return new Tag({ ...props });
  }

  get id(): string { return this.props.id; }
  get organizationId(): string { return this.props.organizationId; }
  get name(): string { return this.props.name; }
  get color(): string | null { return this.props.color; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  belongsToOrganization(organizationId: string): boolean {
    return this.props.organizationId === organizationId;
  }

  toPersistence(): TagProps {
    return { ...this.props };
  }
}

export interface IdentificationTypeProps {
  id: string;
  countryCode: string;
  code: string;
  name: string | null;
  regex: string | null;
}

export class IdentificationType {
  private constructor(private props: IdentificationTypeProps) {}

  static fromPersistence(props: IdentificationTypeProps): IdentificationType {
    return new IdentificationType({ ...props });
  }

  get id(): string { return this.props.id; }
  get countryCode(): string { return this.props.countryCode; }
  get code(): string { return this.props.code; }
  get name(): string | null { return this.props.name; }
  get regex(): string | null { return this.props.regex; }

  matches(countryCode: string): boolean {
    return this.props.countryCode === countryCode;
  }

  toPersistence(): IdentificationTypeProps {
    return { ...this.props };
  }
}
