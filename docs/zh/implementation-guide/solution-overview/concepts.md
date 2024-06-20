这部分描述了与此解决方案特定的关键概念并定义了相关术语。

## 日志分析引擎

日志分析引擎是一种复杂的工具，旨在处理、分析和可视化来自不同系统、应用程序和设备的大量日志数据。我们的解决方案主要使用 **Amazon OpenSearch 服务** 作为默认的日志分析引擎，同时配备了一种专门针对结构化、不经常发生的日志进行优化的 **Light Engine**。

## OpenSearch Engine

本解决方案中的 OpenSearch Engine 指的是 [Amazon OpenSearch 服务](https://aws.amazon.com/opensearch-service/)，这是一个分布式的、社区驱动的、使用 Apache 2.0 许可证的、100% 开源的搜索和分析套件，用于广泛的用例，如实时应用程序监控、日志分析和网站搜索。

## Light Engine

Light Engine是一种无服务器的日志分析引擎，利用 AWS 的服务，如 Athena、Glue、Lambda 和 Step Functions。设计用于分析结构化和不经常发生的日志，与 OpenSearch 引擎相比，可实现高达 90% 的成本降低。

## 日志配置

日志配置定义了日志的元数据，指定了日志类型、格式、示例日志、过滤器和将原始日志数据映射到日志分析引擎使用的结构化格式所需的模式。

## 日志源

日志源指生成或存储日志的位置。使用 OpenSearch 的集中式日志支持从不同来源摄取日志，包括应用程序日志和 AWS 服务的日志。有关受支持的 AWS 服务日志，请参阅 [AWS 服务日志](../aws-services/index.md)。有关受支持的应用程序日志，请参阅 [应用程序日志](../applications/index.md)。

## 日志代理

日志代理是一种从一个位置读取日志并将其发送到另一个位置（例如 OpenSearch）的程序。目前，使用 OpenSearch 的集中式日志仅支持自动安装的 [Fluent Bit 1.9][fluent-bit] 日志代理。Fluent Bit 代理依赖于 [OpenSSL 1.1][open-ssl]。有关如何在 Linux 实例上安装 OpenSSL 的说明，请参阅 [OpenSSL 安装](../resources/open-ssl.md)。有关 Fluent Bit 支持的平台，请参阅此 [链接][supported-platforms]。

## 日志缓冲区

日志缓冲区是日志代理和 OpenSearch 集群之间的缓冲层。在将日志处理和传递到 OpenSearch 集群之前，代理将日志上传到缓冲层。缓冲层是保护 OpenSearch 集群免受过载的一种方式。本解决方案提供以下类型的缓冲层。

- **Amazon S3**。如果可以忍受分钟级的日志摄取延迟，请使用此选项。日志代理定期将日志上传到 Amazon S3 存储桶。数据传递到 Amazon S3 的频率由创建应用程序日志分析管道时配置的 *缓冲区大小*（默认值为 50 MiB）和 *缓冲区间隔*（默认值为 60 秒）的值确定，满足条件的条件首先触发数据传递到 Amazon S3。

- **Amazon Kinesis Data Streams**。如果需要实时日志摄取，请使用此选项。日志代理将日志上传到 Amazon Kinesis Data Stream。数据传递到 Kinesis Data Streams 的频率由 *缓冲区大小*（10 MiB）和 *缓冲区间隔*（5 秒）确定，满足条件的条件首先触发数据传递到 Kinesis Data Streams。

创建应用程序日志分析管道时，日志缓冲区是可选的。对于所有类型的应用程序日志，此解决方案允许您在没有任何缓冲层的情况下摄取日志。但是，我们只建议在日志量较小且您有信心日志不会超过 OpenSearch 一侧的阈值时使用此选项。

## 日志分析管道

日志分析管道，或称日志管道，表示从源到日志分析引擎的端到端数据流。通常包括运输、缓冲、处理、过滤、丰富和存储日志的阶段。使用 OpenSearch 的集中式日志支持两种类型的日志分析管道：服务日志管道，专为摄取由 AWS 服务生成的日志而设计；应用程序日志管道，专为摄取来自自定义应用程序的日志而设计。

## 实例组

实例组表示一组 EC2 实例，使解决方案能够快速地将日志配置与多个 EC2 实例关联起来。使用 OpenSearch 的集中式日志使用 [Systems Manager Agent(SSM Agent)][ssm-agent] 来安装/配置 Fluent Bit 代理，并将日志数据发送到 [Kinesis Data Streams][kds]。实例组是此解决方案中支持的日志源之一。

## 主账户

部署了带有 OpenSearch 的集中式日志控制台的 AWS 账户。日志分析引擎也必须位于同一个账户中。

## 成员账户

您希望从中摄取 AWS 服务日志或应用程序日志的另一个 AWS 账户。日志从成员账户发送到主账户，在主账户中使用主账户的资源进行分析。

## 访问代理

访问代理充当访问互联网上的 Amazon OpenSearch 服务域的中介。默认情况下，位于 VPC 内的 Amazon OpenSearch 服务域无法从互联网访问。具有 OpenSearch 的集中式日志解决方案实现了基于 Nginx 的代理堆栈架构，以实现对 OpenSearch 仪表板的互联网访问。这使用户可以方便地从任何具有互联网连接的地方与仪表板交互。

[kds]: https://aws.amazon.com/kinesis/data-streams/
[ssm-agent]: https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-agent.html
[fluent-bit]: https://docs.fluentbit.io/manual/
[open-ssl]: https://www.openssl.org/source/
[supported-platforms]: https://docs.fluentbit.io/manual/installation/supported-platforms
[asg]: https://aws.amazon.com/ec2/autoscaling/
