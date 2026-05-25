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
    await addColumnIfMissing(queryInterface, "Tickets", "lastAiMessage", {
      type: DataTypes.TEXT,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, "Tickets", "lastAiExpectedReply", {
      type: DataTypes.STRING,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, "Tickets", "lastAiIntent", {
      type: DataTypes.STRING,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, "Tickets", "lastAiAction", {
      type: DataTypes.STRING,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, "Tickets", "lastAiKnowledgeIds", {
      type: DataTypes.TEXT,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, "Tickets", "lastAiDecisionReason", {
      type: DataTypes.TEXT,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, "Tickets", "lastAiAskedMoreHelp", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    await addColumnIfMissing(queryInterface, "Tickets", "aiInteractionCount", {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    });

    await addColumnIfMissing(queryInterface, "Tickets", "aiConversationSummary", {
      type: DataTypes.TEXT,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.removeColumn("Tickets", "aiConversationSummary").catch(() => {});
    await queryInterface.removeColumn("Tickets", "aiInteractionCount").catch(() => {});
    await queryInterface.removeColumn("Tickets", "lastAiAskedMoreHelp").catch(() => {});
    await queryInterface.removeColumn("Tickets", "lastAiDecisionReason").catch(() => {});
    await queryInterface.removeColumn("Tickets", "lastAiKnowledgeIds").catch(() => {});
    await queryInterface.removeColumn("Tickets", "lastAiAction").catch(() => {});
    await queryInterface.removeColumn("Tickets", "lastAiIntent").catch(() => {});
    await queryInterface.removeColumn("Tickets", "lastAiExpectedReply").catch(() => {});
    await queryInterface.removeColumn("Tickets", "lastAiMessage").catch(() => {});
  }
};
