# 应用程序日志分析管道

日志通支持从以下日志源摄取应用程序日志：

- [EC2实例](./ec2-pipeline.md): 日志通会自动安装 [log agent](#log-agent) (Fluent Bit 1.9), 收集 EC2 实例上的应用程序日志，然后将日志发送到 Amazon OpenSearch。
- [EKS集群](./eks-pipeline.md): 日志通将生成一体化配置文件供客户将[log agent](#log-agent) (Fluent Bit 1.9) 部署为 DaemonSet 或 Sidecar。 部署日志代理后，日志通将开始收集 pod 日志并发送到 Amazon OpenSearch。
- [Amazon S3](./s3-pipeline.md): 日志通既可以连续提取指定 Amazon S3 位置中的日志，也可以执行一次性提取。 您还可以根据 Amazon S3 前缀过滤日志或使用自定义日志配置来解析日志。
- [Syslog](./syslog-pipeline.md): 对于 Syslog，日志通将通过 UDP 或 TCP 协议收集 Syslog 日志。

创建日志分析管道后，您可以向日志分析管道添加更多日志源。 有关更多信息，请参阅 [添加新的日志源](./create-log-source.md#add-a-new-log-source)。

!!! Important "重要"

    如果您是第一次使用日志通创建应用程序日志管道，建议您先了解概念以及支持的日志格式和日志源。

## 支持的日志格式和日志源
{%
include-markdown "include-supported-app-logs.md"
%}

## 概念

下面介绍的概念可帮助您了解应用程序日志摄取的工作原理。

### 应用程序日志分析管道

要收集应用程序日志，需要数据管道。管道不仅缓冲传输中的数据，还清理或预处理数据。例如，将 IP 转换为地理位置。目前，Kinesis Data Stream 用作数据缓冲。

### 日志摄取 (Log Ingestion)
日志摄取为日志通使用的日志记录代理配置日志源、日志类型和应用程序日志分析管道。
之后，日志通将开始从日志源收集特定类型的日志并将它们发送到 Amazon OpenSearch。


### 日志代理 (Log Agent)
日志代理是一个程序，它从一个位置读取日志并将它们发送到另一个位置（例如，OpenSearch）。
目前，日志通仅支持自动安装的 [Fluent Bit 1.9][fluent-bit] 日志代理。 Fluent Bit 代理具有 [OpenSSL 1.1][open-ssl] 的依赖项。要了解如何在 Linux 实例上
安装 OpenSSL，请参阅 [OpenSSL 安装](../resources/open-ssl.md)。通过此[链接][supported-platforms]查看 Fluent Bit 支持的平台。

### 日志缓冲区（Log Buffer）
日志缓冲区是日志代理和 OpenSearch 集群之间的缓冲层。 日志代理上传日志到缓冲区，然后经过处理后，传递到 OpenSearch 集群中。 在高流量场景下，缓冲区是保护OpenSearch集群负载过高的一种方式。 日志通解决方案提供了以下类型的缓冲层。

- **Amazon S3** 日志代理定期将日志上传到 Amazon S3 存储桶。 传递到 Amazon S3 存储桶的数据传输频率是您在创建应用程序日志分析管道配置时，通过 *缓冲区大小*（默认值为 50 MB）和 *缓冲间隔*（默认值为 60 秒）这两个参数值决定。这两个参数谁先满足，谁将优先触发数据传送到 Amazon S3。如果您可以承受日志摄取的分钟级延迟，请使用此选项。

- **Amazon Kinesis Data Streams** 日志代理在几秒钟内将日志上传到 Amazon Kinesis Data Streams。 传递到 Amazon Kinesis Data Streams 数据传输频率是您在创建应用程序日志分析管道配置时，通过 *缓冲区大小*（默认值为 10 MB）和 *缓冲间隔*（默认值为 5 秒）这两个参数值决定。这两个参数谁先满足，谁将优先触发数据传送到 Amazon Kinesis Data Streams。如果您需要实时日志摄取，请使用此选项。

创建应用程序日志分析管道时，日志缓冲区是可选的。对于所有类型的应用程序日志，日志通解决方案还提供了一种没有任何缓冲层的摄取日志方式。但是，我们仅推荐您在日志量小情况时才使用此选项，并且您有足够的信心，认为不会触发 OpenSearch 端阈值。

### 日志源 (Log Source)
日志源是指您希望日志通从中收集应用程序日志的 Amazon 服务。支持的日志源有：

* [实例组（Instance Group）](#instance-group)
* [EKS集群（EKS Cluster）](#eks-cluster)
* [Amazon S3](#amazon-s3)
* [Syslog](#syslog)

#### 实例组 (Instance Group)

实例组是您要从中收集应用程序日志的 EC2 实例的集合。日志通 将帮助您在组内的每个实例中安装日志记录代理。你可以通过界面选择任意 EC2 实例或者选择一个[EC2 Auto Scaling 组][asg]。 

#### EKS 集群 (EKS Cluster)

日志通中的 EKS 集群是指您要从中收集 pod 日志的 Amazon EKS。日志通 将指导您将日志记录代理部署为 EKS 集群中的 DaemonSet 或 Sidecar。

#### Amazon S3
日志通支持收集存储在 Amazon S3 存储桶中的日志。

#### Syslog
日志通将通过 UDP 或 TCP 协议收集 syslog 日志。

### 日志配置 (Log Config)

日志配置是一种配置，它告诉日志通日志在日志源上的存储位置、您要收集的日志类型、日志行包含哪些字段以及每个字段的类型。


[fluent-bit]: https://docs.fluentbit.io/manual/
[open-ssl]: https://www.openssl.org/source/
[supported-platforms]: https://docs.fluentbit.io/manual/installation/supported-platforms
[asg]: https://aws.amazon.com/ec2/autoscaling/
