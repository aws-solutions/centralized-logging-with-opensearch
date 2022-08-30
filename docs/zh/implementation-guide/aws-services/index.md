# 构建 AWS 服务日志分析管道

Log Hub 支持通过日志分析管道将 AWS 服务日志摄取到 AOS。您可以使用 **Log Hub 网页控制台** 或通过 **独立 CloudFormation 模板**构建日志分析管道。

Log Hub 读取数据源、解析、清理或丰富、和摄取日志到 AOS 域进行分析。此外，该解决方案提供模板化的仪表板便于日志可视化。

!!! Important "重要"
    - AWS 托管服务必须与 Log Hub 位于同一区域。
    - 该解决方案将每天轮换索引，并且无法调整。
 
## 支持的 AWS Services

大多数 AWS 托管服务将日志输出到 Amazon CloudWatch Logs、Amazon S3、Amazon Kinesis Data Streams 或 Amazon Kinesis Firehose。

{%
include-markdown "include-supported-service-logs.md"
%}

Log Hub 中大多数受支持的 AWS 服务在创建日志分析管道时都提供了内置仪表板。在供应管道后，您可以转到 OpenSearch 查看仪表板。

在本章中，您将学习如何为以下 AWS 服务创建日志摄取并查看仪表板：

- [Amazon CloudTrail](cloudtrail.md)
- [Amazon S3](s3.md)
- [Amazon RDS/Aurora](rds.md)
- [Amazon CloudFront](cloudfront.md)
- [AWS Lambda](lambda.md)
- [Elastic Load Balancing](elb.md)
- [AWS WAF](waf.md)
- [Amazon VPC](vpc.md)
- [AWS Config](config.md)

