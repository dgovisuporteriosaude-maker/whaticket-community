import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("AiSettings", "baseUrl", {
      type: DataTypes.TEXT,
      allowNull: true
    }).catch(() => {});
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("AiSettings", "baseUrl").catch(() => {});
  }
};
