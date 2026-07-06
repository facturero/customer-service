export interface ErrorDetail {
  field: string;
  message: string;
}

export abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;
  readonly details?: ErrorDetail[];

  constructor(message: string, details?: ErrorDetail[]) {
    super(message);
    this.name = new.target.name;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  readonly code = 'VALIDATION_ERROR';
  readonly httpStatus = 422;
  constructor(details: ErrorDetail[], message = 'La petición no es válida.') {
    super(message, details);
  }
}

export class OrganizationContextRequiredError extends AppError {
  readonly code = 'ORG_CONTEXT_REQUIRED';
  readonly httpStatus = 401;
  constructor(message = 'Falta el contexto de organización.') { super(message); }
}

export class UserContextRequiredError extends AppError {
  readonly code = 'USER_CONTEXT_REQUIRED';
  readonly httpStatus = 401;
  constructor(message = 'Falta el contexto de usuario.') { super(message); }
}

export class ForbiddenError extends AppError {
  readonly code = 'FORBIDDEN';
  readonly httpStatus = 403;
  constructor(message = 'Permiso insuficiente.') { super(message); }
}

export class CustomerNotFoundError extends AppError {
  readonly code = 'CUSTOMER_NOT_FOUND';
  readonly httpStatus = 404;
  constructor(message = 'Cliente no encontrado.') { super(message); }
}

export class ContactNotFoundError extends AppError {
  readonly code = 'CONTACT_NOT_FOUND';
  readonly httpStatus = 404;
  constructor(message = 'Contacto no encontrado.') { super(message); }
}

export class AddressNotFoundError extends AppError {
  readonly code = 'ADDRESS_NOT_FOUND';
  readonly httpStatus = 404;
  constructor(message = 'Dirección no encontrada.') { super(message); }
}

export class TagNotFoundError extends AppError {
  readonly code = 'TAG_NOT_FOUND';
  readonly httpStatus = 404;
  constructor(message = 'Etiqueta no encontrada.') { super(message); }
}

export class IdentificationTypeNotFoundError extends AppError {
  readonly code = 'IDENTIFICATION_TYPE_NOT_FOUND';
  readonly httpStatus = 422;
  constructor(message = 'El tipo de identificación no existe para el país.') { super(message); }
}

export class InvalidIdentificationError extends AppError {
  readonly code = 'INVALID_IDENTIFICATION';
  readonly httpStatus = 422;
  constructor(message = 'La identificación no cumple el formato del tipo.') { super(message); }
}

export class CustomerAlreadyExistsError extends AppError {
  readonly code = 'CUSTOMER_EXISTS';
  readonly httpStatus = 409;
  constructor(message = 'Ya existe un cliente con esa identificación.') { super(message); }
}

export class TagAlreadyExistsError extends AppError {
  readonly code = 'TAG_EXISTS';
  readonly httpStatus = 409;
  constructor(message = 'Ya existe una etiqueta con ese nombre.') { super(message); }
}
