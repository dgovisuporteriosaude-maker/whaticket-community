import { QueryInterface, DataTypes } from "sequelize";

const addColumnIfMissing = async (
  queryInterface: QueryInterface,
  table: string,
  column: string,
  definition: any
) => {
  const description = await queryInterface.describeTable(table) as Record<string, unknown>;
  if (!description[column]) {
    await queryInterface.addColumn(table, column, definition);
  }
};

const upsertSetting = async (queryInterface: QueryInterface, key: string, value = "") => {
  await queryInterface.sequelize.query(
    `insert into "Settings" ("key", "value", "createdAt", "updatedAt")
     values (:key, :value, now(), now())
     on conflict ("key") do nothing`,
    { replacements: { key, value } }
  );
};

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const mediaColumns = {
      mediaUrl: { type: DataTypes.STRING, allowNull: true },
      mediaType: { type: DataTypes.STRING, allowNull: true },
      mediaName: { type: DataTypes.STRING, allowNull: true }
    };

    for (const [column, definition] of Object.entries(mediaColumns)) {
      await addColumnIfMissing(queryInterface, "QuickAnswers", column, definition);
      await addColumnIfMissing(queryInterface, "Campaigns", column, definition);
      await addColumnIfMissing(queryInterface, "ScheduledMessages", column, definition);
    }

    await addColumnIfMissing(queryInterface, "UraFlows", "welcomeMediaUrl", { type: DataTypes.STRING, allowNull: true });
    await addColumnIfMissing(queryInterface, "UraFlows", "welcomeMediaType", { type: DataTypes.STRING, allowNull: true });
    await addColumnIfMissing(queryInterface, "UraFlows", "welcomeMediaName", { type: DataTypes.STRING, allowNull: true });

    await addColumnIfMissing(queryInterface, "UraOptions", "responseMediaUrl", { type: DataTypes.STRING, allowNull: true });
    await addColumnIfMissing(queryInterface, "UraOptions", "responseMediaType", { type: DataTypes.STRING, allowNull: true });
    await addColumnIfMissing(queryInterface, "UraOptions", "responseMediaName", { type: DataTypes.STRING, allowNull: true });

    await addColumnIfMissing(queryInterface, "Queues", "businessHoursEnabled", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await addColumnIfMissing(queryInterface, "Queues", "businessHours", { type: DataTypes.TEXT, allowNull: true });
    await addColumnIfMissing(queryInterface, "Queues", "unavailableMessage", { type: DataTypes.TEXT, allowNull: true });
    await addColumnIfMissing(queryInterface, "Queues", "unavailableMediaUrl", { type: DataTypes.STRING, allowNull: true });
    await addColumnIfMissing(queryInterface, "Queues", "unavailableMediaType", { type: DataTypes.STRING, allowNull: true });
    await addColumnIfMissing(queryInterface, "Queues", "unavailableMediaName", { type: DataTypes.STRING, allowNull: true });

    await upsertSetting(queryInterface, "companyFantasyName");
    await upsertSetting(queryInterface, "companyLegalName");
    await upsertSetting(queryInterface, "companyCnpj");
    await upsertSetting(queryInterface, "companyAddress");
    await upsertSetting(queryInterface, "companyPhone");
    await upsertSetting(queryInterface, "companyEmail");
    await upsertSetting(queryInterface, "companyWebsite");
    await upsertSetting(queryInterface, "companyPix");
    await upsertSetting(queryInterface, "companyPaymentInfo");
  },

  down: async (queryInterface: QueryInterface) => {
    for (const table of ["QuickAnswers", "Campaigns", "ScheduledMessages"]) {
      await queryInterface.removeColumn(table, "mediaName").catch(() => {});
      await queryInterface.removeColumn(table, "mediaType").catch(() => {});
      await queryInterface.removeColumn(table, "mediaUrl").catch(() => {});
    }

    for (const column of ["welcomeMediaName", "welcomeMediaType", "welcomeMediaUrl"]) {
      await queryInterface.removeColumn("UraFlows", column).catch(() => {});
    }
    for (const column of ["responseMediaName", "responseMediaType", "responseMediaUrl"]) {
      await queryInterface.removeColumn("UraOptions", column).catch(() => {});
    }
    for (const column of [
      "unavailableMediaName",
      "unavailableMediaType",
      "unavailableMediaUrl",
      "unavailableMessage",
      "businessHours",
      "businessHoursEnabled"
    ]) {
      await queryInterface.removeColumn("Queues", column).catch(() => {});
    }
  }
};
