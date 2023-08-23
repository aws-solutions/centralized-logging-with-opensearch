# 构建 AWS 服务日志分析管道

日志通支持通过日志分析管道将 AWS 服务日志摄取到 Amazon OpenSearch Service。您可以使用 **日志通网页控制台** 或通过 **独立 CloudFormation 模板**构建日志分析管道。

日志通读取数据源、解析、清理或丰富、和摄取日志到 Amazon OpenSearch Service 域进行分析。此外，该解决方案提供模板化的仪表板便于日志可视化。

!!! Important "重要"
    - AWS 托管服务必须与日志通位于同一区域。
    - 默认情况下，该解决方案将每天轮换索引。您可以在**额外设置**中进行调整。
 
## 支持的 AWS Services

大多数 AWS 托管服务将日志输出到 Amazon CloudWatch Logs、Amazon S3、Amazon Kinesis Data Streams 或 Amazon Kinesis Firehose。

{%
include-markdown "include-supported-service-logs.md"
%}

日志通中大多数受支持的 AWS 服务在创建日志分析管道时都提供了内置仪表板。在供应管道后，您可以转到 OpenSearch 查看仪表板。

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

## 跨区域日志导入

在一个区域中部署使用 OpenSearch 的集中式日志功能后，该解决方案允许您处理来自另一个区域的服务日志。

!!! note "注意"
    对于 Amazon RDS/Aurora 和 AWS Lambda 服务日志，不支持此功能。

!!! important "重要"

     服务所在的区域被称为“源区域”，而部署有 OpenSearch 集中式日志控制台的区域被称为“日志区域”。

对于 Amazon CloudTrail，您可以创建一个新的日志跟踪，将日志发送到日志区域的 S3 存储桶中，并且您可以在列表中找到 CloudTrail。要了解如何创建新的跟踪，请参阅[创建跟踪][cloudtrail]。

对于其他将日志存储在 S3 存储桶中的服务，您可以手动将日志传输到日志区域的 S3 存储桶中（例如，使用 S3 跨区域复制功能）。

您可以按照以下步骤实施跨区域日志记录：

1. 将另一个区域中的服务日志位置设置为日志区域（例如 Amazon WAF），或使用 [跨区域复制 (CRR)][crr] 将日志从源区域自动复制到日志区域。

2. 在解决方案控制台中，选择左侧导航窗格中的 **AWS 服务日志**，然后选择 **创建一个管道**。

3. 在 **选择 AWS 服务** 区域，从列表中选择一个服务，然后选择 **下一步**。

4. 在 **创建方法** 中，选择 **手动**，然后输入资源名称和 S3 日志位置参数，然后选择 **下一步**。

5. 根据需要设置 **OpenSearch 域** 和 **日志生命周期**，然后选择 **下一步**。

6. 如果需要，添加标签，然后选择 **下一步** 创建管道。

然后，您可以使用 OpenSearch 仪表板发现日志并查看仪表板。

[cloudtrail]: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-create-a-trail-using-the-console-first-time.html?icmpid=docs_console_unmapped
[crr]: https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-how-setup.html
