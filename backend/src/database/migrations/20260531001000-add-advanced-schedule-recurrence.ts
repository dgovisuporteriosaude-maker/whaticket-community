import { QueryInterface, DataTypes } from "sequelize";

const addColumnIfMissing = async (
  queryInterface: QueryInterface,
  table: string,
  column: string,
  definition: any
) => {
  const description = (await queryInterface.describeTable(table)) as Record<string, unknown>;
  if (!description[column]) {
    await queryInterface.addColumn(table, column, definition);
  }
};

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await addColumnIfMissing(queryInterface, "ScheduledMessages", "repeatEvery", {
      type: DataTypes.INTEGER,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "ScheduledMessages", "repeatUnit", {
      type: DataTypes.STRING,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "ScheduledMessages", "maxRuns", {
      type: DataTypes.INTEGER,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "ScheduledMessages", "runCount", {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
    await addColumnIfMissing(queryInterface, "ScheduledMessages", "respectBusinessHours", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await addColumnIfMissing(queryInterface, "ScheduledMessages", "missedRunPolicy", {
      type: DataTypes.STRING,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("ScheduledMessages", "missedRunPolicy").catch(() => {});
    await queryInterface.removeColumn("ScheduledMessages", "respectBusinessHours").catch(() => {});
    await queryInterface.removeColumn("ScheduledMessages", "runCount").catch(() => {});
    await queryInterface.removeColumn("ScheduledMessages", "maxRuns").catch(() => {});
    await queryInterface.removeColumn("ScheduledMessages", "repeatUnit").catch(() => {});
    await queryInterface.removeColumn("ScheduledMessages", "repeatEvery").catch(() => {});
  }
};
