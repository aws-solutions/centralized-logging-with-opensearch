# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
"""
App Pipeline Table
"""
base_source_pipeline_data = {
    "id": "ab740668-fba3-4d86-879d-e9a5a446d69f",
    "aosParas": {
        "coldLogTransition": 0,
        "domainName": "solution-aos-comp",
        "engine": "OpenSearch",
        "failedLogBucket": "solution-solutionloggingbucket0fa53b76-ysyv4acbp8m7",
        "indexPrefix": "s3-as-source-dev-001",
        "logRetention": 3,
        "opensearchArn":
        "arn:aws:es:us-east-1:123456789012:domain/solution-aos-comp",
        "opensearchEndpoint":
        "vpc-solution-aos-comp-hphbroajo2om57yxvywp3qfheq.us-east-1.es.amazonaws.com",
        "vpc": {
            "privateSubnetIds":
            "subnet-0beacf91077d910a4,subnet-02ab80d72477b9b80",
            "publicSubnetIds": "",
            "securityGroupId": "sg-015f309fa344bf1ae",
            "vpcId": "vpc-0f0ec3719e2b45b9b",
        },
        "warmLogTransition": 0,
    },
    "createdAt": "2022-04-24T02:00:24Z",
    "error": "",
    "kdsParas": {
        "enableAutoScaling": False,
        "kdsArn":
        "arn:aws:kinesis:us-east-1:123456789012:stream/Solution-AppPipe-ab740-Stream790BDEE4-UP3FCdPEQOBl",
        "maxShardNumber": 0,
        "osHelperFnArn":
        "arn:aws:lambda:us-east-1:123456789012:function:os_helper_fn",
        "regionName": "us-east-1",
        "startShardNumber": 2,
        "streamName": "Solution-AppPipe-ab740-Stream790BDEE4-UP3FCdPEQOBl",
    },
    "kdsRoleArn":
    "arn:aws:iam::111111111:role/Solution-EKS-Cluster-PodLog-DataBufferKDSRole7BCBC83-1II64RIV25JN3",
    "kdsRoleName":
    "Solution-EKS-Cluster-PodLog-DataBufferKDSRole7BCBC83-1II64RIV25JN3",
    "stackId":
    "arn:aws:cloudformation:us-east-1:123456789012:stack/Solution-AppPipe-ab740/4eab9b00-c372-11ec-9734-0e7d39abbad5",
    "status": "ACTIVE",
    "tags": [],
}

syslog_source_pipeline_data = {
    "id": "04c263a5-67d0-449d-b094-b85674b524f2",
    "aosParams": {
        "codec": "best_compression",
        "coldLogTransition": "",
        "domainName": "solution-aos-comp",
        "engine": "OpenSearch",
        "failedLogBucket": "solution-latest-solutionloggingbucket0fa53b76-vy9h0jn9r6t4",
        "indexPrefix": "syslog-ut-01",
        "indexSuffix": "yyyy-MM-dd",
        "logRetention": "3d",
        "opensearchArn": "arn:aws:es:us-east-1:123456789012:domain/solution-aos-comp",
        "opensearchEndpoint": "vpc-solution-aos-comp-hphbroajo2om57yxvywp3qfheq.us-east-1.es.amazonaws.com",
        "refreshInterval": "1s",
        "replicaNumbers": 1,
        "rolloverSize": "30gb",
        "shardNumbers": 1,
        "vpc": {
            "privateSubnetIds": "subnet-01ab488417a01415f,subnet-0ac95d70c21979205",
            "publicSubnetIds": "",
            "securityGroupId": "sg-02aaa033432e14fb6",
            "vpcId": "vpc-052b56b457aceda8f"
        },
        "warmLogTransition": ""
    },
    "bufferAccessRoleArn": "arn:aws:iam::123456789012:role/CL-AppPipe-04c26-BufferAccessRoleDF53FD85-1E6S75E216KKV",
    "bufferAccessRoleName": "CL-AppPipe-04c26-BufferAccessRoleDF53FD85-1E6S75E216KKV",
    "bufferParams": [
        {
            "paramKey": "enableAutoScaling",
            "paramValue": "false"
        },
        {
            "paramKey": "shardCount",
            "paramValue": "1"
        },
        {
            "paramKey": "minCapacity",
            "paramValue": "1"
        },
        {
            "paramKey": "maxCapacity",
            "paramValue": "1"
        }
    ],
    "bufferResourceArn": "arn:aws:kinesis:us-east-1:123456789012:stream/CL-AppPipe-04c26-KDSBufferStream21B531A6-VgKRW8MpJ6YK",
    "bufferResourceName": "CL-AppPipe-04c26-KDSBufferStream21B531A6-VgKRW8MpJ6YK",
    "bufferType": "KDS",
    "createdAt": "2023-01-30T02:56:52Z",
    "error": "",
    "osHelperFnArn": "arn:aws:lambda:us-east-1:123456789012:function:CL-AppPipe-04c26-OpenSearchHelperFn-VAG8cFZLm8cW",
    "stackId": "arn:aws:cloudformation:us-east-1:123456789012:stack/CL-AppPipe-04c26/c07ba9a0-a049-11ed-ad64-0e63c5baaaf1",
    "status": "ACTIVE",
    "tags": [
    ]
}

