# Overview

### APIs

#### Log Config APIs

The following operations are available in the solution's Log Config APIs.

##### List Log Configs

**Type:** Query

**Description:** List all Log Configs

**Resolver:** Lambda

**Parameters:**

| Name  | Type | Required | Default | Description                |
| ----- | ---- | -------- | ------- | -------------------------- |
| count | Int  | No       | 10      | page number, start from 1  |
| page  | Int  | No       | 1       | number of records per page |

**Simple Request & Response:**

Request:

```
query example{
  listLogConfs(count: 10, page: 1) {
		logConfs {
			confName
			createdDt
			id
			logPath
			logType
		}
	}
}
```

Response:

```
{
	"data": {
		"listLogConfs": {
			"logConfs": [{
				"confName": "sys-log",
				"createdDt": "2021-11-07T14:30:16.024007",
				"id": "41848bb3-f48a-4cdd-b0af-861d4be768ca",
				"logPath": "/log/*/ab/*.log",
				"logType": "JSON"
			}]
		}
	}
}
```

##### Create Log Config

**Type:** Mutation

**Description:** Create a record in DynamoDB

**Resolver:** Lambda

**Parameters:**

| Name               | Type   | Required | Default | Description                                                                                                                            |
| ------------------ | ------ | -------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| confName           | String | Yes      |         | The name of the log configuration. The name must be unique, and can only contains lower case letters and -.                            |
| logPath            | String | Yes      |         | The location of the log files. All files under the specified folder will be included. Use ' , ' to separate multiple paths.            |
| logType            | enum   | Yes      |         | JSON, Apache, Nginx, SingleLineText, MultiLineText.                                                                                    |
| multilineLogParser | enum   | No       |         | JAVA_SPRING_BOOT.                                                                                                                      |
| userLogFormat      | String | No       |         | The log format configuration. For instance, the log format configuration of Apache. e.g. LogFormat "%h %l %u %t \"%r\" %>s %b" common. |
| regularExpression  | String | No       |         | When the log type you select is SingleLineText, MultiLineText, you need to define a regular expression to parse the log.               |
| regularSpecs       | K-V    | No       |         | To be used to parse the log field type, we will create an index template for the search engine based on this.                          |

**Simple Request & Response:**

```
query example{
  createLogConf(
    confName: "nginx-log",
    logPath: "/var/log/nginx/*.log",
    logType: "Nginx"
  )
}
```

Request without region

```
query example {
  listDomainNames {
    domainNames
  }
}
```

Response:

```
{
	"data": {
		"createLogConf": "41848bb3-f48a-4cdd-b0af-861d4be768ca"
	}
}
```

##### Update Log Config

**Type:** Mutation

**Description:** Update the configuration of your choice.

**Resolver:** Lambda

**Parameters:**

| Name               | Type   | Required | Default | Description                                                                                                                            |
| ------------------ | ------ | -------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| id                 | String | Yes      |         | Log Config Unique ID (key in DynamoDB)                                                                                                 |
| confName           | String | Yes      |         | The name of the log configuration. The name must be unique, and can only contains lower case letters and -.                            |
| logPath            | String | Yes      |         | The location of the log files. All files under the specified folder will be included. Use ' , ' to separate multiple paths.            |
| logType            | enum   | Yes      |         | JSON, Apache, Nginx, SingleLineText, MultiLineText.                                                                                    |
| multilineLogParser | enum   | No       |         | JAVA_SPRING_BOOT.                                                                                                                      |
| userLogFormat      | String | No       |         | The log format configuration. For instance, the log format configuration of Apache. e.g. LogFormat "%h %l %u %t \"%r\" %>s %b" common. |
| regularExpression  | String | No       |         | When the log type you select is SingleLineText, MultiLineText, you need to define a regular expression to parse the log.               |
| regularSpecs       | K-V    | No       |         | To be used to parse the log field type, we will create an index template for the search engine based on this.                          |

**Simple Request & Response:**

Request:

