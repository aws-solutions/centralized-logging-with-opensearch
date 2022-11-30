# Service Log Pipeline Component Design

## Overview

Service Log Analytics Pipeline, as one component of Log Hub solution, is used to collect logs for AWS services, process and ingest into Amazon OpenSearch Service (AOS). This document is to describe this component is designed.

Currently, this solution supports S3 Access Logs, CloudTrail Logs, ELB Logs, CloudFront Logs, RDS Logs, WAF Logs, Lambda Logs. To learn how to extend this solution to support more service logs, please check [Tutorial: Extend Service Logs](../tutorial-extend-service-log)


!!! info "Info"

    For more information about solution overall design, refer to [High Level Design](../solution/high-level-design.md).


## Component Design


### High-Level Architecture

Based on different [log destinations](#service-log-output-destination), Different architectures are used. 

- **Destination on Amazon S3**

    Normally the logs on Amazon S3 are not for real-time analysis. Currently, this solution supports CloudTrail logs, CloudFront Standard logs, Amazon S3 Access logs, Elastic Load Balancing (ELB) logs, VPC Flow logs, and Amazon Config logs.

    ![Service Pipeline (S3) Stack Architecture](../../images/architecture/service-pipeline-s3.png)

    The process is described as below:

    1. AWS Services store logs on Amazon S3 bucket

    2. A notification is sent to Amazon SQS when new log file is created

    3. Amazon SQS triggers the Lambda (Log processor) to run

    4. The Log processor read and processes the log file and ingest the logs into Amazon OpenSearch service.

    For cross-account log ingestion, the AWS Services store logs on Amazon S3 bucket in one account, and other resources remain in Log Hub's Account:

    ![Cross Account Service Pipeline (S3) Stack Architecture](../../images/architecture/service-pipeline-s3.png)

- **Destination on CloudWatch Logs**

    Some services can only choose Amazon CloudWatch Log Group as destination. Currently, this solution supports RDS logs and Lambda Logs

    ![Service Pipeline (CW) Stack Architecture](../../images/architecture/service-pipeline-cw.png)

    The process is described as below:

    1. AWS Services store logs on Amazon CloudWatch log group

    1. The CloudWatch logs is streaming to Amazon Kinesis Data Stream (KDS) via subscription. 

    1. KDS triggers the Lambda (Log processor) to run

    1. The Log processor read and processes the log records and ingest the logs into Amazon OpenSearch service.

    For cross-account log ingestion, the AWS Services store logs on Amazon CloudWatch log group in one account, and other resources remain in Log Hub's Account:
   
    ![Service Pipeline (CW) Stack Architecture](../../images/architecture/service-pipeline-cw.png)

### Process Design

To learn more information about how the detail process are designed, please refer to [**Process Design**](./process-design.md)


### API Design

A list of GraphQL APIs are built on AWS Appsync service to support service pipeline management from Log Hub Web Console.

To learn more information about how the backend APIs are designed, please refer to [**API Design**](./api-design.md)


### Data Model Design

This component uses Amazon DynamoDB as the backend NoSQL database to store information about the service log pipelines.

To learn more information about how the data model is designed, please refer to [**Data Model Design**](./data-model-design.md)


### CloudFormation Design

This component can be launched independently via CloudFormation without the Solution Web Console (UI).

The parameters in the CloudFormation template are listed as below:


| Parameter  | Default          | Description                                                  |
| ---------- | ---------------- | ------------------------------------------------------------ |
| Log Bucket Name | `<Requires input>` | The S3 bucket name which stores the service logs. |
| Log Bucket Prefix | `<Requires input>` | The S3 bucket path prefix which stores the service logs. |
| Engine Type | OpenSearch | The engine type of the OpenSearch. Select OpenSearch or Elasticsearch. |
| OpenSearch Domain Name | `<Requires input>` | The domain name of the Amazon OpenSearch cluster. |
| OpenSearch Endpoint | `<Requires input>` | The OpenSearch endpoint URL. e.g. `vpc-your_opensearch_domain_name-xcvgw6uu2o6zafsiefxubwuohe.us-east-1.es.amazonaws.com` |
| Index Prefix | `<requires input>` | The common prefix of OpenSearch index for the log. The index name will be <Index Prefix>-elb-<YYYY-MM-DD>. |
| Create Sample Dashboard | Yes | Whether to create a sample OpenSearch dashboard. |
| VPC ID | `<requires input>` | Select a VPC which has access to the OpenSearch domain. The log processing Lambda will be resides in the selected VPC. |
| Subnet IDs | `<requires input>` | Select at leasts two subnets which has access to the OpenSearch domain. The log processing Lambda will resides in the subnets. Please make sure the subnets has access to the Amazon S3 service. |
| Security Group ID | `<requires input>` | Select a Security Group which will be associated to the log processing Lambda. Please make sure the Security Group has access to the OpenSearch domain. |
| Number Of Shards | 5 | Number of shards to distribute the index evenly across all data nodes, keep the size of each shard between 10-50 GiB. |
| Number of Replicas | 1 | The number of days required to move the index into warm storage, this is only effecitve when the value is >0 and warm storage is enabled in OpenSearch. |
| Days to Warm Storage | 0 | Number of replicas for OpenSearch Index. Each replica is a full copy of an index. |
| Days to Cold Storage | 0 | The number of days required to move the index into cold storage, this is only effecitve when the value is >0 and cold storage is enabled in OpenSearch. |
| Days to Retain | 0 | The total number of days to retain the index, if value is 0, the index will not be deleted. |



## Appendix

### Service Log Output Destination


Most of AWS Services output logs to Amazon CloudWatch Logs or Amazon S3, and some output to Kinesis Data Streams or Kinesis Firehose. The following table is a sample list of AWS services and their log destinations.

| Service log destination | AWS Services |
| -- | -- |
| Amazon S3 | CloudTrail, S3 Access Log, CloudFront Standard Logs, ELB Access Log, VPC Flow Logs, WAF Log, Config Log |
| Amazon CloudWatch Logs | RDS, Lambda, Lambda@Edge, VPC Flow Logs, AppSync, API Gateway, WAF Log |
| Kinesis Firehose | WAF Log |
| Kinesis Data Streams | CloudFront Real-time logs, Amazon Pinpoint events |
