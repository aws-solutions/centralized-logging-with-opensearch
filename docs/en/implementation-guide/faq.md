# Frequently Asked Questions

## General

**Q:  What is Log Hub solution?**<br>
Log Hub is an AWS Solution that simplifies the building of log analytics pipelines. It provides
to customers, as complementary of Amazon OpenSearch Service, capabilities to ingest and process both application logs
and AWS service logs without writing code, and create visualization dashboards from out-of-box templates. Log Hub automatically
assembles the underlying AWS services, and provides you a web console to manage log analytics pipelines.

**Q: What are the supported logs in this solution?**</br>
Log Hub supports both AWS service logs and EC2/EKS application logs. Refer to the [supported AWS services](./aws-services/index.md#supported-aws-services),
and the [supported application log formats and sources](./applications/index.md#supported-log-formats-and-sources) for more details.

**Q: Does Log Hub support ingesting logs from multiple AWS accounts?**<br>
Yes. Starting from v1.1.0, Log Hub supports ingesting AWS service logs and application logs from a different AWS account 
in the same region. For more information, see [cross-account ingestion](./link-account/index.md).

**Q: Does Log Hub support ingesting logs from multiple AWS Regions?**</br>
Currently, Log Hub does not automate the log ingestion from a different AWS Region. You need to ingest logs from other 
regions into pipelines provisioned by Log Hub. For AWS services which store the logs in S3 bucket, you can leverage 
the [S3 Cross-Region Replication](https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication.html)
to copy the logs to the Log Hub deployed region, and import incremental logs using the [manual mode](./aws-services/cloudfront.md#using-the-log-hub-console) by specifying the 
log location in the S3 bucket. For application logs on EC2 and EKS, you need to set up the networking (for example, Kinesis VPC endpoint, VPC Peering), 
install agents, and configure the agents to ingest logs to Log Hub pipelines.

**Q: What is the license of this solution?**</br>
This solution is provided under the [Apache-2.0 license](https://www.apache.org/licenses/LICENSE-2.0). It is a permissive free
software license written by the Apache Software Foundation. It allows users to use the software for any purpose, to distribute
it, to modify it, and to distribute modified versions of the software under the terms of the license, without concern for royalties.

**Q: How can I find the roadmap of this solution?**</br>
This solution uses GitHub project to manage the roadmap. You can find the roadmap [here](https://github.com/orgs/awslabs/projects/58){target='_blank'}.

**Q: How can I submit a feature request or bug report?**</br>
You can submit feature requests and bug report through the GitHub issues. Here are the templates for [feature request][github-fr]{target='_blank'}, [bug report][github-br]{target='_blank'}.

## Setup and configuration

**Q: Can I deploy Log Hub on AWS in any AWS Region?**</br>
Log Hub provides two deployment options: option 1 with Cognito User Pool, and option 2 with OpenID Connect. For 
option 1, customers can deploy the solution in AWS Regions where Amazon Cognito User Pool, AWS AppSync, Amazon Kinesis Data Firehose (optional) are available. 
For option 2, customers can deploy the solution in AWS Regions where AWS AppSync, Amazon Kinesis Data Firehose (optional) are available.
Refer to [supported regions for deployment](./considerations.md#regional-deployments) for more information.

**Q: What are the prerequisites of deploying this solution?**</br>
Log Hub does not provision Amazon OpenSearch clusters, and you need to import existing OpenSearch clusters through the web console. The cluster
must meet the requirements specified in [prerequisites](./domains/import.md#prerequisite).

**Q: Why do I need a domain name with ICP recordal when deploy the solution in AWS China Regions?**</br>
The Log Hub console is served via CloudFront distribution which is considered as an Internet information service. According
to the local regulations, any Internet information service must bind to a domain name with [ICP recordal](https://www.amazonaws.cn/en/support/icp/?nc2=h_l2_su).

**Q: What versions of OpenSearch does the solution work with?**</br>
Log Hub supports Amazon OpenSearch Service, with engine version Elasticsearch 7.10 and later, Amazon OpenSearch 1.0 and later.

**Q: Can I deploy the solution in an existing VPC?**</br>
Yes. You can either launch the solution with a new VPC or launch the solution with an existing VPC. When using an existing
VPC, you need to select the VPC and the corresponding subnets. Refer to [launch with Cognito User Pool](./deployment/with-cognito.md) or
[launch with OpenID Connect](./deployment/with-oidc.md) for more details.

## Pricing

**Q: How will I be charged and billed for the use of this solution?**</br>
The solution is free to use, and you are responsible for the cost of AWS services used while running this solution. 
You pay only for what you use, and there are no minimum or setup fees. Refer to the Log Hub [Cost](./cost.md) section for detailed cost estimation. 

**Q: Will there be additional cost for cross-account ingestion?**</br>
No. The cost will be same as ingesting logs within the same AWS account.

## Log Ingestion

**Q: What is the log agent used in the Log Hub solution?**</br>
Log Hub uses [AWS for Fluent Bit](https://github.com/aws/aws-for-fluent-bit), a distribution of [Fluent Bit](https://fluentbit.io/) maintained by AWS.
The solution uses this distribution to ingest logs from Amazon EC2 and Amazon EKS.

**Q: I have already stored the AWS service logs of member accounts in a centralized logging account. How should I create service log ingestion for member accounts?**</br>
In this case, you need to deploy the Log Hub solution in the centralized logging account, and ingest AWS service logs 
using the *Manual* mode from the logging account. Refer to this [guide](./aws-services/elb.md) for ingesting Application 
Load Balancer logs with *Manual* mode. You can do the same with other supported AWS services which output logs to S3.

**Q: Why there are some duplicated records in OpenSearch when ingesting logs via Kinesis Data Streams?**</br>
This is usually because there is no enough Kinesis Shards to handle the incoming requests. When threshold error occurs
in Kinesis, the Fluent Bit agent will [retry](https://docs.fluentbit.io/manual/administration/scheduling-and-retries) 
that [chunk](https://docs.fluentbit.io/manual/administration/buffering-and-storage). To avoid this issue, you need to estimate your log throughput and set a proper Kinesis shard number. Please refer to the 
[Kinesis Data Streams quotas and limits](https://docs.aws.amazon.com/streams/latest/dev/service-sizes-and-limits.html).
Log Hub provides a built-in feature to scale-out and scale-in the Kinesis shards, and it would take a couple of minutes 
to scale out to the desired number.

## Log Visualization

**Q. How can I find the built-in dashboards in OpenSearch?**</br>
Please refer to the [AWS Service Logs](./aws-services/index.md#supported-aws-services) and [Application Logs](./applications/index.md#supported-log-formats-and-sources) to 
find out if there is a built-in dashboard supported. You also need to turn on the *Sample Dashboard* option when creating
a log analytics pipeline. The dashboard will be inserted into the AOS under **Global Tenant**. You can switch to the 
Global Tenant from the top right coder of the OpenSearch Dashboards.

## Upgrades

**Q: How can I upgrade the solution?**</br>
You can use the latest CloudFormation template link to upgrade the Log Hub. Follow the upgrade steps [here](./upgrade.md).

**Q: Will I lose any data during the upgrading?**</br>
No. Upgrading will only update the Log Hub console, and it will not affect any existing log ingestion pipelines.

**Q: How long does the upgrade take?**</br>
It depends on the Log Hub versions. In most cases, the upgrade will take less than 30 minutes to complete.

**Q: Can I upgrade to the latest version from any version?**</br>
You can upgrade to the latest version from last two versions without changes. For example, you can upgrade from `v1.0.X` or `v1.1.X` to `v1.2.X`.
If you are not able to upgrade to the latest version, you may need to upgrade to some intermediate versions first.


[github-fr]: https://github.com/awslabs/log-hub/issues/new?assignees=&labels=feature-request%2Cneeds-triage&template=feature-request.yml&title=%28module+name%29%3A+%28short+issue+description%29
[github-br]: https://github.com/awslabs/log-hub/issues/new?assignees=&labels=bug%2Cneeds-triage&template=bug-report.yml&title=%28module+name%29%3A+%28short+issue+description%29