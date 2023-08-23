 日志通（Centralized Logging with OpenSearch）提供全面的日志管理和分析功能，帮助您简化日志分析管道的构建。本解决方案基于Amazon OpenSearch Service 构建，可让您有效地完成日志摄取、日志处理和日志可视化。本解决方案可应用于多类场景，例如满足安全和合规性法规，实现精细化的业务运营，或者增强IT故障排除和维护。

| 如果您想要 … | 阅读… |
|----------|--------|
| 了解运行此解决方案的成本 | [成本](./implementation-guide/plan-deployment/cost.md) |
| 理解此解决方案的安全注意事项 | [安全](./implementation-guide/plan-deployment/security.md) |
| 了解此解决方案支持的AWS区域 | [支持的AWS区域](./implementation-guide/plan-deployment/considerations.md) |
| 快速开始使用解决方案，导入Amazon OpenSearch Service域，构建日志分析管道，访问内置仪表板 | [快速入门](./implementation-guide/getting-started/index.md) |
| 学习与Amazon OpenSearch Service域相关的操作 | [域管理](./implementation-guide/domains/index.md) |
| 指导构建日志分析管道的过程 | [AWS服务日志](./implementation-guide/aws-services/index.md) 和 [应用程序日志](./implementation-guide/applications/index.md) |

本指南中的 [快速入门](implementation-guide/getting-started/index.md) 章节引导您完成构建日志分析管道的过程，[集群管理](implementation-guide/domains/index.md) 章节介绍如何在日志通网页控制台上导入 AOS 域。

本实施指南描述了在 AWS 云中部署日志通解决方案的架构注意事项和配置步骤。它包括 [CloudFormation][cloudformation] 模板的链接，这些模板使用 AWS 安全性和可用性最佳实践来启动和配置部署此解决方案所需的 AWS 服务。

本指南适用于在 AWS 云中具有架构实践经验的 IT 架构师、开发人员、DevOps 和数据工程师。

[cloudformation]: https://aws.amazon.com/cn/cloudformation/