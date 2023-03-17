# 解决方案组件

该解决方案由以下组件组成：

## 域管理

该解决方案使用 Amazon OpenSearch Service (Amazon OpenSearch Service) 作为底层引擎来存储和分析日志。您可以导入现有的 Amazon OpenSearch Service 域以进行日志摄取，并为 VPC 内的 Amazon OpenSearch Service 仪表板提供访问代理。此外，您可以为 Amazon OpenSearch Service 设置推荐的 CloudWatch 告警。

## 分析管道

日志管道包括一系列日志处理步骤，包括从源收集日志、处理并将它们发送到 Amazon OpenSearch 服务以进行进一步分析。日志通 支持 AWS 服务日志摄取和服务器端应用程序日志摄取。

### 服务日志管道

该解决方案支持对 AWS 服务日志进行开箱即用的日志分析，例如 Amazon S3 访问日志和 ELB 访问日志。该组件旨在降低为具有不同格式的不同 AWS 服务构建日志分析管道的复杂性。

### 应用程序日志管道

该解决方案支持对应用程序日志的开箱即用日志分析，例如 Nginx/Apache 日志或通过正则表达式解析器的一般应用程序日志。该组件使用 [Fluent Bit](https://fluentbit.io/) 作为底层日志代理从应用服务器收集日志，并允许您轻松安装日志代理并通过系统管理器监控代理健康。