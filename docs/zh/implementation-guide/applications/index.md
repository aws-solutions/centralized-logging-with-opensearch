# 应用程序日志分析管道

日志通支持从以下日志源摄取应用程序日志：

- [EC2实例](./ec2-pipeline.md): 日志通会自动安装 [log agent](#log-agent) (Fluent Bit 1.9), 收集 EC2 实例上的应用程序日志，然后将日志发送到 Amazon OpenSearch。
- [EKS集群](./eks-pipeline.md): 日志通将生成一体化配置文件供客户将[log agent](#log-agent) (Fluent Bit 1.9) 部署为 DaemonSet 或 Sidecar。 部署日志代理后，日志通将开始收集 pod 日志并发送到 Amazon OpenSearch。
- [Amazon S3](./s3-pipeline.md): 日志通既可以连续提取指定 Amazon S3 位置中的日志，也可以执行一次性提取。 您还可以根据 Amazon S3 前缀过滤日志或使用自定义日志配置来解析日志。
- [Syslog](./syslog-pipeline.md): 对于 Syslog，日志通将通过 UDP 或 TCP 协议收集 Syslog 日志。

Amazon OpenSearch Service 服务适用于实时日志分析和频繁查询，并具有全文搜索功能。

从2.1.0版本开始，该解决方案开始支持将日志摄取到 Light Engine，适用于非实时日志分析和非频繁的查询，并具有类似SQL的搜索功能。

创建日志分析管道后，您可以向日志分析管道添加更多日志源。 有关更多信息，请参阅 [添加新的日志源](./create-log-source.md#add-a-new-log-source)。

!!! Important "重要"

    如果您是第一次使用日志通创建应用程序日志管道，建议您先了解概念以及支持的日志格式和日志源。

## 支持的日志格式和日志源
{%
include-markdown "include-supported-app-logs.md"
%}