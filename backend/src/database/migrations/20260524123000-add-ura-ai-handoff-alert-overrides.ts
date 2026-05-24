import { QueryInterface, DataTypes } from "sequelize";

const addColumnIfMissing = async (
  queryInterface: QueryInterface,
  table: string,
  column: string,
  definition: any
): Promise<void> => {
  const description = (await queryInterface.describeTable(table)) as Record<string, unknown>;
  if (!description[column]) {
    await queryInterface.addColumn(table, column, definition);
  }
};

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await addColumnIfMissing(queryInterface, "UraOptions", "aiHandoffAlertEnabled", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await addColumnIfMissing(queryInterface, "UraOptions", "aiHandoffAlertTo", {
      type: DataTypes.STRING,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "UraOptions", "aiHandoffAlertMessage", {
      type: DataTypes.TEXT,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, "Tickets", "aiHandoffAlertEnabled", {
      type: DataTypes.BOOLEAN,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "Tickets", "aiHandoffAlertTo", {
      type: DataTypes.STRING,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "Tickets", "aiHandoffAlertMessage", {
      type: DataTypes.TEXT,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.removeColumn("Tickets", "aiHandoffAlertMessage").catch(() => {});
    await queryInterface.removeColumn("Tickets", "aiHandoffAlertTo").catch(() => {});
    await queryInterface.removeColumn("Tickets", "aiHandoffAlertEnabled").catch(() => {});
    await queryInterface.removeColumn("UraOptions", "aiHandoffAlertMessage").catch(() => {});
    await queryInterface.removeColumn("UraOptions", "aiHandoffAlertTo").catch(() => {});
    await queryInterface.removeColumn("UraOptions", "aiHandoffAlertEnabled").catch(() => {});
  }
};
