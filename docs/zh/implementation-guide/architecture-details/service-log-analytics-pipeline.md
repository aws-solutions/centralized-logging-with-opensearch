# 服务日志分析管道

**日志通** 支持对 AWS 服务的日志进行分析，例如 Amazon S3 访问日志和应用程序负载均衡器访问日志。有关受支持的 AWS 服务的完整列表，请参阅 [支持的 AWS 服务](../aws-services/index.md#supported-aws-services)。

此解决方案使用不同的工作流摄取不同的 AWS 服务日志。

!!! note "注意"
    使用 **日志通** 支持[跨账户日志摄取](../link-account/index.md)。如果您想从另一个 AWS 账户摄取日志，则架构图中**源**组中的资源将位于成员账户中。

## 通过 Amazon S3 收集日志

许多 AWS 服务支持直接将日志传送到 Amazon S3，或通过其他服务传送。工作流支持三种场景：

### 场景 1：直接将日志传送到 Amazon S3（OpenSearch Engine）

在此场景中，服务直接将日志发送到 Amazon S3。此架构适用于以下日志源：

- Amazon S3 访问日志
- Amazon CloudFront 标准日志
- AWS CloudTrail 日志（传送到 Amazon S3）
- 应用程序负载均衡器访问日志
- AWS WAF 日志
- VPC 流日志（传送到 Amazon S3）
- AWS Config 日志

[![arch-service-pipeline-s3]][arch-service-pipeline-s3]
_基于 Amazon S3 的服务日志管道架构_

### 场景 2：通过 Kinesis Data Firehose 将日志传送到 Amazon S3（OpenSearch Engine）

在此场景中，服务无法直接将其日志放置到 Amazon S3 中。日志被发送到 Amazon CloudWatch，并且使用 Kinesis Data Firehose（[KDF]）订阅来自 CloudWatch 日志组的日志，然后将日志放入 Amazon S3。此架构适用于以下日志源：

- Amazon RDS/Aurora 日志
- AWS Lambda 日志

[![arch-service-pipeline-kdf-to-s3]][arch-service-pipeline-kdf-to-s3]
_基于 Amazon S3（通过 KDF）的服务日志管道架构_

日志管道运行以下工作流程：

1. AWS 服务日志存储在 Amazon S3 存储桶（日志存储桶）中。
2. 创建新日志文件时，使用 [S3 事件通知][s3-events] 将事件通知发送到 Amazon SQS。
3. Amazon SQS 启动日志处理器 Lambda 运行。
4. 日志处理器读取和处理日志文件。
5. 日志处理器将日志摄取到 Amazon OpenSearch Service 中。
6. 未能处理的日志被导出到 Amazon S3 存储桶（备份存储桶）。

对于跨账户摄取，AWS 服务将日志存储在成员账户的 Amazon S3 存储桶中，其他资源保留在中央日志账户中。

### 场景 3：直接将日志传送到 Amazon S3（Light Engine）

在此场景中，服务直接将日志发送到 Amazon S3。此架构适用于以下日志源：

- AWS CloudTrail 日志（传送到 Amazon S3）
- Amazon RDS/Aurora 日志
- Amazon CloudFront 标准日志
- AWS WAF 日志（传送到 Amazon S3）
- 应用程序负载均衡器日志
- VPC 流日志（传送到 Amazon S3）

[![arch-service-pipeline-s3-lightengine]][arch-service-pipeline-s3-lightengine]
_基于 Amazon S3 的服务日志管道架构_

日志管道运行以下工作流程：

1. AWS 服务日志存储在 Amazon S3 存储桶（日志存储桶）中。
2. 创建新日志文件时，使用 S3 事件通知将事件通知发送到 Amazon SQS。
3. Amazon SQS 启动 AWS Lambda。
4. AWS Lambda 将对象从日志存储桶复制到暂存桶。
5. 日志处理器，AWS Step Functions，批处理处理暂存桶中存储的原始日志文件。它将它们转换为 Apache Parquet 格式，并根据包括时间和地区在内的标准自动对所有传入数据进行分区。

## 通过 Amazon Kinesis Data Streams 收集日志

一些 AWS 服务支持将日志传送到 Amazon Kinesis Data Streams。工作流支持两种场景：

### 场景 1：直接将日志传送到 Kinesis Data Streams（OpenSearch Engine）

在此场景中，服务直接将日志流式传输到 Amazon Kinesis Data Streams。此架构适用于以下日志源：

- Amazon CloudFront 实时日志

[![arch-service-pipeline-kds]][arch-service-pipeline-kds]
_基于 Amazon KDS 的服务日志管道架构_

!!! important "警告"

    此解决方案不支持 CloudFront 实时日志的跨账户摄取。

### 场景 2：通过订阅将日志传送到 Kinesis Data Streams（OpenSearch Engine）

在此场景中，服务将日志传送到 CloudWatch 日志组，然后 CloudWatch Logs 将日志实时流式传送到 Kinesis Data Streams 作为订阅目标。此架构适用于以下日志源：

- AWS CloudTrail 日志（传送到 CloudWatch 日志组）
- VPC 流日志（传送到 CloudWatch 日志组）

[![arch-service-pipeline-cwl-to-kds]][arch-service-pipeline-cwl-to-kds]
_基于 Kinesis Data Streams 订阅的服务日志管道架构_

日志管道运行以下工作流程：

1. AWS 服务日志被流式传输到 Kinesis Data Stream 中。
2. KDS 启动日志处理器 Lambda 运行。
3. 日志处理器处理并将日志摄取到 Amazon OpenSearch Service 中。
4. 未能处理的日志被导出到 Amazon S3 存储桶（备份存储桶）。

对于跨账户摄取，AWS 服务将日志存储在成员账户的 Amazon CloudWatch 日志组中，其他资源保留在中央日志账户中。

[s3log]: https://docs.aws.amazon.com/AmazonS3/latest/userguide/ServerLogs.html
[alblog]: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-access-logs.html
[s3]: https://aws.amazon.com/s3/
[s3-events]: https://docs.aws.amazon.com/AmazonS3/latest/userguide/NotificationHowTo.html
[cloudfront]: https://aws.amazon.com/cloudfront/
[cognito]: https://aws.amazon.com/cognito/
[appsync]: https://aws.amazon.com/appsync/
[lambda]: https://aws.amazon.com/lambda/
[dynamodb]: https://aws.amazon.com/dynamodb/
[systemsmanager]: https://aws.amazon.com/systemmanager/
[stepfunction]: https://aws.amazon.com/stepfunctions/
[kds]: https://aws.amazon.com/kinesis/data-streams/
[kdf]: https://aws.amazon.com/kinesis/data-firehose/
[arch]: ../../images/architecture/arch.png
[arch-service-pipeline-s3]: ../../images/architecture/service-pipeline-s3.svg
[arch-service-pipeline-s3-lightengine]: ../../images/architecture/logs-in-s3-light-engine.drawio.svg
[arch-service-pipeline-kdf-to-s3]: ../../images/architecture/service-pipeline-kdf-to-s3.svg
[arch-service-pipeline-cw]: ../../images/architecture/service-pipeline-cw.svg
[arch-service-pipeline-kds]: ../../images/architecture/service-pipeline-kds.svg
[arch-service-pipeline-cwl-to-kds]: ../../images/architecture/service-pipeline-cwl-to-kds.svg
[arch-app-log-pipeline]: ../../images/architecture/app-log-pipeline-ec2-eks.svg
[arch-app-log-pipeline-lighengine]: ../../images/architecture/logs-from-amazon-ec2-eks-light-engine.drawio.png
[arch-syslog-pipeline]: ../../images/architecture/app-log-pipeline-syslog.svg
[arch-syslog-pipeline-lightengine]: ../../images/architecture/syslog_arch_light_engine.png
[peering-connection]: https://docs.aws.amazon.com/vpc/latest/peering/working-with-vpc-peering.html
[tgw]: https://docs.aws.amazon.com/vpc/latest/tgw/what-is-transit-gateway.html
[rsyslog]: https://www.rsyslog.com/
