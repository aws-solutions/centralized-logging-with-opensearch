# Cost Estimation

!!! Important "Important"

    The following cost estimations are examples and may vary depending on your environment.


You will be responsible for the cost of the AWS services used when running the solution. The main factors affecting the solution cost include:

- Type of logs to be ingested
- Volume of logs to be ingested/processed
- Size of the log message
- Location of logs
- Additional features

As of this revision, the following examples demonstrate the cost estimation of 10/100/1000 GB daily log ingestion for running this solution with default settings in the US East (N. Virginia) Region. The total cost is composed of [**Amazon OpenSearch Cost**](#amazon-opensearch-cost), [**Processing Cost**](#processing-cost), [**Solution Console Cost**](#solution-console-cost) and [**Additional Features Cost**](#additional-features-cost).

## Amazon OpenSearch Cost

- **OD**: On Demand
- **AURI_1**: All Upfront Reserved Instance 1 Year
- **Tiering**: The days stored in each tier. For example, 7H + 23W + 60C indicates that the log is stored in hot tier for 7 days, warm tier for 23 days, and cold tier for 60 days.
- **Replica**: The number of shard replicas.

| Daily log Volume (GB) | Retention (days) | Tiering         | Replica | OD Monthly (USD) | AURI_1 Monthly  (USD) | Dedicated Master | Data Node      | EBS (GB) | UltraWarm Nodes | UltraWarm/Cold S3 Storage (GB) | OD cost per GB (USD) | AURI_1 cost per GB ($) |
| --------------------- | ---------------- | --------------- | ------- | ---------------- | --------------------- | ---------------- | -------------- | -------- | --------------- | ------------------------------ | -------------------- | ---------------------- |
| 10                    | 30               | 30H             | 0       | 216.28           | 158.54                | N/A              | c6g.large[2]   | 380      | N/A             | 0                              | 0.72093              | 0.52847                |
| 10                    | 30               | 30H             | 1       | 289.35           | 223.94                | N/A              | m6g.large[2]   | 760      | N/A             | 0                              | 0.9645               | 0.74647                |
| 100                   | 30               | 7H + 23W        | 0       | 989.49           | 825.97                | m6g.large[3]     | m6g.large[2]   | 886      | medium[2]       | 0                              | 0.32983              | 0.27532                |
| 100                   | 30               | 7H + 23W        | 1       | 1295.85          | 1066.92               | m6g.large[3]     | m6g.large[4]   | 1772     | medium[2]       | 0                              | 0.43195              | 0.35564                |
| 100                   | 90               | 7H + 23W + 60C  | 0       | 1133.49          | 969.97                | m6g.large[3]     | m6g.large[2]   | 886      | medium[2]       | 8300                           | 0.12594              | 0.10777                |
| 100                   | 90               | 7H + 23W + 60C  | 1       | 1439.85          | 1210.92               | m6g.large[3]     | m6g.large[4]   | 1772     | medium[2]       | 8300                           | 0.15998              | 0.13455                |
| 100                   | 180              | 7H + 23W + 150C | 0       | 1349.49          | 1185.97               | m6g.large[3]     | m6g.large[2]   | 886      | medium[2]       | 17300                          | 0.07497              | 0.06589                |
| 100                   | 180              | 7H + 23W + 150C | 1       | 1655.85          | 1426.92               | m6g.large[3]     | m6g.large[4]   | 1772     | medium[2]       | 17300                          | 0.09199              | 0.07927                |
| 1000                  | 30               | 7H + 23W        | 0       | 6101.15          | 5489.48               | m6g.large[3]     | r6g.xlarge[6]  | 8856     | medium[15]      | 23000                          | 0.20337              | 0.18298                |
| 1000                  | 30               | 7H + 23W        | 1       | 8759.49          | 7635.8                | m6g.large[3]     | r6g.2xlarge[6] | 17712    | medium[15]      | 23000                          | 0.29198              | 0.25453                |
| 1000                  | 90               | 7H + 23W + 60C  | 0       | 8027.33          | 7245.45               | m6g.large[3]     | r6g.xlarge[6]  | 8856     | medium[15]      | 83000                          | 0.08919              | 0.0805                 |
| 1000                  | 90               | 7H + 23W + 60C  | 1       | 10199.49         | 9075.8                | m6g.large[3]     | r6g.2xlarge[6] | 17712    | medium[15]      | 83000                          | 0.11333              | 0.10084                |
| 1000                  | 180              | 7H + 23W + 150C | 0       | 9701.15          | 9089.48               | m6g.large[3]     | r6g.xlarge[6]  | 8856     | medium[15]      | 173000                         | 0.0539               | 0.0505                 |
| 1000                  | 180              | 7H + 23W + 150C | 1       | 12644.19         | 11420.86              | m6g.large[3]     | r6g.2xlarge[6] | 17712    | medium[15]      | 173000                         | 0.07025              | 0.06345                |

## Processing Cost

### Log ingestion through Amazon S3

This section is applicable to:

- AWS service logs including Amazon S3 access logs, CloudFront standard logs, CloudTrail logs (S3), Application Load Balancing access logs, WAF logs, VPC Flow logs (S3), AWS Config logs, Amazon RDS/Aurora logs, and AWS Lambda Logs.
- Application Logs that use Amazon S3 as data buffer.

Assumptions:

- The logs stored in Amazon S3 are in gzip format.
- A 4MB compressed log file in S3 is roughly 100 MB in raw log size.
- A Lambda with 1 GB memory takes about 26 seconds to process a 4 MB compressed log file, namely 260 milliseconds (ms) per MB raw logs.
- The maximum compressed log file size is 5 MB.
- Ingesting logs from S3 will incur SQS and S3 request fees which are very low, or usually within the free tier.

You have `N` GB raw log per day, and the daily cost estimation is as follows:

- Lambda Cost = 260 ms per MB x 1024 MB x `N` GB/day x $0.0000000167 per ms
- S3 Storage Cost = $0.023 per GB x `N `GB/day x 4% (compression)

The total monthly cost for ingesting AWS service logs is:

**Total Monthly Cost** = (Lambda Cost + S3 Storage Cost) x 30 days

| Daily Log Volume | Daily Lambda Cost (USD) | Daily S3 Storage Cost (USD) | Monthly Cost (USD) |
| ---------------- | ----------------------- | --------------------------- | ------------------ |
| 10               | 0.044                   | 0.009                       | 1.610              |
| 100              | 0.445                   | 0.092                       | 16.099             |
| 1000             | 4.446                   | 0.920                       | 160.986            |


For Amazon RDS/Aurora logs and AWS Lambda Logs that deliver to CloudWatch Logs, apart from the S3 and Lambda costs listed above, there is additional cost of using Kinesis Data Firehose (KDF) to subscribe to the CloudWatch Logs Stream and put them into an Amazon S3 bucket, and KDF is charging for a 5KB increments (less than 5KB per record is billed as 5KB).

Assuming Log size is 0.2 KB per record, then the daily KDF cost is estimated as below:

* Kinesis Data Firehose Cost = $0.029 per GB x `N` GB/day x (5KB/0.2 KB)

For example, for 1GB logs per day, the extra monthly cost of KDF is $21.75.

!!! important "Important"

    If you want to save cost charged by Kinesis Data Firehose, make sure you activate logs only when needed. For example, you can choose not to activate RDS general logs unless required.


### Logs ingestion through Amazon Kinesis Data Streams

This section is applicable to:

- AWS Services Logs including CloudFront real-time logs, CloudTrail logs (CloudWatch), and VPC Flow logs (CloudWatch).
- Application Logs that use Amazon KDS as data buffer


!!! Important "Important"

    The cost estimation does not include the logging cost of service. For example, CloudFront real-time logs are charged based on the number of log lines generated ($0.01 for every 1,000,000 log lines). There are also logs delivery to CloudWatch charges for CloudTrail and VPC Flow logs that enabled CloudWatch Logging. Please check the service pricing for more details.

The cost estimation is based on the following assumptions and facts:

- The average log message size is 1 KB.
- The daily log volume is `L` GB.
- The Lambda processor memory is 1024 MB.
- Every Lambda invocation processes 1 MB logs.
- One Lambda invocation processes one shard of Kinesis, and Lambda can scale up to more concurrent invocations to process multiple shards.
- The Lambda runtime to process log less than 5 MB is 500ms.
- 30% additional shards are provided to handle traffic jitter.
- One Kinesis shard intake log size is =  1 MB /second x 3600 seconds per hour x 24 hours x 0.7 = 60.48 GB/day.
- The desired Kinesis Shard number `S` is = Round_up_to_next_integer(Daily log volume `L` / 60.48).

Based on the above assumptions, here is the daily cost estimation formula:

- Kinesis Shard Hour Cost = $0.015 / shard hour x 24 hours per day x `S` shards
- Kinesis PUT Payload Unit Cost =  $0.014 per million units x 1 millions per GB x `L` GB per day
- Lambda Cost = $0.0000000167 per 1ms x 500 ms per invocation x 1,000 invocations per GB x `L` GB per day


**Total Monthly Cost** = (Kinesis Shard Hour Cost + Kinesis PUT Payload Unit Cost + Lambda Cost) x 30 days

| Daily Log Volume (GB) | Shards | Daily Kinesis Shard Hour Cost (USD) | Daily Kinesis PUT Payload Unit Cost (USD) | Daily Lambda Cost (USD) | Monthly Cost (USD) |
| --------------------- | ------ | --------------------------------- | --------------------------------------- | --------------------- | ---------------- |
| 10                    | 1      | 0.36                              | 0.14                                    | 0.0835                | 17.505           |
| 100                   | 2      | 0.72                              | 1.4                                     | 0.835                 | 88.65            |
| 1000                  | 17     | 6.12                              | 14                                      | 8.35                  | 854.1            |

## Solution Console Cost
A web console is created automatically when you deploy the solution. Assume the visits to the console are 3,000 times in a month (30 days), it will incur the following cost:

!!! note "Note"
    
    AWS Step Functions, Amazon CloudWatch, AWS Systems Manager, and Amazon EventBridge are all within free-tier. 

| Service | Monthly Cost (USD) | 
| --------------------- | ------ |
| Amazon CloudFront (1GB Data Transfer Out to Internet and 1GB Data Transfer Out to Origin) | 0.25 | 
| Amazon S3 | 0.027 |
| Amazon Cognito | 0.05 |
| AWS AppSync | 0.01 |
| Amazon DynamoDB | 1.00 |
| AWS Lambda | 0.132 |
| Total | 1.469 |


## Additional Features Cost

!!! note "Note"

    You will not be charged if you do not use the additional features in the Centralized Logging with OpenSearch console.

### Access Proxy

If you deploy the [Access Proxy](../domains/proxy.md) through Centralized Logging with OpenSearch, additional charges will apply. The total cost varies depending on the instance type and number of instances. As of this revision, the following are two examples for the cost estimation in the US East (N. Virginia) Region.

#### Example 1: Instance Type - t3.nano, Instance Number - 2
- EC2 cost = t3.nano 1Y RI All Upfront price $26.28 x 2 / 12 months = $4.38/month
- EBS Cost = EBS $0.1 GB/month x 8 GB x 2 = $1.6/month (The EBS attached to the EC2 instance is 8 GB)
- Elastic Load Balancer Cost = $0.0225 per ALB-hour x 720 hours/month = $16.2/month

**Total Monthly Cost** = $4.38 EC2 Cost + $1.6 EBS Cost + $16.2 Elastic Load Balancer Cost = **$22.18**


#### Example 2: Instance Type - t3.large, Instance Number - 2
- EC2 Cost = t3.large 1Y RI All Upfront $426.612 x 2  / 12 months  = $71.1/month
- EBS Cost = $0.1 GB/month x 8 GB x 2 = $1.6/month (The EBS attached to the EC2 instance is 8 GB)
- Elastic Load Balancer Cost = $0.0225 per ALB-hour x 720 hours/month = $16.2/month

**Total Monthly Cost** = $71.1 EC2 Cost + $1.6 EBS Cost + $16.2 Elastic Load Balancer Cost = **$88.9**

### Amazon OpenSearch Alarms

If you deploy the [alarms](../domains/alarms.md) through Centralized Logging with OpenSearch, the [Amazon CloudWatch Pricing](https://aws.amazon.com/cloudwatch/pricing/) will apply.

### Pipeline Alarms

| Log Type    | Alarm Count | Number of Standard Resolution Alarm Metrics | Monthly Cost per Ingestion per Pipeline |
| ----------- | ----------- | ------------------------------------------- | ----------------------------------------------- |
| AWS Service logs     | 4           | 0.1 USD                                     | 0.4 USD                                         |
| Application logs | 5           | 0.1 USD                                     | 0.5 USD                                         |

### Pipeline Monitoring

#### Log processor 

Assumptions:

- Deployment in the US East (N. Virginia) Region (us-east-1)
- A processor Lambda will be triggered every 60 seconds. The monthly metric put request number is `60 (requests) x 24 (hours) x 30 (days) = 43,200`
- PutMetricData: 43,200 requests x 0.00001 USD = 0.432 USD
- There are 4 metrics for **Service Logs** (**total logs, failed logs, loaded logs, excluded logs**) and 3 metrics (**total logs, failed logs, loaded logs**) for **Application logs**
- Amazon CloudWatch Logs API = PutMetricData x Number of Metrics
- Amazon CloudWatch Logs Metric = Number of Metrics x 0.3

| Log Type    | Monthly Metric Put Request Number | Number of Metrics | Amazon CloudWatch Logs API   | Amazon CloudWatch Logs Metric | Monthly Cost Per Source/Per Pipeline |
| ----------- |-----------------------------------| ----------------- | --------- | ---------- | ----------------------------------------------- |
| AWS Service logs    | 43,200                            | 4                 | 1.728 USD | 1.2 USD    | 2.928 USD                                       |
| Application logs | 43,200                            | 3                 | 1.296 USD | 0.9 USD    | 2.196 USD                                       |

#### Fluent Bit

Assumptions:

- Deployment in the US East (N. Virginia) Region (us-east-1)
- There are 7 metrics: `FluentBitOutputProcRecords`, `FluentBitOutputProcBytes`, `FluentBitOutputDroppedRecords`, `FluentBitOutputErrors`, `FluentBitOutputRetriedRecords`, `FluentBitOutputRetriesFailed`, `FluentBitOutputRetries`. For more information, refer to the [Monitoring](../monitoring.md#fluent-bit) section. 
- Number of Metrics requested: an interval of 60 seconds to put logs from Fluent Bit to Amazon CloudWatch (60 requests in an hour). Monthly put requests are `60 (requests) x 24 (hours) x 30 (days) = 43,200` 
- PutMetricData: 43,200 requests x 0.00001 USD = 0.432 USD
- CloudWatch Logs API = PutMetricData x Number of Metrics x Number of Instances
- CloudWatch Logs Metric = Number of Metrics x 0.3

 | Number of EC2 Instances / EKS Nodes | Amazon CloudWatch Logs API   | Amazon CloudWatch Logs Log Storage & Ingested (Calculated by [AWS Pricing Calculator](https://calculator.aws/#/addService/CloudWatch)) | Amazon CloudWatch Logs Metric | Monthly Cost Per Source/Per Pipeline |
 | ------------------------- | --------- |-----------------------------------------------------------------| ---------- | ----------------------------------------------- |
 | 1                         | 3.024 USD | 0.04 USD                                                        | 2.1 USD    | 5.164 USD                                       |
 | 10                        | 30.24 USD | 0.35 USD                                                        | 2.1 USD    | 32.69 USD                                       |
 | 100                       | 302.4 USD | 3.53 USD                                                        | 2.1 USD    | 308.03 USD                                      |

