下表列出了支持的 AWS 服务和相应的功能。

| AWS Service | 日志类型 | 支持 OpenSearch Engine | 支持 Light Engine |
| ----------- | -------- |------------------ |  ---------- |
| AWS CloudTrail | N/A | 是 | 是 |
| Amazon S3 | [Access logs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/ServerLogs.html) | 是 | 否 |
| Amazon RDS/Aurora | [MySQL Logs](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_LogAccess.MySQL.LogFileSize.html) | 是 | 是 |
| Amazon CloudFront | [Standard access logs](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/AccessLogs.html) |  是 | 是 |
| Application Load Balancer | [Access logs](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-access-logs.html) | 是 | 是 |
| AWS WAF | [Web ACL logs](https://docs.aws.amazon.com/waf/latest/developerguide/logging.html) |  是 | 是 |
| AWS Lambda | N/A |  是 | 否 |
| Amazon VPC | [Flow logs](https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs.html) |  是 | 是 |
| AWS Config | N/A | 是 | 是 |