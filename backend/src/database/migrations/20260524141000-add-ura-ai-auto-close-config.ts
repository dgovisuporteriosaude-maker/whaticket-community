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
  table: string,
  column: string,
  definition: string
) {
  const description = await queryInterface.describeTable(table) as Record<string, unknown>;
  if (!description[column]) {
    await queryInterface.sequelize.query(
      `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}, ALGORITHM=INSTANT`
    );
  }
}

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await addTicketColumnInstantIfMissing(queryInterface, "UraOptions", "aiAutoCloseEnabled", "BOOLEAN NOT NULL DEFAULT false");
    await addTicketColumnInstantIfMissing(queryInterface, "UraOptions", "aiAutoCloseMinutes", "INTEGER NULL");
    await addTicketColumnInstantIfMissing(queryInterface, "UraOptions", "aiAutoCloseMessage", "TEXT NULL");
    await addTicketColumnInstantIfMissing(queryInterface, "UraOptions", "aiAutoCloseReasonId", "INTEGER NULL");
    await addTicketColumnInstantIfMissing(queryInterface, "UraOptions", "aiAutoCloseOnlyIfNotHandedOff", "BOOLEAN NOT NULL DEFAULT true");

    await addTicketColumnInstantIfMissing(queryInterface, "Tickets", "aiAutoCloseEnabled", "BOOLEAN NOT NULL DEFAULT false");
    await addTicketColumnInstantIfMissing(queryInterface, "Tickets", "aiAutoCloseMinutes", "INTEGER NULL");
    await addTicketColumnInstantIfMissing(queryInterface, "Tickets", "aiAutoCloseMessage", "TEXT NULL");
    await addTicketColumnInstantIfMissing(queryInterface, "Tickets", "aiAutoCloseReasonId", "INTEGER NULL");
    await addTicketColumnInstantIfMissing(queryInterface, "Tickets", "aiAutoCloseOnlyIfNotHandedOff", "BOOLEAN NOT NULL DEFAULT true");
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Tickets", "aiAutoCloseOnlyIfNotHandedOff").catch(() => {});
    await queryInterface.removeColumn("Tickets", "aiAutoCloseReasonId").catch(() => {});
    await queryInterface.removeColumn("Tickets", "aiAutoCloseMessage").catch(() => {});
    await queryInterface.removeColumn("Tickets", "aiAutoCloseMinutes").catch(() => {});
    await queryInterface.removeColumn("Tickets", "aiAutoCloseEnabled").catch(() => {});
    await queryInterface.removeColumn("UraOptions", "aiAutoCloseOnlyIfNotHandedOff").catch(() => {});
    await queryInterface.removeColumn("UraOptions", "aiAutoCloseReasonId").catch(() => {});
    await queryInterface.removeColumn("UraOptions", "aiAutoCloseMessage").catch(() => {});
    await queryInterface.removeColumn("UraOptions", "aiAutoCloseMinutes").catch(() => {});
    await queryInterface.removeColumn("UraOptions", "aiAutoCloseEnabled").catch(() => {});
  }
};
