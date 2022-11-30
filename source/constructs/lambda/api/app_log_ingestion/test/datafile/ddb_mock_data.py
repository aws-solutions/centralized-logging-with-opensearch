# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
"""
App Pipeline Table
"""
s3_source_pipeline_data = {
    "id": "ab740668-fba3-4d86-879d-e9a5a446d69f",
    "aosParas": {
        "coldLogTransition": 0,
        "domainName": "loghub-aos-comp",
        "engine": "OpenSearch",
        "failedLogBucket": "loghub-loghubloggingbucket0fa53b76-ysyv4acbp8m7",
        "indexPrefix": "s3-as-source-dev-001",
        "logRetention": 3,
        "opensearchArn":
        "arn:aws:es:us-east-1:123456789012:domain/loghub-aos-comp",
        "opensearchEndpoint":
        "vpc-loghub-aos-comp-hphbroajo2om57yxvywp3qfheq.us-east-1.es.amazonaws.com",
        "vpc": {
            "privateSubnetIds":
            "subnet-0beacf91077d910a4,subnet-02ab80d72477b9b80",
            "publicSubnetIds": "",
            "securityGroupId": "sg-015f309fa344bf1ae",
            "vpcId": "vpc-0f0ec3719e2b45b9b",
        },
        "warmLogTransition": 0,
    },
    "createdDt": "2022-04-24T02:00:24Z",
    "error": "",
    "kdsParas": {
        "enableAutoScaling": False,
        "kdsArn":
        "arn:aws:kinesis:us-east-1:123456789012:stream/LogHub-AppPipe-ab740-Stream790BDEE4-UP3FCdPEQOBl",
        "maxShardNumber": 0,
        "osHelperFnArn":
        "arn:aws:lambda:us-east-1:123456789012:function:os_helper_fn",
        "regionName": "us-east-1",
        "startShardNumber": 2,
        "streamName": "LogHub-AppPipe-ab740-Stream790BDEE4-UP3FCdPEQOBl",
    },
    "kdsRoleArn":
    "arn:aws:iam::111111111:role/LogHub-EKS-Cluster-PodLog-DataBufferKDSRole7BCBC83-1II64RIV25JN3",
    "kdsRoleName":
    "LogHub-EKS-Cluster-PodLog-DataBufferKDSRole7BCBC83-1II64RIV25JN3",
    "stackId":
    "arn:aws:cloudformation:us-east-1:123456789012:stack/LogHub-AppPipe-ab740/4eab9b00-c372-11ec-9734-0e7d39abbad5",
    "status": "ACTIVE",
    "tags": [],
}
#"id": "039a1176-33c4-4ec7-8ea2-3245ae27b4b1",
ec2_source_pipeline_data = {
    "id": "d27b96a9-7b78-4fe1-94e6-3e42f57f4339",
    "aosParas": {
        "coldLogTransition": 0,
        "domainName": "loghub-aos-comp",
        "engine": "OpenSearch",
        "failedLogBucket": "loghub-loghubloggingbucket0fa53b76-ysyv4acbp8m7",
        "indexPrefix": "index-dev-01",
        "logRetention": 3,
        "opensearchArn":
        "arn:aws:es:us-east-1:123456789012:domain/loghub-aos-comp",
        "opensearchEndpoint":
        "vpc-loghub-aos-comp-hphbroajo2om57yxvywp3qfheq.us-east-1.es.amazonaws.com",
        "vpc": {
            "privateSubnetIds":
            "subnet-0beacf91077d910a4,subnet-02ab80d72477b9b80",
            "publicSubnetIds": "",
            "securityGroupId": "sg-015f309fa344bf1ae",
            "vpcId": "vpc-0f0ec3719e2b45b9b",
        },
        "warmLogTransition": 0,
    },
    "createdDt": "2022-04-14T13:32:36Z",
    "kdsRoleArn":
    "arn:aws:iam::111111111:role/LogHub-EKS-Cluster-PodLog-DataBufferKDSRole7BCBC83-1II64RIV25JN3",
    "kdsRoleName":
    "LogHub-EKS-Cluster-PodLog-DataBufferKDSRole7BCBC83-1II64RIV25JN3",
    "error": "",
    "kdsParas": {
        "enableAutoScaling": False,
        "kdsArn":
        "arn:aws:kinesis:us-east-1:123456789012:stream/LogHub-AppPipe-d27b9-Stream790BDEE4-oXbw9MVMUZho",
        "maxShardNumber": 0,
        "osHelperFnArn":
        "arn:aws:lambda:us-east-1:123456789012:function:os_helper_fn",
        "regionName": "us-east-1",
        "startShardNumber": 10,
        "streamName": "LogHub-AppPipe-d27b9-Stream790BDEE4-oXbw9MVMUZho",
    },
    "stackId":
    "arn:aws:cloudformation:us-east-1:123456789012:stack/LogHub-AppPipe-d27b9/59ddb120-bbf7-11ec-af5d-0e3a79ee7dd1",
    "status": "ACTIVE",
    "tags": [],
}
"""
App Log Source Table
"""
s3_source_data_1 = {
    "id": "9681daea-1095-44b5-8e11-40fa935f3aea",
    "archiveFormat": "json",
    "createdDt": "2022-04-24T01:57:55Z",
    "region": "us-east-1",
    "s3Name": "loghub-logs-123456789012",
    "s3Prefix": "nginx",
    "sourceType": "S3",
    "status": "ACTIVE",
    "tags": [],
}

