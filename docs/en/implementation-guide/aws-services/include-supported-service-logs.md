The following table lists the supported AWS services and the corresponding features.

| AWS Service | Log Type | Log Location | Automatic Ingestion | Built-in Dashboard |
| ----------- | -------- |------------------ |  ---------- |  ---------- |
| Amazon CloudTrail | N/A | S3 | Yes | Yes |
| Amazon S3 | [Access logs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/ServerLogs.html) | S3 | Yes | Yes |
| Amazon RDS/Aurora | [MySQL Logs](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_LogAccess.MySQL.LogFileSize.html) | CloudWatch Logs | Yes | Yes |
| Amazon CloudFront | [Standard access logs](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/AccessLogs.html) | S3 | Yes | Yes |
| Application Load Balancer | [Access logs](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-access-logs.html) | S3 | Yes | Yes |
| AWS WAF | [Web ACL logs](https://docs.aws.amazon.com/waf/latest/developerguide/logging.html) | S3 | Yes | Yes |
| AWS Lambda | N/A | CloudWatch Logs | Yes | Yes |
| Amazon VPC | [Flow logs](https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs.html) | S3 | Yes | Yes |
| AWS Config | N/A | S3 | Yes | Yes |

* **Automatic Ingestion**: The solution detects the log location of the resource automatically and then reads the logs.
* **Built-in Dashboard**: An out-of-box dashboard for the specified AWS service. The solution will automatically ingest a dashboard into the Amazon OpenSearch Service.