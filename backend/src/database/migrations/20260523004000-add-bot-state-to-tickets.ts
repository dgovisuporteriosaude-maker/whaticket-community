import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Tickets", "uraFlowId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "UraFlows", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    }).catch(() => {});

    await queryInterface.addColumn("Tickets", "uraMenuSentAt", {
      type: DataTypes.DATE,
      allowNull: true
    }).catch(() => {});

    await queryInterface.addColumn("Tickets", "aiActive", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }).catch(() => {});

    await queryInterface.addColumn("Tickets", "aiSettingId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "AiSettings", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    }).catch(() => {});
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Tickets", "aiSettingId").catch(() => {});
    await queryInterface.removeColumn("Tickets", "aiActive").catch(() => {});
    await queryInterface.removeColumn("Tickets", "uraMenuSentAt").catch(() => {});
    await queryInterface.removeColumn("Tickets", "uraFlowId").catch(() => {});
  }
};