```
mutation example{
  updateLogConf(
    id: "41848bb3-f48a-4cdd-b0af-861d4be768ca",
    logPath: "/app/gaming/app.log",
    logType: JSON,
    confName: "applog"
    )
}
```

Response:

```
{
  "data": {
    "importDomain": "OK"
  }
}
```

Exceptions:

- confName already exists

```
{
	"data": {
		"updateLogConf": null
	},
	"errors": [{
		"path": [
			"updateLogConf"
		],
		"data": null,
		"errorType": "Lambda:Unhandled",
		"errorInfo": null,
		"locations": [{
			"line": 3,
			"column": 3,
			"sourceName": null
		}],
		"message": "confName already exists"
	}]
}
```

##### Delete Log Config

**Type:** Mutation

**Description:** We don't physically delete the record, we just set the state of the item to INACTIVE in DynamoDB Table.

**Resolver:** Lambda

**Parameters:**

| Name | Type   | Required | Default | Description                            |
| ---- | ------ | -------- | ------- | -------------------------------------- |
| id   | String | Yes      |         | Log Config Unique ID (key in DynamoDB) |

**Simple Request & Response:**

Request:

```
mutation example {
  	deleteLogConf(id: "41848bb3-f48a-4cdd-b0af-861d4be768ca")
}
```

Response:

```
{
  "data": {
    "deleteLogConf": "OK"
  }
}
```

Exceptions:

- Unknown exception, please check Lambda log for more details

```
{
  "data": {
    "deleteLogConf": null
  },
  "errors": [
    {
      "path": [
        "deleteLogConf"
      ],
      "data": null,
      "errorType": "Lambda:Unhandled",
      "errorInfo": null,
      "locations": [
        {
          "line": 32,
          "column": 3,
          "sourceName": null
        }
      ],
      "message": "Unknown exception, please check Lambda log for more details"
    }
  ]
}
```

##### Get Log Config Details

**Type:** Query

**Description:** Get details of a Log Config.

**Resolver:** Lambda

**Parameters:**

| Name | Type   | Required | Default | Description                            |
| ---- | ------ | -------- | ------- | -------------------------------------- |
| id   | String | Yes      |         | Log Config Unique ID (key in DynamoDB) |

**Simple Request & Response:**

Request:

```
query example {
  getLogConf(id: "41848bb3-f48a-4cdd-b0af-861d4be768ca") {
		confName
    logPath
    logType
    multilineLogParser
    createdDt
    userLogFormat
    regularExpression
    regularSpecs
	}
}
```

Response:

```
{
	"data": {
		"getLogConf": {
			"confName": "fff",
			"createdDt": "2021-11-07T14:30:16.024007",
			"id": "41848bb3-f48a-4cdd-b0af-861d4be768ca",
			"logPath": "/log/*/ab/*.log",
			"logType": "JSON"
		}
	}
}
```

### Log Group API Design

#### Overview

This document is about the API Design for **Log Group** component. To learn more information about the component, refer to [Component Design](../component-design)

#### Log Group APIs

The following operations are available in the solution's Log Group APIs.

##### List Log Groups

**Type:** Query

**Description:** List all Log Groups

**Resolver:** Lambda

**Parameters:**

| Name  | Type | Required | Default | Description                |
| ----- | ---- | -------- | ------- | -------------------------- |
| count | Int  | No       | 10      | page number, start from 1  |
| page  | Int  | No       | 1       | number of records per page |

**Simple Request & Response:**

Request:

```
query example{
	listInstanceGroups(count: 10, page: 1) {
		total
		instanceGroups {
			createdDt
			groupName
			id
			instanceSet
		}
	}
}
```

Response:

```
{
	"data": {
		"listInstanceGroups": {
			"total": 1,
			"instanceGroups": [{
				"createdDt": "2021-11-06T12:28:52.041408",
				"groupName": "fsf1",
				"id": "1089057b-888b-4794-b797-fef943adccf0",
				"instanceSet": [
					"1",
					"2"
				]
			}]
		}
	}
}
```

##### Create Log Group

**Type:** Mutation

**Description:** Create a record in DynamoDB

**Resolver:** Lambda

**Parameters:**

