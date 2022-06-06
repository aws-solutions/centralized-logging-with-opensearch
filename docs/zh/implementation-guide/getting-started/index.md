# 快速入门

[部署解决方案](../deployment/index.md)后，您可以先阅读本章，快速了解如何利用 Log Hub 进行日志摄取（以 Amazon CloudTrail 日志为例）和日志可视化。

您也可以选择开始 [集群管理](../domains/index.md) ，并创建 [AWS 服务日志分析管道](../aws-services/index.md)和[应用日志分析管道](../applications/index.md)。

## 步骤

- [步骤 1：导入AOS域](./1.import-domain.md)。 将现有 AOS 域导入解决方案。
- [步骤 2：创建访问代理](./2.create-proxy.md)。 创建一个公共访问代理，允许您从任何地方访问 AOS 模板化仪表板。
- [步骤 3：摄取 CloudTrail 日志](./3.build-cloudtrail-pipeline.md)。 将 CloudTrail 日志摄取到指定的 AOS 域。
- [步骤 4：访问 AOS 内置仪表板](./4.view-dashboard.md)。 查看 CloudTrail 日志的仪表板。