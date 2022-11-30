# Cost Estimation

!!! Important "Important"

    The cost estimation described in this section are just examples, which are calculated based on assumptions, and may vary in your environment. 


You will be responsible for the cost of the AWS services used when running the solution. As of October 2022, the main factors affecting the solution cost include:

- Type of logs to be ingested
- Volume of logs to be ingested/processed
- Size of the log message
- Location of logs
- Additional features

The following examples will demonstrate the cost estimation of 10/100/1000 GB daily log ingestion. The total cost is composed of [**Amazon OpenSearch Cost**](#amazon-opensearch-cost), [**Processing Cost**](#processing-cost), and [**Additional Features Cost**](#additional-features-cost). 

!!! Note "Note"
    
    All the cost estimation is based on the AWS service price in AWS N. Virginia Region (us-east-1). 

## Amazon OpenSearch Cost

- **OD**: On Demand
- **AURI_1**: All Upfront Reserved Instance 1 Year
- **Tiering**: The days stored in each tier. For example, 7H + 23W + 60C indicates that the log is stored in hot tier for 7 days, warm tier for 23 days, and cold tier for 60 days.
- **Replica**: The number of shard replicas.

| Daily log Volume (GB)	 | Retention (days)	 | Tiering	         | Replica	 | OD Monthly ($)	| AURI_1 Monthly  ($)	| Dedicated Master	 | Data Node	      | EBS (GB)	 | UltraWarm Nodes	   | UltraWarm/Cold S3 Storage (GB)	 | OD cost per GB ($)	 | AURI_1 cost per GB ($)	 |
|------------------------|-------------------|------------------|----------|-------------------|-----------------|-----------|-------------|--------------------------|-----------------|---------------------|-------------------------|-------------------------|
| 10	                    | 30	               | 30H	             | 0	       | 216.28	        | 158.54	        | N/A	              | c6g.large[2]	   | 380	      | N/A	        | 0	                       | 0.72093	            | 0.52847	                |
| 10	                    | 30	               | 30H	             | 1	       | 289.35	        | 223.94	        | N/A	              | m6g.large[2]	   | 760	      | N/A	        | 0	                       | 0.9645	             | 0.74647	                |
| 100	                   | 30	               | 7H + 23W	        | 0	       | 989.49	| 825.97	| m6g.large[3]	     | m6g.large[2]	   | 886	      | medium[2]	  | 0	                       | 0.32983	            | 0.27532	                |
| 100	                   | 30	               | 7H + 23W	        | 1	       | 1295.85	| 1066.92	| m6g.large[3]	     | m6g.large[4]	   | 1772	     | medium[2]	  | 0	                       | 0.43195	            | 0.35564	                |
| 100	                   | 90	               | 7H + 23W + 60C	  | 0	       | 1133.49	| 969.97	| m6g.large[3]	     | m6g.large[2]	   | 886	      | medium[2]	  | 8300	                    | 0.12594	            | 0.10777	                |
| 100	                   | 90	               | 7H + 23W + 60C	  | 1	       | 1439.85	| 1210.92	| m6g.large[3]	     | m6g.large[4]	   | 1772	     | medium[2]	  | 8300	                    | 0.15998	            | 0.13455	                |
| 100	                   | 180	              | 7H + 23W + 150C	 | 0	       | 1349.49	| 1185.97	| m6g.large[3]	     | m6g.large[2]	   | 886	      | medium[2]	  | 17300	                   | 0.07497	            | 0.06589	                |
| 100	                   | 180	              | 7H + 23W + 150C	 | 1	       | 1655.85	| 1426.92	| m6g.large[3]	     | m6g.large[4]	   | 1772	     | medium[2]	  | 17300	                   | 0.09199	            | 0.07927	                |
| 1000	                  | 30	               | 7H + 23W	        | 0	       | 6101.15	| 5489.48	| m6g.large[3]	     | r6g.xlarge[6]	  | 8856	     | medium[15]	 | 23000	                   | 0.20337	            | 0.18298	                |
| 1000	                  | 30	               | 7H + 23W	        | 1	       | 8759.49	| 7635.8	| m6g.large[3]	     | r6g.2xlarge[6]	 | 17712	    | medium[15]	 | 23000	                   | 0.29198	            | 0.25453	                |
| 1000	                  | 90	               | 7H + 23W + 60C	  | 0	       | 8027.33	| 7245.45	| m6g.large[3]	     | r6g.xlarge[6]	  | 8856	     | medium[15]	 | 83000	                   | 0.08919	            | 0.0805	                 |
| 1000	                  | 90	               | 7H + 23W + 60C	  | 1	       | 10199.49	| 9075.8	| m6g.large[3]	     | r6g.2xlarge[6]	 | 17712	    | medium[15]	 | 83000	                   | 0.11333	            | 0.10084	                |
| 1000	                  | 180	              | 7H + 23W + 150C	 | 0	       | 9701.15	| 9089.48	| m6g.large[3]	     | r6g.xlarge[6]	  | 8856	     | medium[15]	 | 173000	                  | 0.0539	             | 0.0505	                 |
| 1000	                  | 180	              | 7H + 23W + 150C	 | 1	       | 12644.19	| 11420.86	| m6g.large[3]	     | r6g.2xlarge[6]	 | 17712	    | medium[15]	 | 173000	                  | 0.07025	            | 0.06345	                |

## Processing Cost

### AWS Service Logs

Depending on the log location, the cost of ingesting and processing service logs may vary. 

#### Logs in Amazon S3

!!! note "Note"

    Ingesting AWS service logs from S3 will incur SQS and S3 request fees which are very low, usually within the AWS Free Tier.

Here are the assumptions:

- AWS Services save logs to Amazon S3 every 5 minutes in gzip format (most of AWS services output logs in gzip). 
- A 4MiB compressed log file in S3 is roughly 100MiB in raw log size.
- A Lambda with 1GB memory takes about 26 seconds to process a 4MiB log file, namely 260 ms per MiB raw logs. 
- The maximum compressed log file size is 5MiB.

You have `N` GB raw log per day, and the daily cost estimation is as follows: 

- Lambda Cost = 260 ms per MiB x 1024 MiB x `N` GB/day x $0.0000000167 per ms
- S3 Storage Cost = $0.023 per GB x `N `GB/day x 4% (compression)

The total monthly cost for ingesting AWS service logs is:

**Total Monthly Cost** = (Lambda Cost + S3 Storage Cost) x 30 days

| Daily Log Volume | Daily Lambda Cost ($) | Daily S3 Storage Cost ($) | Monthly Cost ($) |
| ---------------- | ------------------- | ----------------------- | --------- |
| 10               | 0.044               | 0.009                   | 1.610     |
| 100              | 0.445               | 0.092                   | 16.099    |
| 1000             | 4.446               | 0.920                   | 160.986   |


### Application Logs

!!! important "Important"

    If you have multiple log formats (index), you need to make cost estimation for each of them.

Depending on the log location, and the [Log Buffer](./applications/index.md#log-buffer), the cost of ingesting and 
processing application logs may vary. 

There is no additional cost when you ingest data from log agents to the OpenSearch domain directly. However,  it is recommended to use Log Buffer because it can help to aggregate logs and protect OpenSearch clusters from overwhelming during peak hours. If you have small volume of logs and you are very confident that the size of the OpenSearch clusters have the capacity to ingest logs during peak hours, you can go without the Log Buffer.

#### Log ingestion through Amazon S3

The cost estimation is based on the following assumptions and facts:

- The average log message size is 1 KB.
- The daily log volume is `L` GB.
- The Lambda processor memory is 1024 MiB.
- The log agent deliveries logs to Amazon S3 when it hits the Buffer size (50 MiB) or Buffer interval (60 seconds) thresholds. The condition satisfied first triggers data delivery to Amazon S3.
- The compression rate of Gzip format is 20%. 
- The Lambda runtime to process log less than 10 MiB is 1000ms.
- Each log file will encounter one S3 PUT request to upload the log file, and one S3 GET request to read the log file.
- The daily number of files `N` saved on Amazon S3 = Max(`L` GB per day x 1024 / 50 MiB, 24 hours x 60 seconds/hour)
- The daily volume of files `V` saved on Amazon S3 = `L` GB per day x 20% compression rate

Base on the above assumptions, here is the daily cost estimation formula:

- Amazon S3 storage Cost = $0.023 per GB x daily volume of files `V`
- Amazon S3 request Cost = ($0.005 per 1000 requests + $0.0004 per 1000 requests) x daily number of files `N` / 1000
- Lambda Cost = $0.0000000167 per 1ms x 1000 ms per invocation x daily number of files `N`

**Total Monthly Cost** = (Lambda Cost + S3 Storage Cost + S3 request Cost) x 30 days

| Daily Log Volume (GB) | Daily Number of files | Daily S3 Storage Cost ($) | Daily S3 Request Cost ($) | Daily Lambda Cost ($) | Monthly Cost ($) |
| --------------------- | --------------------- | ------------------------- | ------------------------- | --------------------- | ---------------- |
| 10                    | 1,440                 | 0.046                     | 0.008                     | 0.024                 | 2.335            |
| 100                   | 2,048                 | 0.460                     | 0.011                     | 0.034                 | 15.158           |
| 1000                  | 20,480                | 4.600                     | 0.111                     | 0.342                 | 151.578          |


#### Log ingestion through Amazon Kinesis Data Streams

The cost estimation is based on the following assumptions and facts:

- The average log message size is 1 KB.
- The daily log volume is `L` GB.
- The Lambda processor memory is 1024 MiB.
- Every Lambda invocation processes 1 MiB logs.
- One Lambda invocation processes one shard of Kinesis, and Lambda can scale up to more concurrent innovations to process multiple shards. 
- The Lambda runtime to process log less than 5 MiB is 500ms.
- 30% additional shards are provided to handle traffic jitter.
- One Kinesis shard intake log size is =  1 MiB /second x 3600 seconds per hour x 24 hours x 0.7 = 60.48 GB/day.
- The desired Kinesis Shard number `S` is = Round_up_to_next_integer(Daily log volume `L` / 60.48).

Based on the above assumptions, here is the daily cost estimation formula:

- Kinesis Shard Hour Cost = $0.015 / shard hour x 24 hours per day x `S` shards
- Kinesis PUT Payload Unit Cost =  $0.014 per million units x 1 millions per GB x `L` GB per day
- Lambda Cost = $0.0000000167 per 1ms x 500 ms per invocation x 1,000 invocations per GB x `L` GB per day

**Total Monthly Cost** = (Kinesis Shard Hour Cost + Kinesis PUT Payload Unit Cost + Lambda Cost) x 30 days

| Daily Log Volume (GB) | Shards | Daily Kinesis Shard Hour Cost ($) | Daily Kinesis PUT Payload Unit Cost ($) | Daily Lambda Cost ($) | Monthly Cost ($) |
| --------------------- | ------ | ----------------------------- | ----------------------------------- | ----------------- | --------- |
| 10                    | 1      | 0.36                          | 0.14                                | 0.0835            | 17.505    |
| 100                   | 2      | 0.72                          | 1.4                                 | 0.835             | 88.65     |
| 1000                  | 17     | 6.12                          | 14                                  | 8.35              | 854.1     |

## Additional Features Cost

!!! note "Note"

    You will not be charged if you choose not to use the additional features in the Log Hub console.

### Access Proxy

If you deploy the [Access Proxy](./domains/proxy.md) through Log Hub, the following charges will apply.  

The cost estimation is based on the following assumptions and facts:

- Proxy module provisioned 2 x t3.large instances.
- 1 year all upfront reserved instances pricing model applies.
- The 1 year all upfront reserved instances for t3.large instance is $426.612/year.
- The EBS attached to the EC2 instance is 8 GB.

Based on the above assumptions, here is the monthly cost estimation formula:

- EC2 Cost = EC2 $426.612 x 2 / 12 months  = $71.1/month
- EBS Cost = EBS $0.1 GB/month x 8 GB x 2 = $1.6/month
- Elastic Load Balancer Cost = $0.0225 per ALB-hour x 720 hours/month = $16.2/month

**Total Monthly Cost** = $71.1 EC2 Cost + $1.6 EBS Cost + $16.2 Elastic Load Balancer Cost = **$88.9**

### Alarms

If you deploy the [Alarms](./domains/alarms.md) through Log Hub, the [CloudWatch Price](https://aws.amazon.com/cloudwatch/pricing/) will apply.

