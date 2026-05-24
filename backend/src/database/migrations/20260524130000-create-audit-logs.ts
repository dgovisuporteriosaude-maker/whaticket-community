import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("AuditLogs", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      userName: { type: DataTypes.STRING, allowNull: true },
      userProfile: { type: DataTypes.STRING, allowNull: true },
      action: { type: DataTypes.STRING, allowNull: false },
      resource: { type: DataTypes.STRING, allowNull: false },
      resourceId: { type: DataTypes.STRING, allowNull: true },
      method: { type: DataTypes.STRING, allowNull: true },
      route: { type: DataTypes.STRING, allowNull: true },
      ip: { type: DataTypes.STRING, allowNull: true },
      beforeData: { type: DataTypes.TEXT, allowNull: true },
      afterData: { type: DataTypes.TEXT, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("AuditLogs");
  }
};
