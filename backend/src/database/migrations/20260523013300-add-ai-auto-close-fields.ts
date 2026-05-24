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
    await addColumnIfMissing(queryInterface, "AiSettings", "autoCloseEnabled", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await addColumnIfMissing(queryInterface, "AiSettings", "autoCloseMinutes", {
      type: DataTypes.INTEGER,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "AiSettings", "autoCloseMessage", {
      type: DataTypes.TEXT,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "AiSettings", "autoCloseReasonId", {
      type: DataTypes.INTEGER,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "AiSettings", "autoCloseOnlyIfNotHandedOff", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });
    await addColumnIfMissing(queryInterface, "Tickets", "aiAutoClosed", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await addColumnIfMissing(queryInterface, "Tickets", "aiAutoClosedAt", {
      type: DataTypes.DATE,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("AiSettings", "autoCloseEnabled").catch(() => {});
    await queryInterface.removeColumn("AiSettings", "autoCloseMinutes").catch(() => {});
    await queryInterface.removeColumn("AiSettings", "autoCloseMessage").catch(() => {});
    await queryInterface.removeColumn("AiSettings", "autoCloseReasonId").catch(() => {});
    await queryInterface.removeColumn("AiSettings", "autoCloseOnlyIfNotHandedOff").catch(() => {});
    await queryInterface.removeColumn("Tickets", "aiAutoClosed").catch(() => {});
    await queryInterface.removeColumn("Tickets", "aiAutoClosedAt").catch(() => {});
  }
};
