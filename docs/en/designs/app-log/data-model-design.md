# Application Log Analytics Data Model Design

## Overview

This part uses Amazon DynamoDB as the backend NoSQL database. This document is about the Data Model Design for **Application Log Analytics** module. 

### Entity Relationship Diagram

![er-model](../../images/design-diagram/app-log-er-diagram.png)

#### LogConf Table

LogConf table stores information about the Application log configuration by this solution, such as log type, log path.

The data attributes are listed as below:

| Attribute name     | Type   | Description                                 | Comments                    |
| ------------------ | ------ | ------------------------------------------- | --------------------------- |
| id                 | String | Unique ID of a configuration                | Partition key               |
| confName           | String | The name of the configuration name          |                             |
| createdDt          | String | creation time                               |                             |
| logPath            | String | Log file path                               |                             |
| logType            | String | Json, Regex, Nginx, Apache, MultiLineText   |                             |
| multilineLogParser | String | JAVA_SPRING_BOOT                            |                             |
| regularExpression  | String | Regular expressions                         |                             |
| regularSpec        | String | Field type definition after regular parsing |                             |
| status             | String | ACTIVE, INACTIVE                            | INACTIVE means delete state |
| userLogFormat      | String | Log format                                  |                             |
| updatedDt          | String | The last time the data was updated          |                             |

#### InstanceGroup Table

InstanceGroup table stores information about the instance and grouping relationship information by this solution, such as log type.

The data attributes are listed as below:

| Attribute name | Type   | Description                                                                                         | Comments                    |
| -------------- | ------ | --------------------------------------------------------------------------------------------------- | --------------------------- |
| id             | String | Unique ID of a group                                                                                | Partition key               |
| groupName      | String | The name of the log group. the name must be unique, and can only contains lower case letters and -. |                             |
| createdDt      | String | Creation time                                                                                       |                             |
| instanceSet    | String | List of instance ids                                                                                |                             |
| status         | String | ACTIVE, INACTIVE                                                                                    | INACTIVE means delete state |
| updatedDt      | String | The last time the data was updated                                                                  |                             |

#### InstanceMeta Table

InstanceMeta table stores information about the instance ingestion by this solution.

The data attributes are listed as below:

| Attribute name       | Type   | Description                                  | Comments      |
| -------------------- | ------ | -------------------------------------------- | ------------- |
| id                   | String | Unique ID of a configuration                 | Partition key |
| createdDt            | String | Creation time                                |               |
| intanceId            | String | The EC2 instance id                          |               |
| appPipelineId String |        | The Partition key of the AppPipeline table   |               |
| logAgent             | Map    | sub-field: agentName: FluentBit              |               |
|                      |        | sub-field: version: 1.8.2                    |               |
| confId               | String | The Partition key of the LogConf table       |               |
| groupId              | String | The Partition key of the InstanceGroup table |               |
| status               | String | ACTIVE, INACTIVE                             |               |
| updatedDt            | String | The last time the data was updated           |               |

#### LogAgentStatus Table

LogAgentStatus table stores information about the status of Fluent Bit installation by this solution.

The data attributes are listed as below:

| Attribute name | Type   | Description                        | Comments      |
| -------------- | ------ | ---------------------------------- | ------------- |
| intanceId      | String | the EC2 instance Id                | Partition key |
| createdDt      | String | creation time                      |               |
| id             | String | the Command Id                     |               |
| status         | String | Not_Installed, Online, Offline     |               |
| updatedDt      | String | The last time the data was updated |               |

#### AppPipeline Table

AppPipeline table stores information about Application Log Pipeline by this solution.

The data attributes are listed as below:

| Attribute name | Type   | Description                                                                      | Comments      |
| -------------- | ------ | -------------------------------------------------------------------------------- | ------------- |
| id             | String | Unique ID of a pipeline                                                          | Partition key |
| createdDt      | String | creation time                                                                    |               |
| aosParas       | Map    | the Command Id                                                                   |               |
|                |        | sub-field: opensearchArn, type: String                                           |               |
|                |        | sub-field: domainName, type: String                                              |               |
|                |        | sub-field: indexPrefix, type: String                                             |               |
|                |        | sub-field: warmLogTransition, type: Number                                       |               |
|                |        | sub-field: coldLogTransition, type: Number                                       |               |
|                |        | sub-field: logRetention, type: Number                                            |               |
| kdsParas       | Map    | sub-field: kdsArn, type: String                                                  |               |
|                |        | sub-field: streamName, type:String                                               |               |
|                |        | sub-field: enableAutoScaling, type:Boolean, True, False; In UI, we use yes or no |               |
|                |        | sub-field: startShardNumber, type:Number                                         |               |
|                |        | sub-field: maxShardNumber, type:Number                                           |               |
|                |        | sub-field: regionName, type:String                                               |               |
|                |        | sub-field:engine, type:String                                                    |               |
| tags           | Map    | sub-field: key-value, type:String                                                |               |
| status         | String | CREATING, DELETING, ERROR, INACTIVE, ACTIVE                                      |               |
| updatedDt      | String | The last time the data was updated                                               |               |