ec2_source_pipeline_data = {
    "id": "d27b96a9-7b78-4fe1-94e6-3e42f57f4339",
    "aosParas": {
        "coldLogTransition": 0,
        "domainName": "solution-aos-comp",
        "engine": "OpenSearch",
        "failedLogBucket": "solution-solutionloggingbucket0fa53b76-ysyv4acbp8m7",
        "indexPrefix": "index-dev-01",
        "logRetention": 3,
        "opensearchArn":
        "arn:aws:es:us-east-1:123456789012:domain/solution-aos-comp",
        "opensearchEndpoint":
        "vpc-solution-aos-comp-hphbroajo2om57yxvywp3qfheq.us-east-1.es.amazonaws.com",
        "vpc": {
            "privateSubnetIds":
            "subnet-0beacf91077d910a4,subnet-02ab80d72477b9b80",
            "publicSubnetIds": "",
            "securityGroupId": "sg-015f309fa344bf1ae",
            "vpcId": "vpc-0f0ec3719e2b45b9b",
        },
        "warmLogTransition": 0,
    },
    "createdAt": "2022-04-14T13:32:36Z",
    "kdsRoleArn":
    "arn:aws:iam::111111111:role/Solution-EKS-Cluster-PodLog-DataBufferKDSRole7BCBC83-1II64RIV25JN3",
    "kdsRoleName":
    "Solution-EKS-Cluster-PodLog-DataBufferKDSRole7BCBC83-1II64RIV25JN3",
    "error": "",
    "kdsParas": {
        "enableAutoScaling": False,
        "kdsArn":
        "arn:aws:kinesis:us-east-1:123456789012:stream/Solution-AppPipe-d27b9-Stream790BDEE4-oXbw9MVMUZho",
        "maxShardNumber": 0,
        "osHelperFnArn":
        "arn:aws:lambda:us-east-1:123456789012:function:os_helper_fn",
        "regionName": "us-east-1",
        "startShardNumber": 10,
        "streamName": "Solution-AppPipe-d27b9-Stream790BDEE4-oXbw9MVMUZho",
    },
    "stackId":
    "arn:aws:cloudformation:us-east-1:123456789012:stack/Solution-AppPipe-d27b9/59ddb120-bbf7-11ec-af5d-0e3a79ee7dd1",
    "status": "ACTIVE",
    "tags": [],
}
"""
App Log Source Table
"""
syslog_source_data_1 = {
    "id": "2dba77ec-ec81-42f8-a57c-3501e3778fc9",
    "accountId": "",
    "createdAt": "2023-01-30T03:05:59Z",
    "region": "",
    "sourceInfo": [
        {
            "key": "syslogProtocol",
            "value": "UDP"
        },
        {
            "key": "syslogPort",
            "value": "10009"
        },
        {
            "key": "syslogNlbArn",
            "value": "arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/net/Logging-syslog-nlb/693a5b65a057ecc8"
        },
        {
            "key": "syslogNlbDNSName",
            "value": "Logging-syslog-nlb-693a5b65a057ecc8.elb.us-east-1.amazonaws.com"
        }
    ],
    "sourceType": "Syslog",
    "status": "ACTIVE",
    "tags": [
    ],
    "updatedAt": "2023-01-30T03:06:11Z"
}

s3_source_data_1 = {
    "id": "9681daea-1095-44b5-8e11-40fa935f3aea",
    "archiveFormat": "json",
    "createdAt": "2022-04-24T01:57:55Z",
    "region": "us-east-1",
    "s3Name": "solution-logs-123456789012",
    "s3Prefix": "nginx",
    "sourceType": "S3",
    "status": "ACTIVE",
    "tags": [],
}

s3_source_data_2 = {
    "id": "000000001-1095-44b5-8e11-40fa935f3aea",
    "archiveFormat": "text",
    "createdAt": "2022-04-24T01:57:55Z",
    "region": "us-east-1",
    "s3Name": "solution-logs-123456789012",
    "s3Prefix": "nginx",
    "sourceType": "S3",
    "status": "ACTIVE",
    "tags": [],
}

