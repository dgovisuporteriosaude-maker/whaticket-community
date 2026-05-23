import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("Tags", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false, unique: true },
      color: { type: DataTypes.STRING, allowNull: false, defaultValue: "#607d8b" },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    }).catch(() => {});

    await queryInterface.createTable("ContactTags", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      contactId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "Contacts", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE" },
      tagId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "Tags", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE" },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    }).catch(() => {});

    await queryInterface.addIndex("ContactTags", ["contactId", "tagId"], {
      unique: true,
      name: "ContactTags_contactId_tagId_unique"
    }).catch(() => {});
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("ContactTags").catch(() => {});
    await queryInterface.dropTable("Tags").catch(() => {});
  }
};
