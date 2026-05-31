import { QueryInterface, DataTypes } from "sequelize";

const addColumnIfMissing = async (
  queryInterface: QueryInterface,
  tableName: string,
  columnName: string,
  definition: any
) => {
  const table = (await queryInterface.describeTable(tableName)) as Record<
    string,
    unknown
  >;
  if (!table[columnName]) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
};

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await addColumnIfMissing(queryInterface, "Queues", "businessHoursMode", {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "always"
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Queues", "businessHoursMode").catch(() => {});
  }
};