"""
App Log Configuration Table
"""
json_config_1 = {
    "id":
    "e4c579eb-fcf2-4ddb-8226-796f4bc8a690",
    "confName":
    "s3-source-config-01",
    "createdAt":
    "2022-04-24T02:11:25Z",
    "logPath":
    "*.log",
    "logType":
    "JSON",
    "multilineLogParser":
    None,
    "regularExpression":
    "",
    "regularSpecs": [
        {
            "format": "%d/%b/%Y:%H:%M:%S %z",
            "key": "time",
            "type": "date"
        },
        {
            "key": "host",
            "type": "text"
        },
        {
            "key": "user-identifier",
            "type": "text"
        },
        {
            "key": "method",
            "type": "text"
        },
        {
            "key": "request",
            "type": "text"
        },
        {
            "key": "protocol",
            "type": "text"
        },
        {
            "key": "status",
            "type": "integer"
        },
        {
            "key": "bytes",
            "type": "integer"
        },
        {
            "key": "referer",
            "type": "text"
        },
    ],
    "status":
    "ACTIVE",
    "userLogFormat":
    "",
}

regex_config_1 = {
    "id":
    "339039e1-9812-43f8-9962-165e3adbc805",
    "confName":
    "regex-nginx-config",
    "createdAt":
    "2022-03-17T07:51:18Z",
    "logPath":
    "/var/log/nginx/access.log",
    "logType":
    "Nginx",
    "multilineLogParser":
    None,
    "regularExpression":
    '(?<remote_addr>\\S+)\\s+-\\s+(?<remote_user>\\S+)\\s+\\[(?<time_local>\\d+/\\S+/\\d+:\\d+:\\d+:\\d+)\\s+\\S+\\]\\s+"(?<request_method>\\S+)\\s+(?<request_uri>\\S+)\\s+\\S+"\\s+(?<status>\\S+)\\s+(?<body_bytes_sent>\\S+)\\s+"(?<http_referer>[^"]*)"\\s+"(?<http_user_agent>[^"]*)"\\s+"(?<http_x_forwarded_for>[^"]*)".*',
    "regularSpecs": [],
    "source":
    "ec2",
    "status":
    "ACTIVE",
    "userLogFormat":
    'log_format  main  \'$remote_addr - $remote_user [$time_local] "$request" \'\n\'$status $body_bytes_sent "$http_referer" \'\n\'"$http_user_agent" "$http_x_forwarded_for"\';',
}

syslog_custom_config_1 = {
    "id": "839e4882-52db-498b-90be-315a384be571",
    "confName": "syslog-config-01",
    "createdAt": "2023-01-30T02:58:36Z",
    "logType": "Syslog",
    "multilineLogParser": None,
    "processorFilterRegex": {
        "enable": False,
        "filters": [
        ]
    },
    "regularExpression": "<(?<pri>[0-9]{1,5})>1 (?<time>[^\\s]+) (?<msgid>([^\\s]+)|-) (?<appname>([^\\s]+)|-) (?<procid>([-0-9]+)|-) (?<msg>.+)",
    "regularSpecs": [
        {
            "key": "pri",
            "type": "text"
        },
        {
            "format": "%Y-%m-%dT%H:%M:%S.%6N%z",
            "key": "time",
            "type": "date"
        },
        {
            "key": "msgid",
            "type": "text"
        },
        {
            "key": "appname",
            "type": "text"
        },
        {
            "key": "procid",
            "type": "text"
        },
        {
            "key": "msg",
            "type": "text"
        }
    ],
    "status": "ACTIVE",
    "syslogParser": "CUSTOM",
    "timeKey": "time",
    "timeOffset": None,
    "timeRegularExpression": "",
    "userLogFormat": "<%pri%>1 %timestamp:::date-rfc3339% %msgid% %app-name% %procid% %msg%\\n",
    "userSampleLog": "<13>1 2022-10-11T15:37:45.436708+00:00 - ec2-user - -t ScriptName Hello World from ec2-3"
}
"""
App Log Ingestion Table
"id": "53da2dc5-aa5c-4e6a-bba0-761cbd446fb6",
"""
log_ingestion_data_1 = {
    "id": "039a1176-33c4-4ec7-8ea2-3245ae27b4b1",
    "appPipelineId": "d27b96a9-7b78-4fe1-94e6-3e42f57f4339",
    "confId": "339039e1-9812-43f8-9962-165e3adbc805",
    "createdAt": "2022-04-15T07:24:12Z",
    "groupId": "cc090e29-312e-418e-8b56-796923f9b6ed",
    "stackId": "",
    "stackName": "",
    "status": "ACTIVE",
    "tags": None,
}
#
log_ingestion_data_2 = {
    "id": "d8e6c7a6-4061-4a4a-864e-ef9a427d231d",
    "appPipelineId": "ab740668-fba3-4d86-879d-e9a5a446d69f",
    "confId": "e4c579eb-fcf2-4ddb-8226-796f4bc8a690",
    "createdAt": "2022-04-26T09:59:04Z",
    "sourceId": "cc090e29-312e-418e-8b56-796923f9b6ed",
    "sourceType": "S3",
    "stackId":
    "arn:aws:cloudformation:us-east-1:123456789012:stack/Solution-AppIngestion-S3-d8e6c/826d8c10-c547-11ec-9132-0efa7057993f",
    "stackName": "",
    "status": "ACTIVE",
    "tags": [],
    "updatedAt": "2022-04-26T10:19:46Z",
}

