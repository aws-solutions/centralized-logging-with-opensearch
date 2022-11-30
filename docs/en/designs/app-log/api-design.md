# Application Log API Design


## Log Config APIs

The following operations are available in the solution's Log Config APIs.


### Create Log Config

**Type:** Mutation

**Description:** Create a record in DynamoDB

**Resolver:** Lambda

**Parameters:**

| Name               | Type   | Required | Default | Description                                                                                                                            |
| ------------------ | ------ | -------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| confName           | String | Yes      |         | The name of the log configuration. The name must be unique, and can only contains lower case letters and -.                            |
| logType            | enum   | Yes      |         | JSON, Apache, Nginx, SingleLineText, MultiLineText.                                |
| timeKey            | String | No       |         | Time key in the log.                                |
| timeOffset         | String | No       |         | Timezone offset for the log                                |
| multilineLogParser | enum   | No       |         | JAVA_SPRING_BOOT.                                                                                                                      |
| userLogFormat      | String | No       |         | The log format configuration. For instance, the log format configuration of Apache. e.g. LogFormat "%h %l %u %t \"%r\" %>s %b" common. |
| userSampleLog      | String | No       |         | Sampled log. |
| regularExpression  | String | No       |         | When the log type you select is SingleLineText, MultiLineText, you need to define a regular expression to parse the log.               |
| regularSpecs       | K-V    | No       |         | To be used to parse the log field type, we will create an index template for the search engine based on this.                          |
| timeRegularExpression  | String | No       |         | When the time key is specified, you need to define a regular expression to parse the time format.               |
| processorFilterRegex   | K-V  | No       |         | Filter details, such as filter key and condition etc.               |

**Simple Request & Response:**