| Name        | Type     | Required | Default | Description                                                                                         |
| ----------- | -------- | -------- | ------- | --------------------------------------------------------------------------------------------------- |
| groupName   | String   | Yes      |         | The name of the log group. The name must be unique, and can only contains lower case letters and -. |
| instanceSet | String[] | Yes      |         | EC2 Instance Id set                                                                                 |

**Simple Request & Response:**

Request:

```
query example{
  	createInstanceGroup(groupName: "nginx-webgrp", instanceSet: ["web1", "web2"])
}
```

Response:

```
{
	"data": {
		"createInstanceGroup": "2de27afe-d568-49cc-b7b5-86b161ce0662"
	}
}
```

##### Update Log Group

**Type:** Mutation

**Description:** Update the group of your choice.

**Resolver:** Lambda

**Parameters:**

| Name        | Type     | Required | Default | Description                                                                                         |
| ----------- | -------- | -------- | ------- | --------------------------------------------------------------------------------------------------- |
| id          | String   | Yes      |         | Log Group Unique ID (key in DynamoDB)                                                               |
| groupName   | String   | Yes      |         | The name of the log group. The name must be unique, and can only contains lower case letters and -. |
| instanceSet | String[] | Yes      |         | EC2 Instance Id set                                                                                 |

**Simple Request & Response:**

Request:

```
mutation example{
  	updateInstanceGroup(
      id: "1089057b-888b-4794-b797-fef943adccf0",
      groupName: "fsf1",
      instanceSet: ["1", "2"]
      )
}
```

Response:

```
{
  "data": {
    "importDomain": "OK"
  }
}
```

Exceptions:

- groupName already exists

```
{
	"data": {
		"updateInstanceGroup": null
	},
	"errors": [{
		"path": [
			"updateInstanceGroup"
		],
		"data": null,
		"errorType": "Lambda:Unhandled",
		"errorInfo": null,
		"locations": [{
			"line": 3,
			"column": 3,
			"sourceName": null
		}],
		"message": "Group Name already exists"
	}]
}
```

##### Delete Log Group

**Type:** Mutation

**Description:** We don't physically delete the record, we just set the state of the item to INACTIVE in DynamoDB Table.

**Resolver:** Lambda

**Parameters:**

| Name | Type   | Required | Default | Description                           |
| ---- | ------ | -------- | ------- | ------------------------------------- |
| id   | String | Yes      |         | Log Group Unique ID (key in DynamoDB) |

**Simple Request & Response:**

Request:

```
mutation example {
  	deleteInstanceGroup(id: "41848bb3-f48a-4cdd-b0af-861d4be768ca")
}
```

Response:

```
{
  "data": {
    "deleteInstanceGroup": "OK"
  }
}
```

Exceptions:

- Unknown exception, please check Lambda log for more details

```
{
  "data": {
    "deleteInstanceGroup": null
  },
  "errors": [
    {
      "path": [
        "deleteInstanceGroup"
      ],
      "data": null,
      "errorType": "Lambda:Unhandled",
      "errorInfo": null,
      "locations": [
        {
          "line": 32,
          "column": 3,
          "sourceName": null
        }
      ],
      "message": "Unknown exception, please check Lambda log for more details"
    }
  ]
}
```

##### Get Log Group Details

**Type:** Query

**Description:** Get details of a Log Group.

**Resolver:** Lambda

**Parameters:**

| Name | Type   | Required | Default | Description                           |
| ---- | ------ | -------- | ------- | ------------------------------------- |
| id   | String | Yes      |         | Log Group Unique ID (key in DynamoDB) |

**Simple Request & Response:**

Request:

```
query example {
  getInstanceGroup(id: "41848bb3-f48a-4cdd-b0af-861d4be768ca") {
    createdDt
		groupName
		id
		instanceSet
	}
}
```

Response:

```
{
	"data": {
		"getInstanceGroup": {
    "createdDt": "2021-11-06T12:28:52.041408",
		"groupName": "fsf1",
		"id": "1089057b-888b-4794-b797-fef943adccf0",
		"instanceSet": [
				"1",
				"2"
		]
	}
}
```

