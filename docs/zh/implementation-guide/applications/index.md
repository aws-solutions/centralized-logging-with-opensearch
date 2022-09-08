# 应用程序日志分析管道

Log Hub 支持从 EC2 实例、EKS 集群和 S3 存储桶中摄取应用程序日志。

- 对于 EC2 实例，Log Hub 会自动安装 [logging agent](#logging-agent) ([Fluent Bit 1.9][fluent-bit])，收集 EC2 实例上的应用程序日志，然后将日志发送到 Amazon OpenSearch。
- 对于 EKS 集群，Log Hub 将生成一体化配置文件供客户将 [logging agent](#logging-agent) ([Fluent Bit 1.9][fluent-bit]) 部署为 DaemonSet 或 Sidecar。 部署日志代理后，Log Hub 将开始收集 pod 日志并发送到 Amazon OpenSearch。
- 对于 S3 存储桶，Log hub 将直接收集存储在 S3 存储桶中的应用程序日志。

## 支持的日志格式和数据源
{%
include-markdown "include-supported-app-logs.md"
%}

在本章中，您将学习如何为以下日志格式创建日志摄取：

- [Apache HTTP server 日志](./apache.md)
- [Nginx 日志](./nginx.md)
- [单行文本日志](./single-line-text.md)
- [多行文本日志](./multi-line-text.md)
- [JSON 日志](./json.md)

在创建日志摄取之前，您需要：

- [创建日志源](./create-log-source.md)（不适用于S3存储桶）
- [创建应用程序日志管道](./create-applog-pipeline.md)

## 概念

下面介绍的概念可帮助您了解应用程序日志摄取的工作原理。

### 应用程序日志分析管道

要收集应用程序日志，需要数据管道。管道不仅缓冲传输中的数据，还清理或预处理数据。例如，将 IP 转换为地理位置。目前，Kinesis Data Stream 用作数据缓冲。

### 日志摄取 (Log Ingestion)
日志摄取为 Log Hub 使用的日志记录代理配置日志源、日志类型和应用程序日志分析管道。
之后，Log Hub 将开始从日志源收集特定类型的日志并将它们发送到 Amazon OpenSearch。

### 日志代理 (Logging Agent)
日志代理是一个程序，它从一个位置读取日志并将它们发送到另一个位置（例如，OpenSearch）。
目前，Log Hub 仅支持自动安装的 [Fluent Bit 1.9][fluent-bit] 日志代理。 Fluent Bit 代理具有 [OpenSSL 1.1][open-ssl] 的依赖项。要了解如何在 Linux 实例上安装 OpenSSL，请参阅 [OpenSSL 安装](../resources/open-ssl.md)。

### 日志源 (Log Source)
日志源是指您希望 Log Hub 从中收集应用程序日志的 Amazon 服务。

支持的日志源有：

* [实例组](#instances-group)
* [EKS 集群](#eks-cluster)
* [S3 存储桶](#s3-bucket)

#### 实例组 (Instance Group)

实例组是您要从中收集应用程序日志的 EC2 实例的集合。 Log Hub 将帮助您在组内的每个实例中安装日志记录代理。

#### EKS 集群 (EKS Cluster)

Log Hub 中的 EKS 集群是指您要从中收集 pod 日志的 Amazon EKS。 Log Hub 将指导您将日志记录代理部署为 EKS 集群中的 DaemonSet 或 Sidecar。

#### S3 存储桶 (S3 Bucket)

如果您的系统当前正在将应用程序日志发送到 S3 存储桶，Log Hub 支持收集存储在 Amazon S3 存储桶上的持续日志。

### 日志配置 (Log Config)

日志配置是一种配置，它告诉 Log Hub 日志在日志源上的存储位置、您要收集的日志类型、日志行包含哪些字段以及每个字段的类型。

[fluent-bit]: https://docs.fluentbit.io/manual/
[open-ssl]: https://www.openssl.org/source/
