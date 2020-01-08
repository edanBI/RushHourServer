let AWS = require('aws-sdk');

AWS.config.update({
	region: "us-west-2",
	endpoint: "http://localhost:8000"
});

let dynamodb = new AWS.DynamoDB({
	apiVersion: '2012-08-10'
});
let createTableCallback = function (err, data) {
	if (err) {
		console.error("Unable to create table. Error JSON:", JSON.stringify(err, null, 2));
	} else {
		console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
	}
};

// TODO: add a table for questions

/** 
 * Create all tables. One for players and a table for each game instance data of each player.
 * If tables exist, do nothing.
 */
let CreateTables = function () {
	dynamodb.listTables(function (err, data) {
		if (err) {
			console.error(`Fail to list tables. ${err}`);
			return;
		} else {
			console.log(`Tables Exist: ${data.TableNames}`);
			if (!data.TableNames.includes('Players')) {
				let playersTableSchema = {
					TableName: "Players",
					KeySchema: [{
						AttributeName: "WorkerID",
						KeyType: "HASH"
					}],
					AttributeDefinitions: [{
						AttributeName: "WorkerID",
						AttributeType: "S"
					}],
					ProvisionedThroughput: {
						ReadCapacityUnits: 10, // TODO check this values
						WriteCapacityUnits: 10
					}
				}
				dynamodb.createTable(playersTableSchema, createTableCallback);
				console.log('Players table created.');
			} else console.log('Players table already exist.');
			for (let i = 1; i < 4; i++) {
				if (!data.TableNames.includes(`Scenario_${i}_data`)) {
					let scenario_i_DataTable = {
						TableName: `Scenario_${i}_data`,
						KeySchema: [{
							AttributeName: "WorkerID",
							KeyType: "HASH"
						}],
						AttributeDefinitions: [{
							AttributeName: "WorkerID",
							AttributeType: "S"
						}],
						ProvisionedThroughput: {
							ReadCapacityUnits: 10, // TODO check this values
							WriteCapacityUnits: 10
						}
					};
					dynamodb.createTable(scenario_i_DataTable, createTableCallback);
					console.log('Players table created.');
				} else console.log(`Scenario_${i}_data table already exist.`);
			}
		}
		console.log(`All Tables are Ready.`);
	});
};

/**
 * @param playerInfo must be {
 * 		WorkerID: '',
 * 		...
 * }
 */
let InsertPlayer = function (playerInfo) {
	const param = {
		TableName: 'Players',
		Item: {
			"WorkerID": { "S": `${playerInfo.WorkerID}` },
			"Age": { "N": playerInfo.Age },
			"Gender": { "S": `${playerInfo.Gender}` },
			"Education": { "S": `${playerInfo.Education}` },
			"Country": { "S": `${playerInfo.Country}` },
			"Bonus": { "S": "noBonus" }
		},
		ConditionExpression: 'attribute_not_exists(WorkerID)'
	}
	return new Promise((resolve, reject) => {
		dynamodb.putItem(param, (err, data) => {
			if (err) reject(err);
			else resolve(data);
		})
	});
}

let InsertInstanceData = function (instance_data) {
	const param = {
		TableName: `Scenario_${instance_data.InstanceNumber}_data`,
		Item: {
			"WorkerID": { "S": `${instance_data.WorkerID}` },
			"Log": { "M": `${instance_data.Log}` },
			"QnsAns": { "M": `${instance_data.QnsAns}` }
		},
		ConditionExpression: 'attribute_not_exists(WorkerID)'
	}

	return new Promise((resolve, reject) => {
		dynamodb.putItem(param, (err, data) => {
			if (err) reject(err);
			else resolve(data);
		})
	});
}

// let GetBonusCode = function (WorkerID) {
// 	// TODO: generate new bonus code for the player, save it in his DB and return the code to the player
// }

module.exports = {
	CreateTables,
	InsertPlayer,
	InsertInstanceData
}; //, GetBonusCode };