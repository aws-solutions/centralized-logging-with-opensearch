使用默认参数部署此解决方案会在 AWS 云中构建以下环境。

[![arch]][arch]
图1: 解决方案架构图

此解决方案在您的 AWS 云账户中部署 AWS CloudFormation 模板并完成以下设置。

1. [Amazon CloudFront](https://aws.amazon.com/cloudfront) 分发托管在 [Amazon S3](https://aws.amazon.com/s3/) 存储桶中的前端 Web UI 资源。

2. 如果部署在海外区域，[Amazon Cognito 用户池](https://aws.amazon.com/cognito) 为后端提供身份验证；如果部署在中国区域，使用 OpenID 连接器 (OIDC)。

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

### Amazon S3 中的日志

有些服务输出日志到 Amazon S3。Amazon S3 中的日志一般不用于实时分析。

[![arch-service-pipeline-s3]][arch-service-pipeline-s3]
图2: 分析存储于 S3 中的 AWS 服务日志架构

日志管道运行以下工作流：

1. AWS 服务将日志存储在 Amazon S3 存储桶（日志桶）中。

2. 创建新日志文件时会通过 [S3 事件通知](https://docs.aws.amazon.com/AmazonS3/latest/userguide/NotificationHowTo.html) 向 Amazon SQS 发送通知。

3. Amazon SQS 触发 Lambda（日志处理器）运行。

4. 日志处理器读取并处理日志文件并将日志摄取到AOS。

5. 处理失败的日志导出到 Amazon S3 存储桶（备份桶）。


### CloudWatch Logs 中的日志

某些服务输出日志到 Amazon CloudWatch 日志组。

[![arch-service-pipeline-cw]][arch-service-pipeline-cw]
图 3：用于分析 CloudWatch Logs 中的 AWS 服务日志架构

日志管道运行以下工作流：

1. AWS 服务将日志存储在 Amazon CloudWatch 日志组中。

2. CloudWatch 日志通过订阅流式传输到 Amazon Kinesis Data Stream (KDS)。

3. KDS 触发 Lambda（日志处理器）运行。

4. 日志处理器读取并处理日志记录，并将日志摄取到AOS。

5. 处理失败的日志导出到 Amazon S3 存储桶（备份桶）。


## 应用日志分析管道

Log Hub 支持对应用程序日志进行日志分析，例如 Nginx/Apache HTTP 服务器日志或自定义应用程序日志。

[![arch-app-log-pipeline]][arch-app-log-pipeline]
图 4：应用程序日志分析架构

日志管道运行以下工作流：

1. [Fluent Bit](https://fluentbit.io/) 作为底层日志代理，从应用服务器收集日志并发送到 Kinesis Data Streams (KDS)。

2. KDS 触发 Lambda（日志处理器）运行。

3. 日志处理器读取并处理日志记录并将日志摄取到AOS中。

4. 处理失败的日志导出到 Amazon S3 存储桶（Backup Bucket）。


[s3log]: https://docs.aws.amazon.com/AmazonS3/latest/userguide/ServerLogs.html
[alblog]: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-access-logs.html
[s3]: https://aws.amazon.com/s3/
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
[arch-app-log-pipeline]: ../images/architecture/app-pipeline.svg

