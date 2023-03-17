下表列出了支持的 AWS 服务和相应的功能。

| AWS Service | 日志类型 | 日志位置 | 自动摄取 | 内置仪表板 |
| ----------- | -------- |------------------ |  ---------- |  ---------- |
| Amazon CloudTrail | N/A | S3 | 是 | 是 |
| Amazon S3 | [Access logs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/ServerLogs.html) | S3 | 是 | 是 |
| Amazon RDS/Aurora | [MySQL Logs](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_LogAccess.MySQL.LogFileSize.html) | CloudWatch Logs | 是 | 是 |
| Amazon CloudFront | [Standard access logs](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/AccessLogs.html) | S3 | 是 | 是 |
| Application Load Balancer | [Access logs](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-access-logs.html) | S3 | 是 | 是 |
| AWS WAF | [Web ACL logs](https://docs.aws.amazon.com/waf/latest/developerguide/logging.html) | S3 | 是 | 是 |
| AWS Lambda | N/A | CloudWatch Logs | 是 | 是 |
| Amazon VPC | [Flow logs](https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs.html) | S3 | 是 | 是 |
| AWS Config | N/A | S3 | 是 | 是 |

* **自动摄取**: 该解决方案自动检测资源的日志位置，然后读取日志。
* **内置仪表板**: 指定 AWS 服务的开箱即用仪表板。 该解决方案将自动将仪表板引入 Amazon OpenSearch Service。