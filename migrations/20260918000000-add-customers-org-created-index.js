/** @type {import('sequelize-cli').Migration} */
module.exports = {
  // El listado de clientes filtra por organization_id y ordena por
  // created_at DESC, id DESC. Sin este índice había filesort de todas las filas
  // del org en cada petición (agravado porque el listado no paginaba).
  async up(queryInterface) {
    await queryInterface.addIndex('customers', ['organization_id', 'created_at', 'id'], {
      name: 'customers_org_created',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('customers', 'customers_org_created');
  },
};
