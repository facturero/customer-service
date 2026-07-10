/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('customers', 'image_file_id', {
      type: Sequelize.CHAR(36),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('customers', 'image_file_id');
  },
};
