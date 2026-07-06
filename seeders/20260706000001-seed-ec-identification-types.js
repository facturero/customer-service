/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    await queryInterface.bulkInsert('identification_types', [
      {
        id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
        country_code: 'EC',
        code: 'RUC',
        name: 'RUC',
        regex: '^\\d{13}$',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
        country_code: 'EC',
        code: 'CEDULA',
        name: 'Cédula',
        regex: '^\\d{10}$',
        created_at: now,
        updated_at: now,
      },
    ], {});
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('identification_types', { country_code: 'EC' }, {});
  },
};
