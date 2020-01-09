let AWS = require('aws-sdk');

AWS.config.update({
	region: "us-west-2",
	endpoint: "http://localhost:8000"
});
let dynamodb = new AWS.DynamoDB( { apiVersion: '2012-08-10' } );
let docClient = new AWS.DynamoDB.DocumentClient( { apiVersion: '2012-08-10' } );
let converter = AWS.DynamoDB.Converter;
let questionsIDCounter = 0;

let createTableCallback = (err, data) => {
	if (err) {
		console.error("Unable to create table. Error JSON:", JSON.stringify(err, null, 2));
	} else {
		console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
	}
};

/** 
 * Create all tables. One for players and a table for each game instance data of each player.
 * If tables exist, do nothing.
 */
let CreateTables = () => {
	dynamodb.listTables(function (err, data) {
		if (err) {
			console.error(`Fail to list tables. ${err}`);
			return;
		} else {
			console.log(`Tables Exist: ${data.TableNames}`);
			// Create Players Table
			if (!data.TableNames.includes('Players')) {
				let params = {
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
						ReadCapacityUnits: 10,
						WriteCapacityUnits: 10
					}
				}
				dynamodb.createTable(params, createTableCallback);
				console.log('Players table created.');
			} else console.log('Players table already exist.');
			// Create Scenarios Data Table
			if (!data.TableNames.includes(`Scenarios_Data`)) {
				let params = {
					TableName: `Scenarios_Data`,
					KeySchema: [
						{AttributeName: "WorkerID", KeyType: "HASH"},
						{AttributeName: "InstanceIndex", KeyType: "RANGE"}
					],
					AttributeDefinitions: [
						{ AttributeName: "WorkerID", AttributeType: "S" },
						{ AttributeName: "InstanceIndex", AttributeType: "N" },
					],
					ProvisionedThroughput: {
						ReadCapacityUnits: 10,
						WriteCapacityUnits: 10
					}
				};
				dynamodb.createTable(params, createTableCallback);
				console.log('Scenarios_Data table created.');
			} else console.log('Scenario_Data table already exist.');
			// Create Questions Table
			if (!data.TableNames.includes('Questions')) {
				let params = {
					TableName: 'Questions',
					KeySchema: [
						{AttributeName: "ID", KeyType: "HASH"},
					],
					AttributeDefinitions: [
						{ AttributeName: "ID", AttributeType: "N" }
					],
					ProvisionedThroughput: {
						ReadCapacityUnits: 10,
						WriteCapacityUnits: 10
					}
				};
				dynamodb.createTable(params, createTableCallback);
				console.log('Questions Table Created.');
			} else console.log('Questions Table Already Exist.');
		}
		console.log(`All Tables Ready.`);
	});
};

/**
 * @param playerInfo must be {
 * 		WorkerID: '',
 * 		...
 * }
 */
let InsertPlayer = (playerInfo) => {
	const param = {
		TableName: 'Players',
		Item: {
			"WorkerID": playerInfo.WorkerID,
			"Age": parseInt(playerInfo.Age),
			"Gender": playerInfo.Gender,
			"Education": playerInfo.Education,
			"Country": playerInfo.Country,
			"Bonus": "noBonus"
		},
		ConditionExpression: 'attribute_not_exists(WorkerID)'
	}
	return new Promise((resolve, reject) => {
		docClient.put(param, (err, data) => {
			if (err) reject(err);
			else resolve(data);
		})
	});
}

/** Insert log and answers of player in this instance. */
let InsertInstanceData = (instance_data) => {
	const param = {
		TableName: `Scenarios_Data`,
		Item: {
			WorkerID: instance_data.WorkerID,
			InstanceIndex: parseInt(instance_data.InstanceIndex),
			Log: instance_data.Log,
			QnsAns: instance_data.QnsAns
		},
		ConditionExpression: 'attribute_not_exists(WorkerID)'
	};

	return new Promise((resolve, reject) => {
		docClient.put(param, (err, data) => {
			if (err) reject(err);
			else resolve(data);
		})
	});
}

let GetQuestions = () => {
	const params = {
		TableName: 'Questions'
	};
	return new Promise((resolve, reject) => {
		dynamodb.scan(params, (err, data) => {
			if (err) reject(err);
			else resolve(data);
		});
	});
}

// let GetBonusCode = function (WorkerID) {
// 	// TODO: generate new bonus code for the player, save it in his DB and return the code to the player
// }

module.exports = {
	CreateTables,
	InsertPlayer,
	InsertInstanceData,
	GetQuestions
}; //, GetBonusCode };