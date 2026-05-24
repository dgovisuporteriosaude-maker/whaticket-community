import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("AiTaggerHistories", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      contactId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "Contacts", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE" },
      ticketId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "Tickets", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE" },
      appliedTagId: { type: DataTypes.INTEGER, allowNull: true, references: { model: "Tags", key: "id" }, onUpdate: "CASCADE", onDelete: "SET NULL" },
      removedTagId: { type: DataTypes.INTEGER, allowNull: true, references: { model: "Tags", key: "id" }, onUpdate: "CASCADE", onDelete: "SET NULL" },
      classifiedAt: { type: DataTypes.DATE, allowNull: false },
      source: { type: DataTypes.STRING, allowNull: false, defaultValue: "IA" },
      configName: { type: DataTypes.STRING, allowNull: true },
      summary: { type: DataTypes.TEXT, allowNull: true },
      errorMessage: { type: DataTypes.TEXT, allowNull: true },
      noTagApplied: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    }).catch(() => {});
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("AiTaggerHistories").catch(() => {});
  }
};
