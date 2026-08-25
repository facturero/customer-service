/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const [existing] = await queryInterface.sequelize.query(
      `SELECT COUNT(*) as cnt FROM identification_types WHERE country_code = 'EC'`,
    );
    if (existing[0].cnt > 0) return;

    const now = new Date();
    await queryInterface.bulkInsert('identification_types', [
      {
        id: '3dde11e1-5526-4027-9874-977bbdf50d7e',
        country_code: 'EC',
        code: 'RUC',
        name: 'RUC',
        regex: '^\\d{13}$',
        created_at: now,
        updated_at: now,
      },
      {
        id: '96f27479-5099-40fb-9c77-67dcc0dea110',
        country_code: 'EC',
        code: 'CEDULA',
        name: 'Cédula',
        regex: '^\\d{10}$',
        created_at: now,
        updated_at: now,
      },
      {
        id: '0783f819-db8f-45e1-9cc6-f24b87a83f38',
        country_code: 'EC',
        code: 'PASAPORTE',
        name: 'Pasaporte',
        regex: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'a67e4638-1bff-4153-ba42-8b1c77ce582d',
        country_code: 'EC',
        code: 'CONSUMIDOR_FINAL',
        name: 'Consumidor final',
        regex: '^9{13}$',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'f1e2d3c4-b5a6-4789-8c0d-1e2f3a4b5c6d',
        country_code: 'EC',
        code: 'EXTERIOR',
        name: 'Identificación del exterior',
        regex: null,
        created_at: now,
        updated_at: now,
      },
    ], {});
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('identification_types', { country_code: 'EC' }, {});
  },
};