##### List Instances

**Type:** Query

**Description:** If you specify one or more managed node IDs, it returns information for those managed nodes.

**Resolver:** Lambda

**Parameters:**

| Name        | Type     | Required | Default | Description                                                                                                                                                  |
| ----------- | -------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| nextToken   | String   | No       |         | The token for the next set of items to return. (You received this token from a previous call.)                                                               |
| maxResults  | Int      | No       | 10      | The maximum number of items to return for this call. The call also returns a token that you can specify in a subsequent call to get the next set of results. |
| instanceSet | String[] | No       | 1       | The ID of the managed instance should be retrieved                                                                                                           |

**Simple Request & Response:**

Request:

```
query example{
		listInstances(maxResults: 10, instanceSet: ["i-0bbf9209068ced7ed"]) {
		instances {
			computerName
			id
			ipAddress
			platformName
		}
	}
}
```

Response:

```
{
	"data": {
		"listInstances": {
			"instances": [{
				"computerName": "ip-172-31-44-205.us-west-2.compute.internal",
				"id": "i-0bbf9209068ced7ed",
				"ipAddress": "172.31.44.205",
				"platformName": "CentOS Linux"
			}]
		}
	}
}
```

##### Get Log Agent Status

**Type:** Query

**Description:** Get Fluent Bit installation status.

**Resolver:** Lambda

**Parameters:**

| Name       | Type   | Required | Default | Description                                        |
| ---------- | ------ | -------- | ------- | -------------------------------------------------- |
| instanceId | String | No       | 1       | The ID of the managed instance should be retrieved |

**Simple Request & Response:**

Request:

```
query example{
		getLogAgentStatus(instanceId: "i-022c5110c4e3226bb")
	}
}
```

Response:

```
{
	"data": {
		"getLogAgentStatus": "Online/Offline"
	}
}
```

##### Request Install Fluent Bit

**Type:** Mutation

**Description:** To install Fluent Bit by SSM Document.

**Resolver:** Lambda

**Parameters:**

| Name          | Type           | Required | Default | Description                                      |
| ------------- | -------------- | -------- | ------- | ------------------------------------------------ |
| instanceIdSet | String[]eiifcc | No       | 1       | Request to install the instance id of Fluent Bit |

**Simple Request & Response:**

Request:

```
mutation example{
		requestInstallLogAgent(instanceIdSet: ["i-022c5110c4e3226b"])
	}
}
```

Response:

```
{
	"data": {
		"requestInstallLogAgent": "commandID"
	}
}
```

### Application Log Pipelines API Design

#### Overview

This document is about the API Design for **Application log Pipeline** component. To learn more information about the component, refer to [Component Design](../component-design)

#### Application Log Pipelines APIs

The following operations are available in the solution's Application Log Pipelines APIs.

##### List App Pipelines

**Type:** Query

**Description:** List all Pipelines

**Resolver:** Lambda

**Parameters:**

| Name  | Type | Required | Default | Description                |
| ----- | ---- | -------- | ------- | -------------------------- |
| count | Int  | No       | 10      | page number, start from 1  |
| page  | Int  | No       | 1       | number of records per page |

**Simple Request & Response:**

Request:

```
query example{
	listAppPipelines(count: 10, page: 1) {
		appPipelines {
			createdDt
			id
			status
			kdsParas {
				enableAutoScaling
				kdsArn
				maxShardNumber
				regionName
				startShardNumber
				streamName
			}
			aosParas {
				coldLogTransition
				domainName
				engine
				indexPrefix
				logRetention
				warmLogTransition
				opensearchArn
			}
		}
		total
	}
}
```

Response:

