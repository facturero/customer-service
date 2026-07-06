/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. customers
    await queryInterface.createTable('customers', {
      id: { type: Sequelize.CHAR(36), primaryKey: true },
      organization_id: { type: Sequelize.CHAR(36), allowNull: false },
      country_code: { type: Sequelize.STRING(2), allowNull: false },
      identification_type_id: { type: Sequelize.CHAR(36), allowNull: true },
      identification: { type: Sequelize.STRING(30), allowNull: true },
      business_name: { type: Sequelize.STRING(255), allowNull: false },
      trade_name: { type: Sequelize.STRING(255), allowNull: true },
      email: { type: Sequelize.STRING(255), allowNull: true },
      phone: { type: Sequelize.STRING(30), allowNull: true },
      type: { type: Sequelize.ENUM('person', 'company'), allowNull: false },
      status: { type: Sequelize.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
      metadata: { type: Sequelize.JSON, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('customers', ['organization_id', 'identification'], { unique: true });
    await queryInterface.addIndex('customers', ['organization_id', 'status']);

    // 2. contacts
    await queryInterface.createTable('contacts', {
      id: { type: Sequelize.CHAR(36), primaryKey: true },
      customer_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'customers', key: 'id' },
        onDelete: 'CASCADE',
      },
      name: { type: Sequelize.STRING(255), allowNull: false },
      email: { type: Sequelize.STRING(255), allowNull: true },
      phone: { type: Sequelize.STRING(30), allowNull: true },
      position: { type: Sequelize.STRING(100), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // 3. addresses
    await queryInterface.createTable('addresses', {
      id: { type: Sequelize.CHAR(36), primaryKey: true },
      customer_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'customers', key: 'id' },
        onDelete: 'CASCADE',
      },
      type: { type: Sequelize.ENUM('billing', 'shipping', 'other'), allowNull: false, defaultValue: 'other' },
      line1: { type: Sequelize.STRING(255), allowNull: false },
      line2: { type: Sequelize.STRING(255), allowNull: true },
      city: { type: Sequelize.STRING(100), allowNull: true },
      province: { type: Sequelize.STRING(100), allowNull: true },
      country_code: { type: Sequelize.STRING(2), allowNull: true },
      postal_code: { type: Sequelize.STRING(20), allowNull: true },
      is_primary: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // 4. tags
    await queryInterface.createTable('tags', {
      id: { type: Sequelize.CHAR(36), primaryKey: true },
      organization_id: { type: Sequelize.CHAR(36), allowNull: false },
      name: { type: Sequelize.STRING(100), allowNull: false },
      color: { type: Sequelize.STRING(20), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('tags', ['organization_id', 'name'], { unique: true });

    // 5. customer_tags
    await queryInterface.createTable('customer_tags', {
      customer_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'customers', key: 'id' },
        onDelete: 'CASCADE',
      },
      tag_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'tags', key: 'id' },
        onDelete: 'CASCADE',
      },
    });
    await queryInterface.addConstraint('customer_tags', {
      fields: ['customer_id', 'tag_id'],
      type: 'primary key',
      name: 'pk_customer_tags',
    });

    // 6. identification_types (read-model de tax)
    await queryInterface.createTable('identification_types', {
      id: { type: Sequelize.CHAR(36), primaryKey: true },
      country_code: { type: Sequelize.STRING(2), allowNull: false },
      code: { type: Sequelize.STRING(20), allowNull: false },
      name: { type: Sequelize.STRING(100), allowNull: true },
      regex: { type: Sequelize.STRING(255), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('identification_types', ['country_code', 'code'], { unique: true });

    // 7. outbox_messages
    await queryInterface.createTable('outbox_messages', {
      id: { type: Sequelize.CHAR(36), primaryKey: true },
      aggregate_type: { type: Sequelize.STRING(50), allowNull: false },
      aggregate_id: { type: Sequelize.CHAR(36), allowNull: false },
      type: { type: Sequelize.STRING(100), allowNull: false },
      payload: { type: Sequelize.JSON, allowNull: false },
      occurred_at: { type: Sequelize.DATE, allowNull: false },
      processed_at: { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('outbox_messages', ['processed_at']);

    // 8. processed_events
    await queryInterface.createTable('processed_events', {
      event_id: { type: Sequelize.CHAR(36), primaryKey: true },
      processed_at: { type: Sequelize.DATE, allowNull: false },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('processed_events');
    await queryInterface.dropTable('outbox_messages');
    await queryInterface.dropTable('identification_types');
    await queryInterface.dropTable('customer_tags');
    await queryInterface.dropTable('tags');
    await queryInterface.dropTable('addresses');
    await queryInterface.dropTable('contacts');
    await queryInterface.dropTable('customers');
  },
};
