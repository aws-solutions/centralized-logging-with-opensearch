# Cost Estimation

You will be responsible for the cost of using each of the AWS services when running the solution. As of June 2022, the main factors affecting the solution cost include:

- Type of logs to be ingested
- Volume of logs to be ingested/processed
- Location of logs
- Features of Log Hub

!!! important "Important"

    The cost estimation does not include the cost of Amazon OpenSearch cluster. All price models are calculated based on the AWS service price of US East (N. Virginia) region.

## AWS Service Logs

Depending on the log location, the cost of ingesting and processing service logs may vary. 

### Logs in Amazon S3

Assume AWS Services save logs to Amazon S3 every 5 minutes in a file, and the maximum log file size is 10 MB. 
The Lambda memory is 128 MB. The average Lambda runtime for processing a log file less than 5 MB is 500ms, and the average Lambda runtime for processing a log file less than 10 MB is 1000ms.

**Example: 1 GB/day**

You have 1 GB service log saved to S3 per day. The cost estimation is as follows: 

- Lambda Cost = 288 log file per day (3.47 MB per file) x 500 ms x $0.0000000021 per ms x 30 days = $0.009/month
- SQS Cost = 288 requests per day x 30 days = Within free tier
- S3 Storage Cost = $0.023 per GB x 30 GB / month = $0.69/month
- S3 Requests Cost = 288 requests per day x 30 days x $0.005 per 1000 requests = $0.04/month

The total monthly cost for ingesting AWS service logs is:

- **Total Monthly Charges** = $0.018 Lambda Cost + $0.69 S3 Storage Cost + $0.04 S3 Requests Cost = **$0.742**

**Example 2: 100 GB/day**

You have 100 GB service log saved to S3 per day. The cost estimation is as follows: 

- Lambda Cost = 10000 log file per day (10 MB per file) x 1000 ms x $0.0000000021 per ms x 30 days = $0.63/month
- SQS Cost = 10000 requests per day x 30 days = Within free tier
- S3 Storage Cost = $0.023 per GB x 3,000 GB / month = $69/month
- S3 Requests Cost = 10000 requests per day x 30 days x $0.005 per 1000 requests = $1.5/month

The total monthly cost for ingesting AWS service logs is as follows:

- **Total Monthly Charges** = $1.26 Lambda Cost + $69 S3 Storage Cost + $1.5 S3 Requests Cost = **$71.13**


## Application Logs

Depending on the log location, the cost of ingesting and processing application logs may vary.

### Ingest logs from Amazon EC2 or Amazon EKS

The cost estimation is based on the following assumptions and facts:

- 30% more shards are provided to handle traffic jitter. 
- The average log message size is 1 KB. 
- The Lambda processor memory is 1024 MB.
- Every Lambda invocation process 1 MB logs.
- One Lambda invocation simultaneously to process one shard of Kinesis. 
- The Lambda runtime to process log less than 5 MB is 500ms.

Based on the assumptions, one Kinesis shard intake log size is =  1 MB /second x 3600 seconds per hour x 24 hours x 0.7 = 60.48 GB/day

**Example: 1 GB/day**

You have 1 GB application log sending from EC2 or EKS to KDS, namely 1 million log message per day. 

- Kinesis Shard Hour Cost = $0.015 / shard hour x 24 hours per day x 30 days per month = $10.8/month
- Kinesis PUT Payload Unit Cost = $0.014 per million units * 1 millions per day * 30 days per month = $0.42/month
- Lambda Cost = $0.0000000167 per 1ms x 500 ms per invocation x  1,000 invocations per day (1 GB / 1 MB per invocation) x 30 days per month = $7.52/month

**Total Monthly Charges** = $10.8 Kinesis Shard Hour Cost + $4.2 Kinesis PUT Payload Unit Cost + $2.51 Lambda Cost = **$18.74**


**Example: 100 GB/day**

You have 100 GB application log sending from EC2 or EKS to KDS, namely 100 million log message per day.

- Kinesis Shard Hour Cost = $0.015 / shard hour x 2 shards x 24 hours per day x 30 days per month = $21.6/month
- Kinesis PUT Payload Unit Cost = $0.014 per million units * 100 millions per day * 30 days per month = $42/month
- Lambda Cost = $0.0000000167 per 1ms x 500 ms per invocation x  100,000 invocations per day (100 GB / 1 MB per invocation) x 30 days per month = $25.05/month

**Total Monthly Charges** = $183.6 Kinesis Shard Hour Cost + $420 Kinesis PUT Payload Unit Cost + $7,515 Lambda Cost = **$88.65**


## Access Proxy

If you deploy the [Access Proxy](./domains/proxy.md) through Log Hub, the following charges will apply.  

- EC2 Cost = t3.large 1Y RI All Upfront $426.612 x 2  / 12 months  = $71.1/month
- EBS Cost = $0.1 GB/month x 8 GB x 2 = $1.6/month
- Elastic Load Balancer Cost = $0.0225 per ALB-hour x 720 hours/month = $16.2/month

**Total Monthly Charges** = $71.1 EC2 Cost + $1.6 EBS Cost + $16.2 Elastic Load Balancer Cost = **$88.9**

## Alarms

If you deploy the [Alarms](./domains/alarms.md) through Log Hub, the [CloudWatch Price](https://aws.amazon.com/cloudwatch/pricing/) will apply.

