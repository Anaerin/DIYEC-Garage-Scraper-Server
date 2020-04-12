import Sequelize from "sequelize";
const Model = Sequelize.Model;
const DataTypes = Sequelize.DataTypes;
export const sequelize = new Sequelize({
	dialect: "sqlite",
	storage: "DIYEC.sqlite",
	logging: false
});
let models = {};
sequelize.authenticate();

export class Vehicle extends Model {
	static init(sequelize) {
		super.init({
			id: {
				type: DataTypes.INTEGER,
				primaryKey: true
			},
			vehicleName: DataTypes.STRING,
			builder: DataTypes.STRING,
			started: DataTypes.DATE,
			estFinish: DataTypes.DATE,
			buildDuration: DataTypes.INTEGER,
			buildHours: DataTypes.INTEGER,
			pctComplete: DataTypes.INTEGER,
			added: DataTypes.DATE,
			lastUpdated: DataTypes.DATE,
			donorVehicle: DataTypes.STRING,
			donorCost: DataTypes.STRING,
			conversionCost: DataTypes.STRING,
			totalCost: DataTypes.STRING,
			maxPower: DataTypes.STRING,
			topSpeed: DataTypes.STRING,
			acceleration: DataTypes.STRING,
			finalWeight: DataTypes.STRING,
			rangeAt30: DataTypes.STRING,
			rangeAt55: DataTypes.STRING,
			batteryType: DataTypes.STRING,
			batteryManufacturer: DataTypes.STRING,
			batteryConfiguration: DataTypes.STRING,
			batteryPackVoltage: DataTypes.STRING,
			charger: DataTypes.STRING,
			chargeTime: DataTypes.STRING,
			controller: DataTypes.STRING,
			motor: DataTypes.STRING,
			dc2dcConverter: DataTypes.STRING,
			airConditioning: DataTypes.STRING,
			powerSteering: DataTypes.STRING,
			brakes: DataTypes.STRING,
			tires: DataTypes.STRING,
			notes: DataTypes.STRING,
			buildThread: DataTypes.STRING
		}, { sequelize, modelName: "Vehicle"} );
	}
	static relation(models) {
		this.hasMany(models.Images);
	}
}
models.Vehicle = Vehicle;
models.Vehicle.init(sequelize);

export class Images extends Model {
	static init(sequelize) {
		super.init({
			id: {
				type: DataTypes.INTEGER,
				primaryKey: true
			},
			title: DataTypes.STRING
		}, { sequelize, modelName: "Images"});
	}
	static relation(models) {
		this.belongsTo(models.Vehicle);
	}
}
models.Images = Images;
models.Images.init(sequelize);
for (let model in models) {
	if (models[model].relation) models[model].relation(sequelize.models);
}
sequelize.sync({
	alter: false
});
