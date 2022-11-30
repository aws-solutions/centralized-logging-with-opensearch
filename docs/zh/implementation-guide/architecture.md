使用默认参数部署此解决方案会在 AWS 云中构建以下环境。

[![arch]][arch]
图1: 解决方案架构图

此解决方案在您的 AWS 云账户中部署 AWS CloudFormation 模板并完成以下设置。

1. [Amazon CloudFront](https://aws.amazon.com/cloudfront) 分发托管在 [Amazon S3](https://aws.amazon.com/s3/) 存储桶中的前端 Web UI 资源。

2. [Amazon Cognito 用户池](https://aws.amazon.com/cognito) 或 OpenID 连接器 (OIDC) 可提供身份认证。

3. [AWS AppSync](https://aws.amazon.com/appsync) 提供后端 GraphQL API。

4. [Amazon DynamoDB](https://aws.amazon.com/dynamodb) 将解决方案相关信息存储为后端数据库。

5. [AWS Lambda](https://aws.amazon.com/lambda) 与其它 AWS 服务交互，处理管理日志管道或日志代理的核心逻辑，并获取 DynamoDB 表中更新的信息。

6. [AWS Step Functions](https://aws.amazon.com/step-functions) 按需协调一组预定义堆栈的 [AWS CloudFormation](https://aws.amazon.com/cloudformation) 部署用于日志管道管理。日志管道堆栈部署单独的 AWS 资源，用于收集和处理日志，并将它们摄取到 [Amazon OpenSearch Service](https://aws.amazon.com/opensearch-service) 中以进行进一步分析和可视化。

7. [服务日志管道](#AWS-服务日志分析管道) 或[应用程序日志管道](#应用日志分析管道) 通过 Log Hub 控制台按需创建。

8. [AWS Systems Manager](https://aws.amazon.com/systems-manager) 和 [Amazon EventBridge](https://aws.amazon.com/eventbridge) 用于管理从应用服务器收集日志的日志代理，例如为应用服务器安装日志代理（Fluent Bit）和监控代理的健康状态。

9. [Amazon EC2](https://aws.amazon.com/ec2/) 或 [Amazon EKS](https://aws.amazon.com/eks/) 安装 Fluent Bit 代理，并将日志数据上传到应用日志管道。

10. 应用程序日志管道读取、解析、处理应用程序日志并将它们摄取到 Amazon OpenSearch 中。

11. 服务日志管道读取、解析、处理 AWS 服务日志并将它们摄取到 Amazon OpenSearch 中。

此解决方案支持两种类型的日志管道：**AWS 服务日志分析管道** 和 **应用日志分析管道**。

## AWS 服务日志分析管道

Log Hub 支持 AWS 服务的日志分析，例如 Amazon S3 访问日志和 Application Load Balancer 访问日志。 有关支持的 AWS 服务的完整列表，请参阅 [支持的 AWS 服务日志](./aws-services/index.md#aws-services)。

AWS 服务将日志输出到不同的目的地，包括 Amazon S3 存储桶、CloudWatch 日志组、Kinesis Data Streams 和 Kinesis Firehose。 该解决方案使用不同的工作流程摄取这些日志。

!!! note "注意事项"
    Log Hub 支持[跨账户日志摄取](./link-account/index.md)。 如果您想从同一帐户摄取日志，**Sources** 组中的资源需要与您的 Log Hub 帐户位于同一帐户中。 否则，它们将位于另一个 AWS 账户中。

### Amazon S3 中的日志

有些 AWS 服务输出日志到 Amazon S3。Amazon S3 中的日志一般不用于实时分析。

[![arch-service-pipeline-s3]][arch-service-pipeline-s3]
图2: 分析存储于 S3 中的 AWS 服务日志架构

日志管道运行以下工作流：

1. AWS 服务将日志存储在 Amazon S3 存储桶（日志桶）中。

2. 创建新日志文件时会通过 [S3 事件通知][s3-events] 向 Amazon SQS 发送通知。

3. Amazon SQS 触发 Lambda（日志处理器）运行。

4. 日志处理器读取并处理日志文件。

5. 日志处理器将日志提取到 Amazon OpenSearch 中。

6. 处理失败的日志导出到 Amazon S3 存储桶（备份桶）。

对于跨账户的日志摄取, 如下图所示，AWS 服务日志将产生并且存放在当前账户的 s3 桶中，其余资源仍然在 Log Hub 的账户中。

### CloudWatch Logs 中的日志

某些服务输出日志到 Amazon CloudWatch 日志组。

[![arch-service-pipeline-cw]][arch-service-pipeline-cw]
图 3：用于分析 CloudWatch Logs 中的 AWS 服务日志架构

日志管道运行以下工作流：

1. AWS 服务将日志存储在 Amazon CloudWatch 日志组中。

2. CloudWatch 日志通过订阅流式传输到 Amazon Kinesis Data Firehose。

3. Amazon Kinesis Data Firehose 将日志保存到Amazon S3 桶（Log Bucket）。

4. 事件通知通过 [S3 事件通知][s3-events] 发送到 Amazon SQS。

5. SQS 触发 Lambda（日志处理器）运行。

6. 日志处理器读取并处理日志文件。

7. 日志处理器将日志提取到 Amazon OpenSearch 中。

8. 处理失败的日志导出到 Amazon S3 存储桶（备份桶）。

对于跨账户的日志摄取, 如下图所示，AWS 服务日志将产生并且存放在当前账户的 CloudWatch 中，其余资源仍然在 Log Hub 的账户中。

## 应用日志分析管道

Log Hub 支持对应用程序日志进行日志分析，例如 Nginx/Apache HTTP 服务器日志或自定义应用程序日志。

!!! note "注意事项"
    Log Hub 支持[跨账户日志摄取](./link-account/index.md)。 如果您想从同一帐户摄取日志，**Sources** 组中的资源需要与您的 Log Hub 帐户位于同一帐户中。 否则，它们将位于另一个 AWS 账户中。

### 来自 Amazon EC2 / Amazon EKS 的日志

[![arch-app-log-pipeline]][arch-app-log-pipeline]
图 4：应用程序日志分析架构

日志管道运行以下工作流：

1. [Fluent Bit](https://fluentbit.io/) 作为底层日志代理，从应用服务器收集日志并发送到可选的 [Log Buffer](./applications/index.md#log-buffer)，或直接摄取到 OpenSearch 域中。

2. Log Buffer 触发 Lambda（日志处理器）运行。

3. 日志处理器读取并处理日志记录并将日志摄取到AOS中。

4. 处理失败的日志导出到 Amazon S3 存储桶（Backup Bucket）。

### 来自 Syslog 客户端的日志

!!! important "重要"
    1. 请确保您的 Syslog 生成器/发送器的子网已连接到 Log Hub 的**两个**私有子网，以便可以提取日志，您需要使用 VPC [Peering Connection][peering-connection] 或 [Transit Gateway][tgw] 连接这些 VPC。
    2. 架构图中的 NLB 和 ECS 容器只会在您创建 syslog 摄取时提供，并在没有 syslog 摄取时自动删除。

[![arch-syslog-pipeline]][arch-syslog-pipeline]    
图 5：Syslog 的应用程序日志管道架构

1. Syslog 代理（如 [Rsyslog][rsyslog]）将日志发送到 Log Hub 私有子网中的网络负载均衡器 (NLB)。NLB 会将日志路由到特定的 Amazon Elastic Container Service (ECS) Fargate 服务。

2. [Fluent Bit](https://fluentbit.io/) 作为底层日志代理，从应用服务器收集日志并发送到可选的 [Log Buffer](./applications/index.md#log-buffer)，或直接摄取到 OpenSearch 域中。

3. Log Buffer 触发 Lambda（日志处理器）运行。

4. 日志处理器读取并处理日志记录并将日志摄取到AOS中。

5. 处理失败的日志导出到 Amazon S3 存储桶（Backup Bucket）。

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
[arch]: ../images/architecture/arch.svg
[arch-service-pipeline-s3]: ../images/architecture/service-pipeline-s3.svg
[arch-service-pipeline-cw]: ../images/architecture/service-pipeline-cw.svg
[arch-eks-pipeline]: ../images/architecture/eks-pipeline.svg
[arch-syslog-pipeline]: ../images/architecture/syslog-pipeline.svg
[arch-app-log-pipeline]: ../images/architecture/app-log-pipeline-ec2-eks.svg
[arch-eks-aos-pipeline]: ../images/architecture/eks-aos-pipeline.svg
[arch-syslog-pipeline]: ../images/architecture/app-log-pipeline-syslog.svg
[peering-connection]: https://docs.aws.amazon.com/vpc/latest/peering/working-with-vpc-peering.html
[tgw]: https://docs.aws.amazon.com/vpc/latest/tgw/what-is-transit-gateway.html
[rsyslog]: https://www.rsyslog.com/