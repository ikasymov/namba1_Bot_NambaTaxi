/**
 * Created by ilgizkasymov on 4/23/18.
 */
module.exports = function(sequelize, DataTypes) {
  var Order = sequelize.define('Order', {
    order_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: true
    }
  }, {
    underscored: true,
    timestamps: false,
    instanceMethods: {
    },
    classMethods: {
      associate: function(models) {
        Order.belongsTo(models.User, {foreignKey: 'user_id'});
      },
    },
    
  });
  return Order;
};