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

## Cross-region log ingestion

When you deploy Centralized Logging with OpenSearch in one Region, the solution allows you to process service logs from another Region.

!!! note "Note"
    For Amazon RDS/Aurora and AWS Lambda service logs, this feature is not supported.

!!! important "Important"

     The Region where the service resides is referred to as “Source Region”, while the Region where the Centralized Logging with OpenSearch console is deployed as “Logging Region”.

For Amazon CloudTrail, you can create a new trail which send logs into a S3 bucket in the Logging Region, and you can find the CloudTrail in the list. To learn how to create a new trail, please refer to [Creating a trail][cloudtrail]. 

For other services with logs located in S3 buckets, you can manually transfer logs (for example, using S3 Cross-Region Replication feature) to the Logging Region S3 bucket.

You can follow the steps below to implement Cross-Region Logging:

1. Set the service log location in another Region to be the Logging Region (such as Amazon WAF), or automatically copy logs from the Source Region to the Logging Region using [Cross-Region Replication (CRR)][crr].

2. In the solution console, choose **AWS Service Log** in the left navigation pane, and choose **Create a pipeline**.

3. In the **Select an AWS Service** area, choose a service in the list, and choose **Next**.

4. In **Creation Method**, choose **Manual**, then enter the resource name and S3 log location parameter, and choose **Next**.

5. Set **OpenSearch domain** and **Log Lifecycle** as needed, and choose **Next**.

6. Add tags if you need, and choose **Next** to create the pipeline.

Then you can use the OpenSearch dashboard to discover logs and view dashboards.

[cloudtrail]: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-create-a-trail-using-the-console-first-time.html?icmpid=docs_console_unmapped
[crr]: https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-how-setup.html

