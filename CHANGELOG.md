# Release Notes

## 1.1.0

August 26, 2022

**What's New**

- Support the ingestion of VPC Flow logs with an optional dashboard template. [#14](https://github.com/awslabs/log-hub/issues/14){target="_blank"}
- Support the ingestion of AWS Config logs with an optional dashboard template. [#15](https://github.com/awslabs/log-hub/issues/15){target="_blank"}
- Add support for ingestion of sampled AWS WAF logs. [#16](https://github.com/awslabs/log-hub/issues/16){target="_blank"}
- Support of ingest AWS service logs from other AWS accounts in the same region. [#17](https://github.com/awslabs/log-hub/issues/17){target="_blank"}
- Support of ingest application logs from other AWS accounts in the same region. [#18](https://github.com/awslabs/log-hub/issues/18){target="_blank"}
- Launch the solution in an existing VPC. [#19](https://github.com/awslabs/log-hub/issues/19){target="_blank"}
- Add an article of how to deploy the solution with other region's Cognito User Pool. [#20](https://github.com/awslabs/log-hub/issues/20){target="_blank"}
- Add an article of how to deploy the solution with ADFS. [#21](https://github.com/awslabs/log-hub/issues/21){target="_blank"}
- Add support for ingesting EKS pod logs directly into OpenSearch  [#25](https://github.com/awslabs/log-hub/issues/25){target="_blank"}

**Update**

- Upgrade the Lambda runtime from nodejs12.X to newer version. You will not receive the Lambda runtime deprecation warning emails anymore.
- Upgrade the Lambda runtime from python3.6 to newer version.
- Upgrade the CDK version to CDK 2.36.0

**Bug Fixes**

- OpenSearch cluster details page now can show information for instances with gp3 type of EBS.

## 1.0.0

June 6, 2022

**What's New**

- Support of Amazon CloudTrail logs.
- Support of Amazon S3 Access logs.
- Support of Amazon RDS/Aurora MySQL logs (audit, general, error, slow query).
- Support of Amazon CloudFront standard logs.
- Support of AWS Lambda logs.
- Support of Application Load Balancer access logs.
- Support of AWS WAF logs.
- Support ingest logs from EC2 and EKS, including Apache HTTP Server, Nginx, Single-line Text, Multi-line Text, JSON format.
- Support ingest incremental logs from S3, including JSON and single-line text format.