```
query example{
  createLogConf(
    confName: "nginx-log",
    logType: "Nginx",
    userSampleLog: "127.0.0.1 - - [24/Dec/2021:01:27:11 +0000] \"GET / HTTP/1.1\" 200 3520 \"-\" \"curl/7.79.1\" \"-\"",
    userLogFormat: "log_format%20%20main%20%20...*",
    regularSpecs: [],
    timeRegularExpression: "",
    processorFilterRegex: {
      enable: true,
      filters: [
        {
          key: "status",
          condition: "Include",
          value: "200"
        }
      ]
    }
  )
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

### Update Log Config

**Type:** Mutation

**Description:** Update a log configuration.

**Resolver:** Lambda

**Parameters:**

| Name               | Type   | Required | Default | Description                                                                                                                            |
| ------------------ | ------ | -------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| id                 | String | Yes      |         | Log Config Unique ID (key in DynamoDB)                                                                                                 |
| confName           | String | Yes      |         | The name of the log configuration. The name must be unique, and can only contains lower case letters and -.                            |
| logType            | enum   | Yes      |         | JSON, Apache, Nginx, SingleLineText, MultiLineText.                                |
| timeKey            | String | No       |         | Time key in the log.                                |
| timeOffset         | String | No       |         | Timezone offset for the log                                |
| multilineLogParser | enum   | No       |         | JAVA_SPRING_BOOT.                                                                                                                      |
| userLogFormat      | String | No       |         | The log format configuration. For instance, the log format configuration of Apache. e.g. LogFormat "%h %l %u %t \"%r\" %>s %b" common. |
| userSampleLog      | String | No       |         | Sampled log. |
| regularExpression  | String | No       |         | When the log type you select is SingleLineText, MultiLineText, you need to define a regular expression to parse the log.               |
| regularSpecs       | K-V    | No       |         | To be used to parse the log field type, we will create an index template for the search engine based on this.                          |
| timeRegularExpression  | String | No       |         | When the time key is specified, you need to define a regular expression to parse the time format.               |
| processorFilterRegex   | K-V  | No       |         | Filter details, such as filter key and condition etc.               |

**Simple Request & Response:**

Request:

```
mutation example{
  updateLogConf(
    id: "41848bb3-f48a-4cdd-b0af-861d4be768ca",
    confName: "my-nginx",
    logType: "Nginx",
    userSampleLog: "127.0.0.1 - - [24/Dec/2021:01:27:11 +0000] \"GET / HTTP/1.1\" 200 3520 \"-\" \"curl/7.79.1\" \"-\"",
    userLogFormat: "log_format%20%20main%20%20...*",
    regularSpecs: [],
    timeRegularExpression: "",
    processorFilterRegex: {
      enable: true,
      filters: [
        {
          key: "status",
          condition: "Include",
          value: "200"
        }
      ]
    }
  )
}
```

Response:

```
{
  "data": {
    "updateLogConf": "OK"
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

### Delete Log Config

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
### List Log Configs

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
query example {
    listLogConfs (page: 1, count: 10) {
        logConfs {
            id
            confName
            logType
            syslogParser
            createdDt
            status
        }
        total
    }
}
```

Response:

```
{
    "data": {
        "listLogConfs": {
            "logConfs": [
                {
                    "id": "b942da74-f755-499a-855e-12c43267a6c0",
                    "confName": "my-nginx",
                    "logType": "Nginx",
                    "syslogParser": null,
                    "createdDt": "2022-10-30T03:54:38Z",
                    "status": "ACTIVE"
                },
                ...
            ],
            "total": 4
        }
    }
}
```


### Get Log Config Details

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
  getLogConf (id: "62c9a8c5-eb43-4d25-b94f-941848525645") {
        id
        confName
        logType
        timeKey
        timeOffset
        createdDt
        userLogFormat
        userSampleLog
        regularExpression
        timeRegularExpression
        regularSpecs {
            key
            type
            format
        }
        processorFilterRegex {
            enable
            filters {
                key
                condition
                value
            }
        }
        status
    }
}
```

Response:

```
{
    "data": {
        "getLogConf": {
            "id": "62c9a8c5-eb43-4d25-b94f-941848525645",
            "confName": "myapp",
            "logType": "SingleLineText",
            "timeKey": "time_local",
            "timeOffset": "+0000",
            "createdDt": "2022-11-30T02:48:27Z",
            "userLogFormat": "%28%3F%3Cremote_addr%3E%5CS%2B%29%5Cs*-%5Cs*%28%....*",
            "userSampleLog": "...",
            "regularExpression": "%28%3F%3Cremote_addr%3E%5CS%2B%29%5Cs*-%5Cs*%28%....*",
            "timeRegularExpression": "",
            "regularSpecs": [
                {
                    "key": "remote_addr",
                    "type": "text",
                    "format": null
                },
                {
                    "key": "remote_user",
                    "type": "text",
                    "format": null
                },
                {
                    "key": "time_local",
                    "type": "text",
                    "format": "%d/%b/%Y:%H:%M:%S"
                },
                ...
            ],
            "processorFilterRegex": {
                "enable": true,
                "filters": [
                    {
                        "key": "status",
                        "condition": "Include",
                        "value": "200"
                    }
                ]
            },
            "status": "ACTIVE"
        }
    }
}
```


## Instance Group APIs

The following operations are available in the solution's Instance Group APIs.



### Create Instance Group

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


### Delete Instance Group

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

### List Instance Groups

**Type:** Query

**Description:** List all Instance Groups

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
            id
            accountId
            region
            groupName
            groupType
            instanceSet
            createdDt
            status
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
				"groupType": "ASG",
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

### Get Instance Group Details

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

### List Instances

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
			name
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
				"platformName": "CentOS Linux",
				"name": "Bastion"
			}]
		}
	}
}
```

### Get Log Agent Status

**Type:** Query

**Description:** Get Fluent Bit installation status.

**Resolver:** Lambda

**Parameters:**

| Name       | Type   | Required | Default | Description                                        |
| ---------- | ------ | -------- | ------- | -------------------------------------------------- |
| instanceId | String | Yes      |         | The ID of the managed instance should be retrieved |
| region     | String | No       |         | AWS region |
| accountId  | String | No       |         | AWS account ID |

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



## Application Log Pipelines APIs

The following operations are available in the solution's Application (App) Log Pipelines APIs.


### Create App Log Pipeline

**Type:** Mutation

**Description:** Create an application log pipeline

**Resolver:** Lambda

**Parameters:**

| Name         | Type     | Required | Default | Description                                     |
| --------     | ----     | -------- | ------- | ----------------------------------------------- |
| aosParams    | K-V      | Yes      |         | Amazon OpenSearch related parameters.           |
| bufferType   | string   | Yes      |         | Type of buffer (e.g. S3, KDS etc).              |
| bufferParams | List     | Yes      |         | Buffer related parameters.                      |
| force        | boolean  | Yes      |         | Force to create pipeline when conflict detected.|
| tags         | List     | No       |         | Custom tags.                                    |

**Simple Request & Response:**

Request:

```
mutation example{
  	createAppPipeline(
        aosParams: {
            coldLogTransition: 0, 
            failedLogBucket: "backup-bucket", 
            domainName: "dev", 
            engine: OpenSearch, 
            indexPrefix: "my-index", 
            logRetention: 180, 
            opensearchArn: "arn:aws:es:us-west-2:123456789012:domain/dev", 
            opensearchEndpoint: "vpc-dev-xxx.us-west-2.es.amazonaws.com", 
            replicaNumbers: 1, 
            shardNumbers: 5, 
            vpc: {
                privateSubnetIds: "subnet-1234,subnet-5678", 
                publicSubnetIds: "", 
                securityGroupId: "sg-1234", 
                vpcId: "vpc-0123"
                }, 
            warmLogTransition: 0
        }, 
        bufferType: S3, 
        bufferParams: [
            {paramKey: "logBucketName", paramValue: "log-bucket"}, 
            {paramKey: "logBucketPrefix", paramValue: "AppLogs/my-index/year=%Y/month=%m/day=%d"}, 
            {paramKey: "defaultCmkArn", paramValue: "arn:aws:kms:us-west-2:123456789012:key/1dbbdae3-3448-4890-b956-2b9b36197784"},
            {paramKey: "maxFileSize", paramValue: "50"},
            {paramKey: "uploadTimeout", paramValue: "60"},
            {paramKey: "compressionType", paramValue: "gzip"}
        ],
        force: false, 
        tags: [{key: "hello", value: "world"}]
    )
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

### Delete App Log Pipeline

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

### List App Log Pipelines

**Type:** Query

**Description:** List all application log pipelines

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
            id
            bufferType
            bufferParams {
                paramKey
                paramValue
            }
            aosParams {
                opensearchArn
                domainName
                indexPrefix
                warmLogTransition
                coldLogTransition
                logRetention
                shardNumbers
                replicaNumbers
                engine
            }
            createdDt
            status
            bufferAccessRoleArn
            bufferAccessRoleName
            bufferResourceName
            bufferResourceArn
            tags {
                key
                value
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
            "appPipelines": [
                {
                    "id": "67409286-2672-413f-b477-dc1f4d7966d4",
                    "bufferType": "S3",
                    "bufferParams": [
                        {
                            "paramKey": "logBucketName",
                            "paramValue": "log-bucket"
                        },
                        {
                            "paramKey": "logBucketPrefix",
                            "paramValue": "AppLogs/my-index/year=%Y/month=%m/day=%d"
                        },
                        {
                            "paramKey": "defaultCmkArn",
                            "paramValue": "arn:aws:kms:eu-west-1:123456789012:key/9619ed02-b533-4d49-91de-3dd8efa11135"
                        },
                        {
                            "paramKey": "maxFileSize",
                            "paramValue": "50"
                        },
                        {
                            "paramKey": "uploadTimeout",
                            "paramValue": "60"
                        },
                        {
                            "paramKey": "compressionType",
                            "paramValue": "gzip"
                        }
                    ],
                    "aosParams": {
                        "opensearchArn": "arn:aws:es:eu-west-1:123456789012:domain/dev",
                        "domainName": "dev",
                        "indexPrefix": "my-index",
                        "warmLogTransition": 0,
                        "coldLogTransition": 0,
                        "logRetention": 180,
                        "shardNumbers": 5,
                        "replicaNumbers": 1,
                        "engine": "OpenSearch"
                    },
                    "createdDt": "2022-10-30T03:03:56Z",
                    "status": "ACTIVE",
                    "bufferAccessRoleArn": "arn:aws:iam::123456789012:role/LogHub-AppPipe-824f1-BufferAccessRoleDF53FD85-1ME7KUUVZVFTD",
                    "bufferAccessRoleName": "LogHub-AppPipe-824f1-BufferAccessRoleDF53FD85-1ME7KUUVZVFTD",
                    "bufferResourceName": "log-bucket",
                    "bufferResourceArn": "arn:aws:s3:::log-bucket",
                    "tags": [
                        {
                            "key": "hello",
                            "value": "world"
                        }
                    ]
                },
                ...
            ],
            "total": 3
        }
    }
}
```


### Get App Log Pipeline Details

**Type:** Query

**Description:** Get details of an application log pipeline.

**Resolver:** Lambda

**Parameters:**

| Name | Type   | Required | Default | Description                              |
| ---- | ------ | -------- | ------- | ---------------------------------------- |
| id   | String | Yes      |         | App Pipeline Unique ID (key in DynamoDB) |

**Simple Request & Response:**

Request:

```
query example {
    getAppPipeline (id: "67409286-2672-413f-b477-dc1f4d7966d4") {
        id
        bufferType
        bufferParams {
            paramKey
            paramValue
        }
        aosParams {
            opensearchArn
            domainName
            indexPrefix
            warmLogTransition
            coldLogTransition
            logRetention
            shardNumbers
            replicaNumbers
            engine
        }
        createdDt
        status
        bufferAccessRoleArn
        bufferAccessRoleName
        bufferResourceName
        bufferResourceArn
        tags {
            key
            value
        }
    }
}
```

Response:

```
{
    "data": {
        "getAppPipeline": {
            "id": "67409286-2672-413f-b477-dc1f4d7966d4",
            "bufferType": "S3",
            "bufferParams": [
                {
                    "paramKey": "logBucketName",
                    "paramValue": "log-bucket"
                },
                {
                    "paramKey": "logBucketPrefix",
                    "paramValue": "AppLogs/my-index/year=%Y/month=%m/day=%d"
                },
                {
                    "paramKey": "defaultCmkArn",
                    "paramValue": "arn:aws:kms:eu-west-1:123456789012:key/9619ed02-b533-4d49-91de-3dd8efa11135"
                },
                {
                    "paramKey": "maxFileSize",
                    "paramValue": "50"
                },
                {
                    "paramKey": "uploadTimeout",
                    "paramValue": "60"
                },
                {
                    "paramKey": "compressionType",
                    "paramValue": "gzip"
                }
            ],
            "aosParams": {
                "opensearchArn": "arn:aws:es:eu-west-1:123456789012:domain/dev",
                "domainName": "dev",
                "indexPrefix": "my-index",
                "warmLogTransition": 0,
                "coldLogTransition": 0,
                "logRetention": 180,
                "shardNumbers": 5,
                "replicaNumbers": 1,
                "engine": "OpenSearch"
            },
            "createdDt": "2022-11-30T03:03:56Z",
            "status": "ACTIVE",
            "bufferAccessRoleArn": "arn:aws:iam::123456789012:role/LogHub-AppPipe-67409-BufferAccessRoleDF53FD85-BTLM263CB8JI",
            "bufferAccessRoleName": "LogHub-AppPipe-67409-BufferAccessRoleDF53FD85-BTLM263CB8JI",
            "bufferResourceName": "log-bucket",
            "bufferResourceArn": "arn:aws:s3:::log-bucket",
            "tags": [
                {
                    "key": "hello",
                    "value": "world"
                }
            ]
        }
    }
}
```

## Application Log Ingestion APIs


The following operations are available in the solution's Application (App) Log Ingestion APIs.



### Create App Log Ingestion

**Type:** Mutation

**Description:** Create a record in DynamoDB

**Resolver:** Lambda

**Parameters:**

| Name          | Type     | Required | Default | Description                                                                                                                                                                          |
| ------------- | -------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| appPipelineId | K-V      | Yes      |         | Selected Amazonn OpenSearch related parameters.                                                                                                                                      |
| confId        | K-V      | Yes      |         | Created Kinesis Data Stream related parameters.                                                                                                                                      |
| groupIds      | String[] | Yes      |         | Created Kinesis Data Stream related parameters.                                                                                                                                      |
| stackId       | String   | Yes      |         | In the process of creating an application log pipeline, KDS and Lambda are created through the CloudFormation stack. This item can be obtained through the listAppLogIngestions API. |
| stackName     | String   | Yes      |         | In the process of creating an application log pipeline, KDS and Lambda are created through the CloudFormation stack. This item can be obtained through the listAppLogIngestions API. |

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

### Delete App Log Ingestion

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

### List App Log Ingestions

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


### Get App Log Ingestion Details

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
