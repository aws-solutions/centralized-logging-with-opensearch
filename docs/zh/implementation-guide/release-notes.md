# 更新记录

## 1.1.0

2022年8月26日

**新增**

- 支持 VPC Flow Logs 日志摄取，和可选的仪表板模板. [#14](https://github.com/awslabs/log-hub/issues/14){target="_blank"}
- 支持 AWS Config 日志摄取，和可选的仪表板模板. [#15](https://github.com/awslabs/log-hub/issues/15){target="_blank"}
- 支持 AWS WAF 日志采样摄取. [#16](https://github.com/awslabs/log-hub/issues/16){target="_blank"}
- 支持从相同区域的不同账户摄取 AWS 服务日志到 Log Hub. [#17](https://github.com/awslabs/log-hub/issues/17){target="_blank"}
- 支持从相同区域的不同账户摄取应用日志到 Log Hub. [#18](https://github.com/awslabs/log-hub/issues/18){target="_blank"}
- 启动时支持选择已有的 VPC. [#19](https://github.com/awslabs/log-hub/issues/19){target="_blank"}
- 增加使用其他区域的 Cognito User Pool 进行 Log Hub 部署的手册. [#20](https://github.com/awslabs/log-hub/issues/20){target="_blank"}
- 增加如何使用 ADFS 进行 Log Hub 部署的手册. [#21](https://github.com/awslabs/log-hub/issues/21){target="_blank"}
- 增加支持将 EKS 中的应用日志直接写入到 OpenSearch 中. [#25](https://github.com/awslabs/log-hub/issues/25){target="_blank"}

**更新**

- 将 Lambda 运行时从 nodejs12.X 升级到更新版本。 您将不会再收到 Lambda 运行时弃用警告电子邮件。
- 将 Lambda 运行时从 python3.6 升级到更新版本。
- 将 CDK 版本升级到 CDK 2.36.0。

**Bug 修复**

- OpenSearch 集群详细信息页面现在可以显示具有 gp3 类型 EBS 的实例的信息。

## 1.0.0

2022年6月6日

**新增**

- 支持 Amazon CloudTrail 日志.
- 支持 Amazon S3 访问日志.
- 支持 Amazon RDS/Aurora MySQL 日志 (audit, general, error, slow query).
- 支持 Amazon CloudFront standard logs.
- 支持 AWS Lambda 日志.
- 支持 Application Load Balancer 访问日志.
- 支持 AWS WAF 日志.
- 支持从 EC2，EKS 中摄取日志, 包括 Apache HTTP Server, Nginx, 单行文本, 多行文本, JSON 格式.
- 支持从 S3 摄取增量日志，包括 JSON 和单行文本格式。
