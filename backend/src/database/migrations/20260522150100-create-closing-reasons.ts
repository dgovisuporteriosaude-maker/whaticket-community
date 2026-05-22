import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("ClosingReasons", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      farewellMessage: { type: DataTypes.TEXT, allowNull: true },
      sendFarewellMessage: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    }).catch(() => {});
    await queryInterface.addColumn("Tickets", "closingReasonId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "ClosingReasons", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    }).catch(() => {});
    await queryInterface.addColumn("Tickets", "closingNote", {
      type: DataTypes.TEXT,
      allowNull: true
    }).catch(() => {});
  },
  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Tickets", "closingReasonId").catch(() => {});
    await queryInterface.removeColumn("Tickets", "closingNote").catch(() => {});
    await queryInterface.dropTable("ClosingReasons").catch(() => {});
  }
};
