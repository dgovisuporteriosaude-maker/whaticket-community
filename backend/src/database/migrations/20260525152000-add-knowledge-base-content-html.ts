import { QueryInterface, DataTypes } from "sequelize";
import { plainTextToHtml } from "../../utils/knowledgeFormatting";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface
      .addColumn("KnowledgeBaseArticles", "contentHtml", {
        type: DataTypes.TEXT,
        allowNull: true
      })
      .catch(() => {});

    const [rows] = await queryInterface.sequelize.query(
      `select id, content from "KnowledgeBaseArticles" where "contentHtml" is null`
    );

    for (const row of rows as Array<{ id: number; content: string }>) {
      await queryInterface.sequelize.query(
        `update "KnowledgeBaseArticles" set "contentHtml" = :contentHtml where id = :id`,
        {
          replacements: {
            id: row.id,
            contentHtml: plainTextToHtml(row.content || "")
          }
        }
      );
    }
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("KnowledgeBaseArticles", "contentHtml").catch(() => {});
  }
};
