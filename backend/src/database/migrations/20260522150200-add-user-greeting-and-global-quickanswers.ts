import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Users", "attendanceGreeting", {
      type: DataTypes.TEXT,
      allowNull: true
    }).catch(() => {});
    await queryInterface.addColumn("QuickAnswers", "global", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }).catch(() => {});
  },
  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Users", "attendanceGreeting").catch(() => {});
    await queryInterface.removeColumn("QuickAnswers", "global").catch(() => {});
  }
};
