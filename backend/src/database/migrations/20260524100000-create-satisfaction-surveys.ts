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
    await queryInterface.createTable("SatisfactionSurveys", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false },
      question: { type: DataTypes.TEXT, allowNull: false },
      scaleType: { type: DataTypes.STRING, allowNull: false, defaultValue: "1_5" },
      sendMode: { type: DataTypes.STRING, allowNull: false, defaultValue: "optional" },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    }).catch(() => {});

    await queryInterface.createTable("SatisfactionSurveyResponses", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      satisfactionSurveyId: { type: DataTypes.INTEGER, allowNull: true },
      ticketId: { type: DataTypes.INTEGER, allowNull: false },
      contactId: { type: DataTypes.INTEGER, allowNull: false },
      userId: { type: DataTypes.INTEGER, allowNull: true },
      queueId: { type: DataTypes.INTEGER, allowNull: true },
      categoryId: { type: DataTypes.INTEGER, allowNull: true },
      closingReasonId: { type: DataTypes.INTEGER, allowNull: true },
      rating: { type: DataTypes.INTEGER, allowNull: false },
      rawAnswer: { type: DataTypes.STRING, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    }).catch(() => {});

    await addColumnIfMissing(queryInterface, "Tickets", "satisfactionSurveyId", {
      type: DataTypes.INTEGER,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "Tickets", "satisfactionSurveySentAt", {
      type: DataTypes.DATE,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "Tickets", "satisfactionSurveyAnsweredAt", {
      type: DataTypes.DATE,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.removeColumn("Tickets", "satisfactionSurveyAnsweredAt").catch(() => {});
    await queryInterface.removeColumn("Tickets", "satisfactionSurveySentAt").catch(() => {});
    await queryInterface.removeColumn("Tickets", "satisfactionSurveyId").catch(() => {});
    await queryInterface.dropTable("SatisfactionSurveyResponses").catch(() => {});
    await queryInterface.dropTable("SatisfactionSurveys").catch(() => {});
  }
};
