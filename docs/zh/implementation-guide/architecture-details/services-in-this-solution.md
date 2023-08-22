以下 AWS 服务包括在此解决方案中：

| AWS 服务                                                                                       | 描述                                                                                                                                               |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Amazon CloudFront](https://aws.amazon.com/cloudfront)                                      | 用于分发前端 Web UI 资产。                                                         |
| [Amazon S3](http://aws.amazon.com/s3/)                                                      | 用于存储静态 Web 资产（前端用户界面），同时也将其用作日志传输的数据缓冲区。                                           |
| [Amazon Cognito](https://aws.amazon.com/cognito)                                    | 用于验证用户（在 AWS 区域内）。                                                           |
| [AWS AppSync](https://aws.amazon.com/appsync)                                             | 用于提供后端 GraphQL API。                                                                                                                      |
| [Amazon DynamoDB](https://aws.amazon.com/dynamodb)                                        | 用于存储解决方案相关信息作为后端数据库。                                                                                              |
| [AWS Lambda](https://aws.amazon.com/lambda)                                               | 用于与其他 AWS 服务交互，处理管理日志管道或日志代理的核心逻辑，并获取在 DynamoDB 表中更新的信息。    |
| [AWS Step Functions](https://aws.amazon.com/step-functions)                               | 用于编排按需 AWS CloudFormation 部署一组预定义堆栈，用于日志管道管理。                     |
| [AWS CloudFormation](https://aws.amazon.com/cloudformation)                               | 用于为管道的模块和解决方案 Web 控制台提供 AWS 资源。                                         |
| [AWS Systems Manager](https://aws.amazon.com/systems-manager)                             | 用于管理从应用程序服务器收集日志的日志代理，例如为应用程序服务器安装日志代理（Fluent Bit）。        |
| [Amazon Kinesis Data Streams](https://aws.amazon.com/kinesis/data-streams/)   | 用于订阅来自 CloudWatch 日志组的日志或作为日志传输的数据缓冲区，然后启动日志处理 Lambda 进程。 |
| [Amazon Kinesis Data Firehose](https://aws.amazon.com/kinesis/data-firehose/) | 用于订阅来自 CloudWatch 日志组的日志，然后将日志放入 Amazon S3。                        |
| [Amazon SQS](https://aws.amazon.com/sqs)                   | 用于接收 Amazon S3 事件通知，然后启动日志处理 Lambda 进程。                              |
