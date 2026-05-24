import { QueryInterface, DataTypes } from "sequelize";

async function addColumnIfMissing(
  queryInterface: QueryInterface,
  table: string,
  column: string,
  definition: any
) {
  const description = await queryInterface.describeTable(table) as Record<string, unknown>;
  if (!description[column]) {
    await queryInterface.addColumn(table, column, definition);
  }
}

async function addTicketColumnInstantIfMissing(
  queryInterface: QueryInterface,
  column: string,
  definition: string
) {
  const description = await queryInterface.describeTable("Tickets") as Record<string, unknown>;
  if (!description[column]) {
    await queryInterface.sequelize.query(
      `ALTER TABLE Tickets ADD COLUMN ${column} ${definition}, ALGORITHM=INSTANT`
    );
  }
}

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await addColumnIfMissing(queryInterface, "UraOptions", "aiHumanHandoffEnabled", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await addColumnIfMissing(queryInterface, "UraOptions", "aiHumanHandoffQueueId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "Queues", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    });
    await addColumnIfMissing(queryInterface, "UraOptions", "aiHumanHandoffMessage", {
      type: DataTypes.TEXT,
      allowNull: true
    });
    await addTicketColumnInstantIfMissing(queryInterface, "aiHumanHandoffQueueId", "INTEGER NULL");
    await addTicketColumnInstantIfMissing(queryInterface, "aiHumanHandoffMessage", "TEXT NULL");
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Tickets", "aiHumanHandoffMessage").catch(() => {});
    await queryInterface.removeColumn("Tickets", "aiHumanHandoffQueueId").catch(() => {});
    await queryInterface.removeColumn("UraOptions", "aiHumanHandoffMessage").catch(() => {});
    await queryInterface.removeColumn("UraOptions", "aiHumanHandoffQueueId").catch(() => {});
    await queryInterface.removeColumn("UraOptions", "aiHumanHandoffEnabled").catch(() => {});
  }
};
