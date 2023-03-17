# Build AWS Service Log Analytics Pipelines

Centralized Logging with OpenSearch supports ingesting AWS service logs into Amazon OpenSearch Service through log analytics pipelines, which you can build using the **Centralized Logging with OpenSearch web console** or via a **standalone CloudFormation template**. 

Centralized Logging with OpenSearch reads the data source, parse, cleanup/enrich and ingest logs into Amazon OpenSearch Service domains for analysis. Moreover, the solution provides templated dashboards to facilitate log visualization.

!!! Important "Important"
    - AWS managed services must be in the same region as Centralized Logging with OpenSearch. To ingest logs from different AWS regions, we recommend using [S3 cross-region replication](https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication.html#crr-scenario).
    - The solution will rotate the index on a daily basis, and cannot be adjusted.
 
## Supported AWS Services

Most of AWS managed services output logs to Amazon CloudWatch Logs, Amazon S3, Amazon Kinesis Data Streams or Amazon Kinesis Firehose. 

{%
include-markdown "include-supported-service-logs.md"
%}

Most of supported AWS services in Centralized Logging with OpenSearch offers built-in dashboard when creating the log analytics pipelines. You go to the OpenSearch Dashboards to view the dashboards after the pipeline being provisioned.

In this chapter, you will learn how to create log ingestion and dashboards for the following AWS services:

- [Amazon CloudTrail](cloudtrail.md)
- [Amazon S3](s3.md)
- [Amazon RDS/Aurora](rds.md)
- [Amazon CloudFront](cloudfront.md)
- [AWS Lambda](lambda.md)
- [Elastic Load Balancing](elb.md)
- [AWS WAF](waf.md)
- [Amazon VPC](vpc.md)
- [AWS Config](config.md)

