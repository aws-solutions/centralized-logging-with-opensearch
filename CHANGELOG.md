# Release Notes

## 1.2.0
November 30, 2022

**What's New**

- Your now have two more options to buffer logs when you create application pipeline. One is to use S3 as buffer layer that supports large throughput and minute-level latency, another is to send logs to your AOS domain directly without buffering. [#43](https://github.com/awslabs/log-hub/issues/43){target="_blank"}
- Support ingesting syslog from servers that could forward syslog in TCP or UDP protocol. We provide log parsers for RFC5424 and RFC3164 format, also allow you to define custom parser. [#41](https://github.com/awslabs/log-hub/issues/41){target="_blank"}
- Support filtering log before ingestion, you can define filters on the UI directly. [#38](https://github.com/awslabs/log-hub/issues/38){target="_blank"}
- Support creating instance group based on Amazon EC2 Auto Scaling Group(ASG), any auto-scaled instance will be automatically included into instance group. [#44](https://github.com/awslabs/log-hub/issues/44){target="_blank"}
- Support editing existing instance group, you can add or remove instance in an instance group. [#45](https://github.com/awslabs/log-hub/issues/45){target="_blank"}
- You now have the flexibility to specify a time zone for your logs. [#42](https://github.com/awslabs/log-hub/issues/42){target="_blank"}
- You now can choose a field parsed from your log to be the time key for your logs. [#54](https://github.com/awslabs/log-hub/issues/54){target="_blank"}
- You now can deploy the solution in Africa (Cape Town), Asia Pacific (Hong Kong), Europe (Milan), Middle East (Bahrain) regions. [#37](https://github.com/awslabs/log-hub/issues/37){target="_blank"}

**Update**

- Update the log agent Fluent Bit from v1.9.3 to v1.9.9.

**Bug Fixes**

- Fix the Fluent-Bit K8S filter crash issue when deployed in Amazon EKS.
- Fix the S3 prefix issue for VPC Flow logs.
- Fix the automatic VPC Peering Connection issue between the solution's private subnets and other subnets without explicit route table. [#55](https://github.com/awslabs/log-hub/issues/55){target="_blank"}

## 1.1.0

August 26, 2022

**What's New**

- Support the ingestion of VPC Flow logs with an optional dashboard template. [#14](https://github.com/awslabs/log-hub/issues/14){target="_blank"}
- Support the ingestion of AWS Config logs with an optional dashboard template. [#15](https://github.com/awslabs/log-hub/issues/15){target="_blank"}
- Support the ingestion of sampled AWS WAF logs. [#16](https://github.com/awslabs/log-hub/issues/16){target="_blank"}
- Support ingesting AWS service logs from another AWS account in the same region. [#17](https://github.com/awslabs/log-hub/issues/17){target="_blank"}
- Support ingesting application logs from another AWS account in the same region. [#18](https://github.com/awslabs/log-hub/issues/18){target="_blank"}
- Launch the solution in an existing VPC. [#19](https://github.com/awslabs/log-hub/issues/19){target="_blank"}
- Add an article of how to deploy the solution with other region's Cognito User Pool. [#20](https://github.com/awslabs/log-hub/issues/20){target="_blank"}
- Add an article of how to deploy the solution with ADFS. [#21](https://github.com/awslabs/log-hub/issues/21){target="_blank"}
- Support ingesting EKS pod logs directly into OpenSearch. [#25](https://github.com/awslabs/log-hub/issues/25){target="_blank"}

**Update**

- Upgrade the Lambda runtime from nodejs12.X to newer version. You will not receive the Lambda runtime deprecation warning emails anymore.
- Upgrade the Lambda runtime from python3.6 to newer version.
- Upgrade the CDK version to CDK 2.36.0

**Bug Fixes**

- OpenSearch cluster details page now can display information for instances with gp3 type of EBS.

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
- Support ingesting logs from EC2 and EKS, including Apache HTTP Server, Nginx, Single-line Text, Multi-line Text, JSON format.
- Support ingesting incremental logs from S3, including JSON and single-line text format.