```
{
	"data": {
		"listAppPipelines": {
			"appPipelines": [{
					"createdDt": "2021-11-12T03:20:57.049336",
					"id": "de7137e2-f2f1-429f-b692-d8882b670200",
					"status": "DELETING",
					"kdsParas": [{
						"enableAutoScaling": false,
						"kdsArn": "kar",
						"maxShardNumber": 10,
						"regionName": "us-",
						"startShardNumber": 10,
						"streamName": "s"
					}],
					"aosParas": [{
						"coldLogTransition": 10,
						"domainName": null,
						"engine": "OpenSearch",
						"indexPrefix": "i1",
						"logRetention": 32,
						"warmLogTransition": 30,
						"opensearchArn": "t"
					}]
				},
				{
					"createdDt": "2021-11-08T10:44:11.523895",
					"id": "45851795-6401-41f7-8ded-6c6db14f375c",
					"status": "CREATING",
					"kdsParas": [{
						"enableAutoScaling": true,
						"kdsArn": "karn",
						"maxShardNumber": 20,
						"regionName": "us-west-1",
						"startShardNumber": 10,
						"streamName": "aa"
					}],
					"aosParas": [{
						"coldLogTransition": 10,
						"domainName": null,
						"engine": null,
						"indexPrefix": "fy",
						"logRetention": 10,
						"warmLogTransition": 10,
						"opensearchArn": ""
					}]
				}
			],
			"total": 2
		}
	}
}
```

##### Create Pipelines

**Type:** Mutation

**Description:** Create a record in DynamoDB

**Resolver:** Lambda

**Parameters:**

| Name     | Type | Required | Default | Description                                     |
| -------- | ---- | -------- | ------- | ----------------------------------------------- |
| aosParas | K-V  | Yes      |         | Selected Amazonn OpenSearch related parameters. |
| kdsParas | K-V  | Yes      |         | Created Kinesis Data Stream related parameters. |

**Simple Request & Response:**

Request:

```
mutation example{
  	createAppPipeline(aosParas: {
		engine: "OpenSearch_1.0",
		indexPrefix: "nginx-log",
		opensearchArn: "arn:aws:es:us-east-1:xxxxx:domain/testing-vpc-opensearch",
		coldLogTransition: 10,
		warmLogTransition: 5
		logRetention: 10
	}, kdsParas: {
		enableAutoScaling: true,
		kdsArn: "arn:aws:kinesis:us-east-1:xxxxx:stream/LogHub-Pipe-b8c96-CWtoOpenSearchStackcwDataStream22A58C70-LOrG0yqq40py",
		regionName: "us-east-1",
		startShardNumber: 10,
		maxShardNumber: 20,
		streamName: "LogHub-Pipe-b8c96-CWtoOpenSearchStackcwDataStream22A58C70-LOrG0yqq40py"
	})
}
```

Response:

```
{
	"data": {
		"createAppPipeline": "2de27afe-d568-49cc-b7b5-86b161ce0662"
	}
}
```

##### Delete Pipeline

**Type:** Mutation

**Description:** We don't physically delete the record, we just set the state of the item to INACTIVE in DynamoDB Table.

**Resolver:** Lambda

**Parameters:**

| Name | Type   | Required | Default | Description                           |
| ---- | ------ | -------- | ------- | ------------------------------------- |
| id   | String | Yes      |         | Log Group Unique ID (key in DynamoDB) |

**Simple Request & Response:**

Request:

```
mutation example {
  	deleteAppPipeline(id: "41848bb3-f48a-4cdd-b0af-861d4be768ca")
}
```

Response:

```
{
  "data": {
    "deleteAppPipeline": "OK"
  }
}
```

Exceptions:

- Unknown exception, please check Lambda log for more details

```
{
  "data": {
    "deleteAppPipeline": null
  },
  "errors": [
    {
      "path": [
        "deleteAppPipeline"
      ],
      "data": null,
      "errorType": "Lambda:Unhandled",
      "errorInfo": null,
      "locations": [
        {
          "line": 32,
          "column": 3,
          "sourceName": null
        }
      ],
      "message": "Unknown exception, please check Lambda log for more details"
    }
  ]
}
```

##### Get Pipeline Details

**Type:** Query

**Description:** Get details of a Pipeline.

**Resolver:** Lambda

**Parameters:**

| Name | Type   | Required | Default | Description                              |
| ---- | ------ | -------- | ------- | ---------------------------------------- |
| id   | String | Yes      |         | App Pipeline Unique ID (key in DynamoDB) |

