import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Tickets", "glpiTicketId", {
      type: DataTypes.INTEGER,
      allowNull: true
    }).catch(() => {});

    await queryInterface.bulkInsert(
      "Settings",
      [
        {
          key: "glpiEnabled",
          value: "disabled",
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          key: "glpiApiUrl",
          value: "",
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          key: "glpiAppToken",
          value: "",
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          key: "glpiUserToken",
          value: "",
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          key: "glpiEntityId",
          value: "",
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          key: "glpiCategoryId",
          value: "",
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ],
      {}
    ).catch(() => {});
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Tickets", "glpiTicketId").catch(() => {});
    await queryInterface.bulkDelete("Settings", {
      key: [
        "glpiEnabled",
        "glpiApiUrl",
        "glpiAppToken",
        "glpiUserToken",
        "glpiEntityId",
        "glpiCategoryId"
      ]
    }).catch(() => {});
  }
};
