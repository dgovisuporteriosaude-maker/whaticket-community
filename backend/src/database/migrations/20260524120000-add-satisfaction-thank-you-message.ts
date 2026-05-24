import { QueryInterface, DataTypes } from "sequelize";

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    const description = (await queryInterface.describeTable("SatisfactionSurveys")) as Record<string, unknown>;
    if (!description.thankYouMessage) {
      await queryInterface.addColumn("SatisfactionSurveys", "thankYouMessage", {
        type: DataTypes.TEXT,
        allowNull: true
      });
    }
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.removeColumn("SatisfactionSurveys", "thankYouMessage").catch(() => {});
  }
};
