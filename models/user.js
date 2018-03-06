module.exports = function(sequelize, DataTypes) {
  var User = sequelize.define('User', {
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    nambaoneStatus: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    nambaOneChatId: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    nambaoneBotId: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    last_address: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: JSON.stringify([])
    },
    last_order_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    underscored: true,
    timestamps: false,
    instanceMethods: {
    },
    classMethods: {
      associate: function(models) {
      
      },
    },
    
  });
  return User;
};