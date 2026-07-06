import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from './sequelize';

export class CustomerModel extends Model<
  InferAttributes<CustomerModel>,
  InferCreationAttributes<CustomerModel>
> {
  declare id: string;
  declare organization_id: string;
  declare country_code: string;
  declare identification_type_id: string | null;
  declare identification: string | null;
  declare business_name: string;
  declare trade_name: string | null;
  declare email: string | null;
  declare phone: string | null;
  declare type: 'person' | 'company';
  declare status: 'active' | 'inactive';
  declare metadata: unknown | null;
  declare created_at: Date;
  declare updated_at: Date;
}

CustomerModel.init(
  {
    id: { type: DataTypes.CHAR(36), primaryKey: true },
    organization_id: { type: DataTypes.CHAR(36), allowNull: false },
    country_code: { type: DataTypes.STRING(2), allowNull: false },
    identification_type_id: { type: DataTypes.CHAR(36), allowNull: true },
    identification: { type: DataTypes.STRING(30), allowNull: true },
    business_name: { type: DataTypes.STRING(255), allowNull: false },
    trade_name: { type: DataTypes.STRING(255), allowNull: true },
    email: { type: DataTypes.STRING(255), allowNull: true },
    phone: { type: DataTypes.STRING(30), allowNull: true },
    type: { type: DataTypes.ENUM('person', 'company'), allowNull: false },
    status: { type: DataTypes.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
    metadata: { type: DataTypes.JSON, allowNull: true },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  { sequelize, tableName: 'customers', timestamps: false },
);

export class ContactModel extends Model<
  InferAttributes<ContactModel>,
  InferCreationAttributes<ContactModel>
> {
  declare id: string;
  declare customer_id: string;
  declare name: string;
  declare email: string | null;
  declare phone: string | null;
  declare position: string | null;
  declare created_at: Date;
  declare updated_at: Date;
}

ContactModel.init(
  {
    id: { type: DataTypes.CHAR(36), primaryKey: true },
    customer_id: { type: DataTypes.CHAR(36), allowNull: false },
    name: { type: DataTypes.STRING(255), allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: true },
    phone: { type: DataTypes.STRING(30), allowNull: true },
    position: { type: DataTypes.STRING(100), allowNull: true },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  { sequelize, tableName: 'contacts', timestamps: false },
);

export class AddressModel extends Model<
  InferAttributes<AddressModel>,
  InferCreationAttributes<AddressModel>
> {
  declare id: string;
  declare customer_id: string;
  declare type: 'billing' | 'shipping' | 'other';
  declare line1: string;
  declare line2: string | null;
  declare city: string | null;
  declare province: string | null;
  declare country_code: string | null;
  declare postal_code: string | null;
  declare is_primary: boolean;
  declare created_at: Date;
  declare updated_at: Date;
}

AddressModel.init(
  {
    id: { type: DataTypes.CHAR(36), primaryKey: true },
    customer_id: { type: DataTypes.CHAR(36), allowNull: false },
    type: { type: DataTypes.ENUM('billing', 'shipping', 'other'), allowNull: false, defaultValue: 'other' },
    line1: { type: DataTypes.STRING(255), allowNull: false },
    line2: { type: DataTypes.STRING(255), allowNull: true },
    city: { type: DataTypes.STRING(100), allowNull: true },
    province: { type: DataTypes.STRING(100), allowNull: true },
    country_code: { type: DataTypes.STRING(2), allowNull: true },
    postal_code: { type: DataTypes.STRING(20), allowNull: true },
    is_primary: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  { sequelize, tableName: 'addresses', timestamps: false },
);

export class TagModel extends Model<
  InferAttributes<TagModel>,
  InferCreationAttributes<TagModel>
> {
  declare id: string;
  declare organization_id: string;
  declare name: string;
  declare color: string | null;
  declare created_at: Date;
  declare updated_at: Date;
}

TagModel.init(
  {
    id: { type: DataTypes.CHAR(36), primaryKey: true },
    organization_id: { type: DataTypes.CHAR(36), allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    color: { type: DataTypes.STRING(20), allowNull: true },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  { sequelize, tableName: 'tags', timestamps: false },
);

export class CustomerTagModel extends Model<
  InferAttributes<CustomerTagModel>,
  InferCreationAttributes<CustomerTagModel>
> {
  declare customer_id: string;
  declare tag_id: string;
}

CustomerTagModel.init(
  {
    customer_id: { type: DataTypes.CHAR(36), allowNull: false },
    tag_id: { type: DataTypes.CHAR(36), allowNull: false },
  },
  { sequelize, tableName: 'customer_tags', timestamps: false },
);

export class IdentificationTypeModel extends Model<
  InferAttributes<IdentificationTypeModel>,
  InferCreationAttributes<IdentificationTypeModel>
> {
  declare id: string;
  declare country_code: string;
  declare code: string;
  declare name: string | null;
  declare regex: string | null;
  declare created_at: Date;
  declare updated_at: Date;
}

IdentificationTypeModel.init(
  {
    id: { type: DataTypes.CHAR(36), primaryKey: true },
    country_code: { type: DataTypes.STRING(2), allowNull: false },
    code: { type: DataTypes.STRING(20), allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: true },
    regex: { type: DataTypes.STRING(255), allowNull: true },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  { sequelize, tableName: 'identification_types', timestamps: false },
);

export class OutboxModel extends Model<
  InferAttributes<OutboxModel>,
  InferCreationAttributes<OutboxModel>
> {
  declare id: string;
  declare aggregate_type: string;
  declare aggregate_id: string;
  declare type: string;
  declare payload: unknown;
  declare occurred_at: Date;
  declare processed_at: Date | null;
}

OutboxModel.init(
  {
    id: { type: DataTypes.CHAR(36), primaryKey: true },
    aggregate_type: { type: DataTypes.STRING(50), allowNull: false },
    aggregate_id: { type: DataTypes.CHAR(36), allowNull: false },
    type: { type: DataTypes.STRING(100), allowNull: false },
    payload: { type: DataTypes.JSON, allowNull: false },
    occurred_at: { type: DataTypes.DATE, allowNull: false },
    processed_at: { type: DataTypes.DATE, allowNull: true },
  },
  { sequelize, tableName: 'outbox_messages', timestamps: false },
);

export class ProcessedEventModel extends Model<
  InferAttributes<ProcessedEventModel>,
  InferCreationAttributes<ProcessedEventModel>
> {
  declare event_id: string;
  declare processed_at: Date;
}

ProcessedEventModel.init(
  {
    event_id: { type: DataTypes.CHAR(36), primaryKey: true },
    processed_at: { type: DataTypes.DATE, allowNull: false },
  },
  { sequelize, tableName: 'processed_events', timestamps: false },
);

// Asociaciones
CustomerModel.hasMany(ContactModel, { foreignKey: 'customer_id', as: 'contacts' });
ContactModel.belongsTo(CustomerModel, { foreignKey: 'customer_id' });

CustomerModel.hasMany(AddressModel, { foreignKey: 'customer_id', as: 'addresses' });
AddressModel.belongsTo(CustomerModel, { foreignKey: 'customer_id' });

CustomerModel.belongsToMany(TagModel, {
  through: CustomerTagModel,
  foreignKey: 'customer_id',
  otherKey: 'tag_id',
  as: 'tags',
});
TagModel.belongsToMany(CustomerModel, {
  through: CustomerTagModel,
  foreignKey: 'tag_id',
  otherKey: 'customer_id',
});
