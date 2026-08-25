const { randomUUID } = require('node:crypto');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();

    let orgs;
    try {
      const [result] = await queryInterface.sequelize.query(
        `SELECT id, country_code FROM organization_db.organizations`,
      );
      orgs = result;
    } catch {
      orgs = [];
    }

    for (const org of orgs) {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT id FROM customers WHERE organization_id = ? AND is_system = TRUE LIMIT 1`,
        { replacements: [org.id] },
      );
      if (existing.length > 0) continue;

      const countryCode = org.country_code || 'EC';
      const [idTypes] = await queryInterface.sequelize.query(
        `SELECT id FROM identification_types WHERE country_code = ? AND code = 'CONSUMIDOR_FINAL' LIMIT 1`,
        { replacements: [countryCode] },
      );
      const idTypeId = idTypes.length > 0 ? idTypes[0].id : null;

      await queryInterface.bulkInsert('customers', [{
        id: randomUUID(),
        organization_id: org.id,
        country_code: countryCode,
        identification_type_id: idTypeId,
        identification: '9999999999999',
        business_name: 'CONSUMIDOR FINAL',
        trade_name: null,
        email: null,
        phone: null,
        type: 'person',
        status: 'active',
        is_system: true,
        image_file_id: null,
        metadata: null,
        created_at: now,
        updated_at: now,
      }]);
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('customers', { is_system: true });
  },
};
