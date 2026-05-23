import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Tickets", "uraFlowId", {
      type: DataTypes.INTEGER,
      allowNull: true
    }).catch(() => {});

    await queryInterface.addColumn("Tickets", "aiSettingId", {
      type: DataTypes.INTEGER,
      allowNull: true
    }).catch(() => {});
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Tickets", "aiSettingId").catch(() => {});
    await queryInterface.removeColumn("Tickets", "uraFlowId").catch(() => {});
  }
};