log_ingestion_data_3 = {
    "id": "d8e6c7a6-4061-4a4a-864e-0000003",
    "appPipelineId": "ab740668-fba3-4d86-879d-e9a5a446d69f",
    "confId": "e4c579eb-fcf2-4ddb-8226-796f4bc8a690",
    "createdAt": "2022-04-26T09:59:04Z",
    "sourceId": "9681daea-1095-44b5-8e11-40fa935f3aea",
    "sourceType": "S3",
    "stackId":
    "arn:aws:cloudformation:us-east-1:123456789012:stack/Solution-AppIngestion-S3-d8e6c/xxxx",
    "stackName": "",
    "status": "INACTIVE",
    "tags": [],
    "updatedAt": "2022-04-26T10:19:46Z",
}

log_ingestion_data_4 = {
    "id": "d8e6c7a6-4061-4a4a-864e-0000004",
    "appPipelineId": "ab740668-fba3-4d86-879d-e9a5a446d69f",
    "confId": "e4c579eb-fcf2-4ddb-8226-796f4bc8a690",
    "createdAt": "2022-04-26T09:59:04Z",
    "sourceId": "000000001-1095-44b5-8e11-40fa935f3aea",
    "sourceType": "S3",
    "stackId":
    "arn:aws:cloudformation:us-east-1:123456789012:stack/Solution-AppIngestion-S3-d8e6c/xxx",
    "stackName": "",
    "status": "ERROR",
    "tags": [],
    "updatedAt": "2022-04-26T10:19:46Z",
}

log_ingestion_data_5 = {
    "id": "d8e6c7a6-4061-4a4a-864e-0000004",
    "appPipelineId": "ab740668-fba3-4d86-879d-e9a5a446d69f",
    "confId": "e4c579eb-fcf2-4ddb-8226-796f4bc8a690",
    "createdAt": "2022-04-26T09:59:04Z",
    "sourceId": "000000001-1095-44b5-8e11-40fa935f3aea",
    "sourceType": "ASG",
    "stackName": "",
    "status": "ACTIVE",
    "tags": [],
    "updatedAt": "2022-04-26T10:19:46Z",
}
"""
App Log Instance Group Table
"""
instance_group_1 = {
    "id": {
        "S": "8a76e4b1-5164-491d-9991-05a579b42299"
    },
    "createdAt": {
        "S": "2022-03-17T07:48:55Z"
    },
    "groupName": {
        "S": "nginx-group"
    },
    "instanceSet": {
        "SS": [
            "i-0004b78389b5c7db3",
            "i-0fd07f9eeb8a45e83",
        ]
    },
    "status": {
        "S": "ACTIVE"
    },
}

instance_group_2 = {
    "id": {
        "S": "cc090e29-312e-418e-8b56-796923f9b6ed"
    },
    "createdAt": {
        "S": "2022-04-15T07:23:24Z"
    },
    "groupName": {
        "S": "reverse-test-01"
    },
    "instanceSet": {
        "SS": ["i-0fd07f9eeb8a45e83"]
    },
    "status": {
        "S": "ACTIVE"
    },
}

sqs_event_table_data = {
    "id": {
        "S": "8ee7adc9-addf-477c-9723-4bba519bf02a"
    },
    "action": {
        "S": "asyncAddInstancesToInstanceGroup"
    },
    "createdAt": {
        "S": "2022-11-11T07:49:44Z"
    },
    "groupId": {
        "S": "967489e4-c090-47b6-856b-192f9d96c14e"
    },
    "instanceSet": {
        "SS": [
            "i-0e0464d25bf022b05"
        ]
    },
    "region": {
        "S": "us-west-1"
    },
    "status": {
        "S": "DONE"
    },
    "updatedAt": {
        "S": "2022-11-11T07:49:44Z"
    }
}
