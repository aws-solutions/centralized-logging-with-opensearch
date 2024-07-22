The following table lists the supported AWS services and the corresponding features.

| AWS Service | Log Type | OpenSearch Engine Support | Light Engine Support |
| ----------- | -------- |------------------ |  ---------- |
| AWS CloudTrail | N/A | Yes | Yes |
| Amazon S3 | [Access logs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/ServerLogs.html) | Yes | No |
| Amazon RDS/Aurora | [MySQL Logs](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_LogAccess.MySQL.LogFileSize.html) | Yes | Yes |
| Amazon CloudFront | [Standard access logs](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/AccessLogs.html), [real-time logs](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/real-time-logs.html) | Yes | Yes |
| Application Load Balancer | [Access logs](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-access-logs.html) | Yes | Yes |
| AWS WAF | [Web ACL logs](https://docs.aws.amazon.com/waf/latest/developerguide/logging.html) | Yes | Yes |
| AWS Lambda | N/A | Yes | No |
| Amazon VPC | [Flow logs](https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs.html)| Yes | Yes |
| AWS Config | N/A | Yes | No |

The solution supports detects the log location of the resource automatically, reads the logs, and then ingests them into the log anlaytics engines. The solution also
provides out-of-the-box dashboard templates for all supported AWS service. It will automatically ingest into the log anlytics engine. You go to the OpenSearch Dashboards or Grafana to view the dashboards after the pipeline being provisioned.