#### AppLogIngestion Table

AppLogIngestion table is used to the information about Application Log Ingestion by this solution.

The data attributes are listed as below:

| Attribute name | Type   | Description                                                                                                    | Comments      |
| -------------- | ------ | -------------------------------------------------------------------------------------------------------------- | ------------- |
| id             | String | Unique ID of a pipeline                                                                                        | Partition key |
| createdDt      | String | creation time                                                                                                  |               |
| confId         | String | The Partition key of the LogConf table                                                                         |               |
| sourceType     | String | EC2,EKS, S3                                                                                                    |               |
| sourceId       | String | If EC2 then sourceId is groupId; If EKS then sourceId is EKSClusterId; If S3 then sourceId is S3LogSourceInfo; |               |
| groupId        | String | The Partition key of the InstanceGroup table                                                                   |               |
| stackId        | String | The Cloudformation stack ID for ingesting application logs from the S3 bucket or K8s pod.                      |               |
| stackName      | String | The Cloudformation stack Name for ingesting application logs from the S3 bucket or K8s pod.                    |
| appPipelineId  | String | The Partition key of the AppPipeline table                                                                     |               |
| tags           | Map    | Sub-field: key-value, type:String                                                                              |               |
| status         | String | CREATING, DELETING, ERROR, INACTIVE, ACTIVE                                                                    |               |
| updatedDt      | String | The last time the data was updated                                                                             |               |

#### EKSClusterLogSource Table

EKSClusterLogSource table stores information about imported EKS Cluster by this solution.

The data attributes are listed as below:

| Attribute name  | Type   | Description                                                                                                           | Comments      |
| --------------- | ------ | --------------------------------------------------------------------------------------------------------------------- | ------------- |
| id              | String | Unique ID of a pipeline                                                                                               | Partition key |
| createdDt       | String | creation time                                                                                                         |               |
| aosDomainId     | String | The Partition key of the Cluster table                                                                                |               |
| region          | String | The region to which the imported EKS cluster belongs                                                                  |               |
| accountId       | String | The account to which the imported EKS cluster belongs                                                                 |               |
| eksClusterName  | String | The Partition key of the InstanceGroup table                                                                          |               |
| eksClusterArn   | String | The imported EKS Cluster ARN.                                                                                         |               |
| cri             | String | The K8s Container runtime : containerd,docker.                                                                        |               |
| subnetIds       | String | The EKS Cluster Subnets                                                                                               |               |
| vpcId           | Map    | The EKS Cluster vpcId                                                                                                 |               |
| eksClusterSGId  | String | The EKS Cluster security group                                                                                        |               |
| oidcIssuer      | String | OpenID Connect provider URL                                                                                           |               |
| endpoint        | String | The EKS Cluster API server endpoint                                                                                   |               |
| tags            | Map    | Sub-field: key-value, type:String                                                                                     |               |
| logAgentRoleArn | String | The ARN of the role corresponding to the service account of K8s, this role attaches write-related permissions to KDS. |               |
| status          | String | CREATING, DELETING, ERROR, INACTIVE, ACTIVE                                                                           |               |
| updatedDt       | String | The last time the data was updated                                                                                    |               |

#### LogAgentEKSDeploymentKind Table

The LogAgentEKSDeploymentKind table stores information about the deployment type of the log agent by this solution.

The data attributes are listed as below:

| Attribute name | Type   | Description                                        | Comments      |
| -------------- | ------ | -------------------------------------------------- | ------------- |
| id             | String | Unique ID of a pipeline                            | Partition key |
| createdDt      | String | creation time                                      |               |
| eksClusterId   | String | The Partition key of the EKSClusterLogSource table |               |
| deploymentKind | String | DaemonSet,Sidecar                                  |               |
| updatedDt      | String | The last time the data was updated                 |               |

#### S3LogSource Table

The S3LogSource table stores information about which log source is the S3 bucket by this solution.

The data attributes are listed as below:

| Attribute name | Type   | Description                                | Comments      |
| -------------- | ------ | ------------------------------------------ | ------------- |
| id             | String | Unique ID of a pipeline                    | Partition key |
| createdDt      | String | creation time                              |               |
| region         | String | The region to which the iS3 bucket belongs |               |
| accountId      | String | The account to which the S3 bucket belongs |               |
| s3Name         | String | The S3 bucket name for log storage         |               |
| s3Prefix       | String | The S3 prefix for log storage              |               |
| archiveFormat  | String | The log format                             |               |
| tags           | Map    | Sub-field: key-value, type:String          |               |
| updatedDt      | String | The last time the data was updated         |               |
