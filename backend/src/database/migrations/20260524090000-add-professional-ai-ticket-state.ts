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
    await addColumnIfMissing(queryInterface, "Tickets", "aiQueueId", {
      type: DataTypes.INTEGER,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, "Tickets", "aiStartedAt", {
      type: DataTypes.DATE,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, "Tickets", "aiFinishedAt", {
      type: DataTypes.DATE,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, "Tickets", "lastAiQuestionType", {
      type: DataTypes.STRING,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, "Tickets", "lastAiQuestionOptions", {
      type: DataTypes.TEXT,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, "Tickets", "lastAiQuestionAt", {
      type: DataTypes.DATE,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, "Tickets", "lastAiQuestionAttempts", {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    });

    await addColumnIfMissing(queryInterface, "Tickets", "lastAiInteractionAt", {
      type: DataTypes.DATE,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, "AiSettings", "aiQueueId", {
      type: DataTypes.INTEGER,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, "AiSettings", "confirmationMaxAttempts", {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 2
    });

    await addColumnIfMissing(queryInterface, "AiSettings", "confirmationFailureMessage", {
      type: DataTypes.TEXT,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.removeColumn("AiSettings", "confirmationFailureMessage").catch(() => {});
    await queryInterface.removeColumn("AiSettings", "confirmationMaxAttempts").catch(() => {});
    await queryInterface.removeColumn("AiSettings", "aiQueueId").catch(() => {});
    await queryInterface.removeColumn("Tickets", "lastAiInteractionAt").catch(() => {});
    await queryInterface.removeColumn("Tickets", "lastAiQuestionAttempts").catch(() => {});
    await queryInterface.removeColumn("Tickets", "lastAiQuestionAt").catch(() => {});
    await queryInterface.removeColumn("Tickets", "lastAiQuestionOptions").catch(() => {});
    await queryInterface.removeColumn("Tickets", "lastAiQuestionType").catch(() => {});
    await queryInterface.removeColumn("Tickets", "aiFinishedAt").catch(() => {});
    await queryInterface.removeColumn("Tickets", "aiStartedAt").catch(() => {});
    await queryInterface.removeColumn("Tickets", "aiQueueId").catch(() => {});
  }
};
