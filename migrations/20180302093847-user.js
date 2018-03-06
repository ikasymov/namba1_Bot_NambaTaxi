'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.createTable('Users', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      nambaoneStatus: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      nambaOneChatId: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      nambaoneBotId: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      last_address: {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: JSON.stringify([])
      },
      last_order_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      }
    })
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.dropTable('Users')
  }
};