**Simple Request & Response:**

Request:

```
query example {
  getAppPipeline(id: "45851795-6401-41f7-8ded-6c6db14f375c") {
		createdDt
		id
		aosParas {
			coldLogTransition
			indexPrefix
			logRetention
			warmLogTransition
			opensearchArn
		}
		kdsParas {
			enableAutoScaling
			engine
			kdsArn
			maxShardNumber
			regionName
			startShardNumber
			streamName
		}
		tags[{
			key
			value
		}]
	}
}
```

Response:

```
{
	"data": {
		"getAppPipeline": {
			"createdDt": "2021-11-08T10:44:11.523895",
			"id": "45851795-6401-41f7-8ded-6c6db14f375c",
			"aosParas": [{
				"engine": "OpenSearch_1.0",
				"indexPrefix": "nginx-log",
				"opensearchArn": "arn:aws:es:us-east-1:xxxxx:domain/testing-vpc-opensearch",
				"coldLogTransition": 10,
				"warmLogTransition": 5
				"logRetention": 10
			}],
			"kdsParas": [{
				"enableAutoScaling": true,
				"kdsArn": "arn:aws:kinesis:us-east-1:xxxxx:stream/"LogHub-Pipe-b8c96-CWtoOpenSearchStackcwDataStream22A58C70-LOrG0yqq40py",
				"regionName": "us-east-1",
				"startShardNumber": 10,
				"maxShardNumber": 20,
				"streamName": "LogHub-Pipe-b8c96-CWtoOpenSearchStackcwDataStream22A58C70-LOrG0yqq40py"
			}],
			"tags": []
		}
	}
}
```

### Application Log Ingestion API Design

#### Overview

This document is about the API Design for **Application log Ingestion** component. To learn more information about the component, refer to [Component Design](../component-design)

#### Application Log Ingestion APIs

The following operations are available in the solution's Application Log Pipelines APIs.

##### List Log Ingestion

**Type:** Query

**Description:** List all Ingestion

**Resolver:** Lambda

**Parameters:**

| Name          | Type   | Required | Default | Description                    |
| ------------- | ------ | -------- | ------- | ------------------------------ |
| appPipelineId | String | Yes      | 10      | Application Pipeline Unique Id |
| count         | Int    | No       | 10      | page number, start from 1      |
| page          | Int    | No       | 1       | number of records per page     |

**Simple Request & Response:**

Request:

```
query example{
	listAppLogIngestions(appPipelineId: "45851795-6401-41f7-8ded-6c6db14f375c", count: 10, page: 1) {
		appLogIngestions {
			appPipelineId
			confId
			confName
			createdDt
			groupId
			groupName
			stackName
			stackId
			id
			tags [{
				key
				value
			}]
		}
		total
	}
}
```

Response:

```
{
	"data": {
		"listAppLogIngestions": {
			"appLogIngestions": [{
					"appPipelineId": "45851795-6401-41f7-8ded-6c6db14f375c",
					"confId": "01523e70-b571-4583-8882-56c877ec098c",
					"confName": "c2",
					"createdDt": "2021-11-16T11:26:35.509759",
					"groupId": "afa6c23f-765c-4322-bb00-234525a5ff85",
					"groupName": "g4",
					"stackName": "",
					"stackId": "",
					"id": "dd0eb789-6a33-4b51-873d-f5473ccdf144",
					"tags": []
				},
				{
					"appPipelineId": "45851795-6401-41f7-8ded-6c6db14f375c",
					"confId": "01523e70-b571-4583-8882-56c877ec098c",
					"confName": "c2",
					"createdDt": "2021-11-16T11:26:35.509716",
					"groupId": "8ef2debb-1c72-4821-9e61-ce89b6c6ed00",
					"groupName": "g3",
					"stackName": "",
					"stackId": "",
					"id": "af65c64b-7403-4e92-90f6-1ec13d655deb",
					"tags": []
				}
			],
			"total": 2
		}
	}
}
```

##### Create Ingestion

**Type:** Mutation

