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
    await addColumnIfMissing(queryInterface, "Tags", "fixed", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    await addColumnIfMissing(queryInterface, "ContactTags", "appliedAt", {
      type: DataTypes.DATE,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, "Tickets", "aiHumanHandoffAlertSent", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    await addColumnIfMissing(queryInterface, "AiSettings", "humanHandoffEnabled", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await addColumnIfMissing(queryInterface, "AiSettings", "humanHandoffQueueId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "Queues", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    });
    await addColumnIfMissing(queryInterface, "AiSettings", "humanHandoffMessage", {
      type: DataTypes.TEXT,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "AiSettings", "humanHandoffAlertEnabled", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await addColumnIfMissing(queryInterface, "AiSettings", "humanHandoffAlertTo", {
      type: DataTypes.STRING,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "AiSettings", "humanHandoffAlertMessage", {
      type: DataTypes.TEXT,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Tags", "fixed").catch(() => {});
    await queryInterface.removeColumn("ContactTags", "appliedAt").catch(() => {});
    await queryInterface.removeColumn("Tickets", "aiHumanHandoffAlertSent").catch(() => {});
    await queryInterface.removeColumn("AiSettings", "humanHandoffEnabled").catch(() => {});
    await queryInterface.removeColumn("AiSettings", "humanHandoffQueueId").catch(() => {});
    await queryInterface.removeColumn("AiSettings", "humanHandoffMessage").catch(() => {});
    await queryInterface.removeColumn("AiSettings", "humanHandoffAlertEnabled").catch(() => {});
    await queryInterface.removeColumn("AiSettings", "humanHandoffAlertTo").catch(() => {});
    await queryInterface.removeColumn("AiSettings", "humanHandoffAlertMessage").catch(() => {});
  }
};
