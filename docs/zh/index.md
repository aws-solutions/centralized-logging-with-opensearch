Log Hub 解决方案提供全面的日志管理和分析功能，帮助您简化日志分析管道的构建。本解决方案基于Amazon OpenSearch Service 构建，可让您有效地完成日志摄取、日志处理和日志可视化。本解决方案可应用于多类场景，例如满足安全和合规性法规，实现精细化的业务运营，或者增强IT故障排除和维护。

本解决方案有以下功能：

- **一体化日志摄取**：提供网页控制台，便于您将 AWS 服务日志和应用程序日志摄取到 Amazon OpenSearch (AOS) 域中。有关支持的 AWS 服务日志，请参阅 [AWS 服务日志](./implementation-guide/aws-services/index.md)。有关支持的应用程序日志，请参阅 [应用程序日志](./implementation-guide/applications/index.md)。

- **无代码日志处理**：支持AWS开发的日志处理器插件。您可以在网页控制台轻松对原始的日志数据进行处理。

- **开箱即用的仪表板模板**：提供一系列的可视化模板的集合，既适用于 Nginx 和 Apache HTTP Server 等常用软件，也适用于 Amazon S3 和 Amazon CloudTrail 等 AWS 服务。

本指南中的 [快速入门](./implementation-guide/getting-started/index.md) 章节引导您完成构建日志分析管道的过程，[AOS 集群管理](./implementation-guide/domains/index.md) 章节介绍如何在 Log Hub 网页控制台上导入 AOS 域。

本实施指南描述了在 AWS 云中部署 Log Hub 解决方案的架构注意事项和配置步骤。它包括 [CloudFormation][cloudformation] 模板的链接，这些模板使用 AWS 安全性和可用性最佳实践来启动和配置部署此解决方案所需的 AWS 服务。

本指南适用于在 AWS 云中具有架构实践经验的 IT 架构师、开发人员、DevOps 和数据工程师。

[cloudformation]: https://aws.amazon.com/cn/cloudformation/