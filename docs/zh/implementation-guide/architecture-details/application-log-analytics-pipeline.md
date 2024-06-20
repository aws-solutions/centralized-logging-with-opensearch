# 应用程序日志分析管道

使用 **日志通** 支持应用程序日志的日志分析，例如 Nginx/Apache HTTP 服务器日志或自定义应用程序日志。

!!! note "注意"
    使用 **日志通** 支持[跨账户日志摄取](../link-account/index.md)。如果您想从同一账户摄取日志，则**源**组中的资源将与您的 **日志通** 账户位于同一账户中。否则，它们将位于成员账户中。

## 来自 Amazon EC2 / Amazon EKS 的日志

使用 **日志通** 支持从 Amazon EC2 实例或 Amazon EKS 集群收集日志。工作流支持两种场景。

### 场景 1：使用 OpenSearch Engine

[![arch-app-log-pipeline]][arch-app-log-pipeline]
_EC2/EKS 的应用程序日志管道架构_

日志管道运行以下工作流程：

1. [Fluent Bit](https://fluentbit.io/) 作为底层日志代理，从应用程序服务器收集日志并将其发送到可选的[日志缓冲区](../applications/index.md#log-buffer)，或直接摄取到 OpenSearch 领域中。

2. 日志缓冲区触发 Lambda（日志处理器）运行。

3. 日志处理器读取和处理日志记录，并将日志摄取到 OpenSearch 领域中。

4. 未能处理的日志被导出到 Amazon S3 存储桶（备份存储桶）。

### 场景 2：使用Light Engine

[![arch-app-log-pipeline-lighengine]][arch-app-log-pipeline-lighengine]
_EC2/EKS 的应用程序日志管道架构_

日志管道运行以下工作流程：

1. Fluent Bit 作为底层日志代理，从应用程序服务器收集日志并将其发送到可选的日志缓冲区。
2. 日志缓冲区触发 Lambda，将对象从日志存储桶复制到暂存桶。
3. 日志处理器，AWS Step Functions，批处理处理暂存桶中存储的原始日志文件，将其转换为 Apache Parquet 格式，并根据包括时间和地区在内的标准自动对所有传入数据进行分区。

## 来自 Amazon S3 的日志

使用 **日志通** 支持从 Amazon S3 存储桶收集日志。工作流支持三种场景。

### 场景 1：使用 OpenSearch Engine（持续加载）

[![arch-app-log-s3-on-going-pipeline]][arch-app-log-s3-on-going-pipeline]
_S3 的应用程序日志管道架构_

日志管道运行以下工作流程：

1. 用户将日志上传到 Amazon S3 存储桶（日志存储桶）。

2. 创建新日志文件时，使用 S3 事件通知将事件通知发送到 Amazon SQS。

3. Amazon SQS 启动 AWS Lambda。

4. AWS Lambda 将对象从日志存储桶复制到暂存桶。

5. 日志处理器读取和处理日志记录，并将日志摄取到 OpenSearch 领域中。

6. 未能处理的日志被导出到 Amazon S3 存储桶（备份存储桶）。

### 场景 2：使用 OpenSearch Engine（一次性加载）

[![arch-app-log-s3-one-time-pipeline]][arch-app-log-s3-one-time-pipeline]
_S3 的应用程序日志管道架构_

日志管道运行以下工作流程：

1. 用户将日志上传到 Amazon S3 存储桶（日志存储桶）。

2. Amazon ECS 任务迭代日志存储桶中的日志。

3. Amazon ECS 任务将日志位置发送到 Amazon SQS 队列。

4. Amazon SQS 启动 AWS Lambda。

5. AWS Lambda 将对象从日志存储桶复制到暂存桶。

6. 日志处理器读取和处理日志记录，并将日志摄取到 OpenSearch 领域中。

7. 未能处理的日志被导出到 Amazon S3 存储桶（备份存储桶）。

### 场景 3：使用Light Engine（持续加载）

[![arch-app-log-s3-pipeline-lightengine]][arch-app-log-s3-pipeline-lightengine]
_S3 的应用程序日志管道架构_

日志管道运行以下工作流程：

1. 用户将日志上传到 Amazon S3 存储桶（日志存储桶）。

2. 创建新日志文件时，使用 S3 事件通知将事件通知发送到 Amazon SQS。

3. Amazon SQS 启动 AWS Lambda。

4. AWS Lambda 将对象从日志存储桶复制到暂存桶。

5. (5. 6. 7.) 日志处理器，AWS Step Functions，批处理处理暂存桶中存储的原始日志文件。它将它们转换为 Apache Parquet 格式，并根据包括时间和地区在内的标准自动对所有传入数据进行分区。

## 来自 Syslog 客户端的日志

!!! important "重要提示"

    1. 确保您的 Syslog 生成器/发送器的子网连接到 **日志通** 的**两个**私有子网。您需要使用 VPC [Peering 连接][peering-connection] 或 [Transit Gateway][tgw] 将这些 VPC 连接起来。
    2. 在架构图中的 NLB 与 ECS 容器一起只有在创建 Syslog 摄取时才会被提供，并且在没有 Syslog 摄取时会自动删除。

### 场景 1：使用 OpenSearch Engine

[![arch-syslog-pipeline]][arch-syslog-pipeline]
_Syslog 的应用程序日志管道架构_

日志管道运行以下工作流程：

1. Syslog 客户端（如 [Rsyslog][rsyslog]）将日志发送到集中式日志与 OpenSearch 的私有子网中的网络负载均衡器（NLB），NLB 将其路由到运行 Syslog 服务器的 ECS 容器。
2. [Fluent Bit](https://fluentbit.io/) 作为 ECS 服务中的底层日志代理来解析日志，并将其发送到可选的[日志缓冲区](../applications/index.md#log-buffer)，或直接摄取到 OpenSearch 领域中。
3. 日志缓冲区触发 Lambda（日志处理器）运行。
4. 日志处理器读取和处理日志记录，并将日志摄取到 OpenSearch 领域中。
5. 未能处理的日志被导出到 Amazon S3 存储桶（备份存储桶）。

### 场景 2：使用Light Engine

[![arch-syslog-pipeline-lightengine]][arch-syslog-pipeline-lightengine]
_Syslog 的应用程序日志管道架构_

日志管道运行以下工作流程：

1. Syslog 客户端（如 [Rsyslog][rsyslog]）将日志发送到集中式日志与 OpenSearch 的私有子网中的网络负载均衡器（NLB），NLB 将其路由到运行 Syslog 服务器的 ECS 容器。
2. [Fluent Bit](https://fluentbit.io/) 作为 ECS 服务中的底层日志代理来解析日志，并将其发送到日志缓冲区。
3. 创建新日志文件时，使用 S3 事件通知将事件通知发送到 Amazon SQS。
4. Amazon SQS 启动 AWS Lambda。
5. AWS Lambda 将对象从日志存储桶复制到暂存桶。
6. (6. 7. 8.) 日志处理器，AWS Step Functions，批处理处理暂存桶中存储的原始日志文件。它将它们转换为 Apache Parquet 格式，并根据包括时间和地区在内的标准自动对所有传入数据进行分区。


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
[arch-app-log-s3-on-going-pipeline]: ../../images/architecture/s3-source-on-going.svg
[arch-app-log-s3-one-time-pipeline]: ../../images/architecture/s3-source-one-time.svg
[arch-app-log-s3-pipeline-lightengine]: ../../images/architecture/s3-source-on-going-light-engine.png
[arch-syslog-pipeline]: ../../images/architecture/app-log-pipeline-syslog.svg
[arch-syslog-pipeline-lightengine]: ../../images/architecture/syslog_arch_light_engine.png
[peering-connection]: https://docs.aws.amazon.com/vpc/latest/peering/working-with-vpc-peering.html
[tgw]: https://docs.aws.amazon.com/vpc/latest/tgw/what-is-transit-gateway.html
[rsyslog]: https://www.rsyslog.com/
