import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("TicketCategories", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    }).catch(() => {});
    await queryInterface.addColumn("Tickets", "categoryId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "TicketCategories", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    }).catch(() => {});
  },
  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Tickets", "categoryId").catch(() => {});
    await queryInterface.dropTable("TicketCategories").catch(() => {});
  }
};
