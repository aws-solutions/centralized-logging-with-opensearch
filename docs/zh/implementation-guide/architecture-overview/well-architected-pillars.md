此解决方案遵循了 [AWS Well-Architected 框架][well-architected-framework] 的最佳实践，该框架可帮助客户在云中设计和运营可靠、安全、高效和具有成本效益的工作负载。

本节介绍了在构建此解决方案时如何应用 Well-Architected 框架的设计原则和最佳实践。

## 运维卓越

本节描述了在设计此解决方案时如何应用 [运维卓越支柱][operational-excellence-pillar] 的原则和最佳实践。

此解决方案在各个阶段将指标、日志和追踪数据推送到 Amazon CloudWatch，以提供对基础架构、弹性负载均衡器、Amazon ECS 集群、Lambda 函数、Step Function 工作流以及其余解决方案组件的可观察性。此解决方案还为每个管道监控创建了 CloudWatch 仪表板。

## 安全性

本节描述了在设计此解决方案时如何应用 [安全性支柱][security-pillar] 的原则和最佳实践。

- Web 控制台用户通过 Amazon Cognito 或 OpenID Connect 进行身份验证和授权。
- 所有的服务间通信都使用 AWS IAM 角色。
- 解决方案使用的所有角色都遵循最小特权访问原则，即仅包含服务正常运行所需的最低权限。

## 可靠性

本节描述了在设计此解决方案时如何应用 [可靠性支柱][reliability-pillar] 的原则和最佳实践。

- 在可能的情况下，使用 AWS 无服务器服务（例如，AWS AppSync、Amazon DynamoDB、AWS Lambda、AWS Step Functions、Amazon S3 和 Amazon SQS），以确保高可用性并从服务故障中恢复。
- 解决方案的配置管理内容存储在 Amazon DynamoDB 中，所有数据存储在固态硬盘（SSD）上，并自动在 AWS 区域内的多个可用区（AZ）之间进行复制，提供内置的高可用性和数据耐久性。

## 性能效率

本节描述了在设计此解决方案时如何应用 [性能效率支柱][performance-efficiency-pillar] 的原则和最佳实践。

- 可以在支持此解决方案中的 AWS 服务的任何区域中启动此解决方案，例如：Amazon S3、Amazon ECS、弹性负载均衡器。
- 使用无服务器架构消除了您运行和维护传统计算活动的物理服务器的需求。
- 每天自动测试和部署此解决方案。解决方案架构师和专家会定期审查解决方案，以寻找实验和改进的领域。

## 成本优化

本节描述了在设计此解决方案时如何应用 [成本优化支柱][cost-optimization-pillar] 的原则和最佳实践。

- 使用自动伸缩组，使计算成本仅与摄取和处理的数据量相关。
- 使用无服务器服务，如 Amazon S3、Amazon DynamoDB、AWS Lambda 等，以便客户只需为实际使用的资源付费。

## 可持续性

本节描述了在设计此解决方案时如何应用 [可持续性支柱][sustainability-pillar] 的原则和最佳实践。

- 解决方案的无服务器设计（使用 Amazon Kinesis Data Streams、Amazon S3、AWS Lambda）和托管服务的使用（例如 Amazon ECS）旨在降低与持续运行本地服务器的碳足迹相比的碳足迹。

[well-architected-framework]:https://aws.amazon.com/architecture/well-architected/?wa-lens-whitepapers.sort-by=item.additionalFields.sortDate&wa-lens-whitepapers.sort-order=desc&wa-guidance-whitepapers.sort-by=item.additionalFields.sortDate&wa-guidance-whitepapers.sort-order=desc
[operational-excellence-pillar]:https://docs.aws.amazon.com/wellarchitected/latest/operational-excellence-pillar/welcome.html
[security-pillar]:https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/welcome.html
[reliability-pillar]:https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html
[performance-efficiency-pillar]:https://docs.aws.amazon.com/wellarchitected/latest/performance-efficiency-pillar/welcome.html
[cost-optimization-pillar]:https://docs.aws.amazon.com/wellarchitected/latest/cost-optimization-pillar/welcome.html
[sustainability-pillar]:https://docs.aws.amazon.com/wellarchitected/latest/sustainability-pillar/sustainability-pillar.html