**Description:** Create a record in DynamoDB

**Resolver:** Lambda

**Parameters:**

| Name          | Type     | Required | Default | Description                                                                                                                                                                          |
| ------------- | -------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| appPipelineId | K-V      | Yes      |         | Selected Amazonn OpenSearch related parameters.                                                                                                                                      |
| confId        | K-V      | Yes      |         | Created Kinesis Data Stream related parameters.                                                                                                                                      |
| groupIds      | String[] | Yes      |         | Created Kinesis Data Stream related parameters.                                                                                                                                      |
| stackId       | String   | Yes      |         | In the process of creating an application log pipeline, KDS and Lambda are created through the cloudformation stack. This item can be obtained through the listAppLogIngestions API. |
| stackName     | String   | Yes      |         | In the process of creating an application log pipeline, KDS and Lambda are created through the cloudformation stack. This item can be obtained through the listAppLogIngestions API. |

**Simple Request & Response:**

Request:

```
mutation example{
  	createAppLogIngestion(
		  appPipelineId: "45851795-6401-41f7-8ded-6c6db14f375c",
		  confId: "01523e70-b571-4583-8882-56c877ec098c",
		  groupIds: ["afa6c23f-765c-4322-bb00-234525a5ff85"],
		  stackId: "",
		  stackName: "")
}
```

Response:

```
{
	"data": {
		"createAppLogIngestion": "2de27afe-d568-49cc-b7b5-86b161ce0662"
	}
}
```

Exceptions:

- Unknown exception, please check Lambda log for more details

```
{
	"data": {
		"createAppLogIngestion": null
	},
	"errors": [{
		"path": [
			"createAppLogIngestion"
		],
		"data": null,
		"errorType": "Lambda:Unhandled",
		"errorInfo": null,
		"locations": [{
			"line": 23,
			"column": 3,
			"sourceName": null
		}],
		"message": "please check groupId afa6c23f-765c-4322-bb00-234525a5ff85 and conId 01523e70-b571-4583-8882-56c877ec098c, they already exist in applineId 45851795-6401-41f7-8ded-6c6db14f375c"
	}]
}

```

##### Delete Application Log Ingestion

**Type:** Mutation

**Description:** We don't physically delete the record, we just set the state of the item to INACTIVE in DynamoDB Table.

**Resolver:** Lambda

**Parameters:**

| Name | Type     | Required | Default | Description                            |
| ---- | -------- | -------- | ------- | -------------------------------------- |
| ids  | String[] | Yes      |         | Log Ingestion ID Set (key in DynamoDB) |

**Simple Request & Response:**

Request:

```
mutation example {
  		deleteAppLogIngestion(
			  ids: ["60779959-95e3-45b6-a433-225f5c57edcc", "86b02ebc-d952-4b37-ac17-f001150d3a16"]
			  )
}
```

Response:

```
{
  "data": {
    "deleteAppLogIngestion": "OK"
  }
}
```

##### Get Log Ingestion Details

**Type:** Query

**Description:** Get details of a Ingestion.

**Resolver:** Lambda

**Parameters:**

| Name | Type   | Required | Default | Description                                   |
| ---- | ------ | -------- | ------- | --------------------------------------------- |
| id   | String | Yes      |         | App Log Ingestion Unique ID (key in DynamoDB) |

**Simple Request & Response:**

Request:

```
query example {
	getAppLogIngestion(id: "5051c5ce-f0fb-4b6e-be39-05490756b335") {
		appPipelineId
		confId
		createdDt
		groupId
		id
		stackId
		stackName
		tags[{
			key
			value
		}]
	}
}
```

Response:

```
{
	"data": {
		"getAppLogIngestion": {
			"appPipelineId": "f45648b9-cfa8-4bfb-bf6b-f7a06a8fecf1",
			"confId": "c1",
			"createdDt": "2021-11-07T17:48:03.935902",
			"groupId": "g1",
			"id": "5051c5ce-f0fb-4b6e-be39-05490756b335",
			"stackId": "s",
			"stackName": "ss",
			"tags": []
		}
	}
}
```

