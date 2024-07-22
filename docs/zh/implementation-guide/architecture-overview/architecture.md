使用默认参数部署此解决方案会在 AWS 云中构建以下环境。

[![arch]][arch]
_图: 解决方案架构图_

此解决方案在您的 AWS 云账户中部署 AWS CloudFormation 模板并完成以下设置。

1. [Amazon CloudFront](https://aws.amazon.com/cloudfront) 分发托管在 [Amazon S3](https://aws.amazon.com/s3/) 存储桶中的前端 Web UI 资源。

2. [Amazon Cognito 用户池](https://aws.amazon.com/cognito) 或 OpenID 连接器 (OIDC) 可提供身份认证。

3. [AWS AppSync](https://aws.amazon.com/appsync) 提供后端 GraphQL API。

4. [Amazon DynamoDB](https://aws.amazon.com/dynamodb) 将解决方案相关信息存储为后端数据库。

5. [AWS Lambda](https://aws.amazon.com/lambda) 与其它 AWS 服务交互，处理管理日志管道或日志代理的核心逻辑，并获取 DynamoDB 表中更新的信息。

6. [AWS Step Functions](https://aws.amazon.com/step-functions) 按需协调一组预定义堆栈的 [AWS CloudFormation](https://aws.amazon.com/cloudformation) 部署用于日志管道管理。日志管道堆栈部署单独的 AWS 资源，用于收集和处理日志，并将它们摄取到 [Amazon OpenSearch Service](https://aws.amazon.com/opensearch-service) 中以进行进一步分析和可视化。

7. [服务日志管道](#AWS-服务日志分析管道) 或[应用程序日志管道](#应用日志分析管道) 通过日志通 控制台按需创建。

8. [AWS Systems Manager](https://aws.amazon.com/systems-manager) 和 [Amazon EventBridge](https://aws.amazon.com/eventbridge) 用于管理从应用服务器收集日志的日志代理，例如为应用服务器安装日志代理（Fluent Bit）和监控代理的健康状态。

9. [Amazon EC2](https://aws.amazon.com/ec2/) 或 [Amazon EKS](https://aws.amazon.com/eks/) 安装 Fluent Bit 代理，并将日志数据上传到应用日志管道。

10. 应用程序日志管道读取、解析、处理应用程序日志并将它们摄取到 Amazon OpenSearch 域或 Light Engine 分析引擎中。

11. 服务日志管道读取、解析、处理 AWS 服务日志并将它们摄取到 Amazon OpenSearch 域或 Light Engine 分析引擎中。

!!! note "注意"
    在部署解决方案后，您可以使用 [AWS WAF](https://aws.amazon.com/waf/) 来保护 CloudFront 或 AppSync。此外，您可以按照这个[指南](https://docs.aws.amazon.com/appsync/latest/devguide/WAF-Integration.html)配置您的 WAF 设置，以防止 GraphQL schema introspection。

这个解决方案支持两种类型的日志管道：**服务日志分析管道**和**应用程序日志分析管道**，以及两种日志分析引擎：**OpenSearch Engine** 和 **Light Engine**。管道和 Light Engine 的架构细节描述在：

- [服务日志分析管道](../architecture-details/service-log-analytics-pipeline.md)
- [应用程序日志分析管道](../architecture-details/application-log-analytics-pipeline.md)
- [Light Engine](../architecture-details/light-engine.md)

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