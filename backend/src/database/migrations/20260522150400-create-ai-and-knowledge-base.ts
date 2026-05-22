import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("AiSettings", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false, defaultValue: "Principal" },
      provider: { type: DataTypes.STRING, allowNull: false, defaultValue: "openai" },
      model: { type: DataTypes.STRING, allowNull: false, defaultValue: "gpt-4o-mini" },
      apiKey: { type: DataTypes.TEXT, allowNull: true },
      systemPrompt: { type: DataTypes.TEXT, allowNull: true },
      temperature: { type: DataTypes.DECIMAL(3, 2), allowNull: false, defaultValue: 0.2 },
      maxTokens: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 800 },
      transferToHumanOnFailure: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    }).catch(() => {});

    await queryInterface.createTable("KnowledgeBaseArticles", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      title: { type: DataTypes.STRING, allowNull: false },
      content: { type: DataTypes.TEXT, allowNull: false },
      tags: { type: DataTypes.STRING, allowNull: true },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    }).catch(() => {});

    await queryInterface.addColumn("Queues", "useAI", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }).catch(() => {});

    await queryInterface.addColumn("Queues", "aiSettingId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "AiSettings", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    }).catch(() => {});
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Queues", "aiSettingId").catch(() => {});
    await queryInterface.removeColumn("Queues", "useAI").catch(() => {});
    await queryInterface.dropTable("KnowledgeBaseArticles").catch(() => {});
    await queryInterface.dropTable("AiSettings").catch(() => {});
  }
};