s3_source_data_2 = {
    "id": "000000001-1095-44b5-8e11-40fa935f3aea",
    "archiveFormat": "text",
    "createdDt": "2022-04-24T01:57:55Z",
    "region": "us-east-1",
    "s3Name": "loghub-logs-123456789012",
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
    "createdDt":
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
    "createdDt":
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
"""
App Log Ingestion Table
"id": "53da2dc5-aa5c-4e6a-bba0-761cbd446fb6",
"""
log_ingestion_data_1 = {
    "id": "039a1176-33c4-4ec7-8ea2-3245ae27b4b1",
    "appPipelineId": "d27b96a9-7b78-4fe1-94e6-3e42f57f4339",
    "confId": "339039e1-9812-43f8-9962-165e3adbc805",
    "createdDt": "2022-04-15T07:24:12Z",
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
    "createdDt": "2022-04-26T09:59:04Z",
    "sourceId": "cc090e29-312e-418e-8b56-796923f9b6ed",
    "sourceType": "S3",
    "stackId":
    "arn:aws:cloudformation:us-east-1:123456789012:stack/LogHub-AppIngestion-S3-d8e6c/826d8c10-c547-11ec-9132-0efa7057993f",
    "stackName": "",
    "status": "ACTIVE",
    "tags": [],
    "updatedDt": "2022-04-26T10:19:46Z",
}

log_ingestion_data_3 = {
    "id": "d8e6c7a6-4061-4a4a-864e-0000003",
    "appPipelineId": "ab740668-fba3-4d86-879d-e9a5a446d69f",
    "confId": "e4c579eb-fcf2-4ddb-8226-796f4bc8a690",
    "createdDt": "2022-04-26T09:59:04Z",
    "sourceId": "9681daea-1095-44b5-8e11-40fa935f3aea",
    "sourceType": "S3",
    "stackId":
    "arn:aws:cloudformation:us-east-1:123456789012:stack/LogHub-AppIngestion-S3-d8e6c/xxxx",
    "stackName": "",
    "status": "INACTIVE",
    "tags": [],
    "updatedDt": "2022-04-26T10:19:46Z",
}

log_ingestion_data_4 = {
    "id": "d8e6c7a6-4061-4a4a-864e-0000004",
    "appPipelineId": "ab740668-fba3-4d86-879d-e9a5a446d69f",
    "confId": "e4c579eb-fcf2-4ddb-8226-796f4bc8a690",
    "createdDt": "2022-04-26T09:59:04Z",
    "sourceId": "000000001-1095-44b5-8e11-40fa935f3aea",
    "sourceType": "S3",
    "stackId":
    "arn:aws:cloudformation:us-east-1:123456789012:stack/LogHub-AppIngestion-S3-d8e6c/xxx",
    "stackName": "",
    "status": "ERROR",
    "tags": [],
    "updatedDt": "2022-04-26T10:19:46Z",
}

log_ingestion_data_5 = {
    "id": "d8e6c7a6-4061-4a4a-864e-0000004",
    "appPipelineId": "ab740668-fba3-4d86-879d-e9a5a446d69f",
    "confId": "e4c579eb-fcf2-4ddb-8226-796f4bc8a690",
    "createdDt": "2022-04-26T09:59:04Z",
    "sourceId": "000000001-1095-44b5-8e11-40fa935f3aea",
    "sourceType": "ASG",
    "stackName": "",
    "status": "ACTIVE",
    "tags": [],
    "updatedDt": "2022-04-26T10:19:46Z",
}
"""
App Log Instance Group Table
"""
instance_group_1 = {
    "id": {
        "S": "8a76e4b1-5164-491d-9991-05a579b42299"
    },
    "createdDt": {
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
    "createdDt": {
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
  "createdDt": {
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
  "updatedDt": {
    "S": "2022-11-11T07:49:44Z"
  }
}
