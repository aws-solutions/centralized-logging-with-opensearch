# Amazon Config 日志
默认情况下，AWS Config将配置历史记录和快照文件传送到 Amazon S3 存储桶。

## 创建日志摄取
您可以使用日志通控制台或通过部署独立的 CloudFormation 堆栈来将日志摄取到 Amazon OpenSearch Service 中。

!!! important "Important"
    - 确保您已经在部署了日志通的区域中启用了 AWS Config 服务。
    - 存放 AWS Config 日志的存储桶必须与日志通位于同一区域。
    - 默认情况下，该解决方案将每天轮换索引。您可以在**额外设置**中进行调整。

### 使用日志通控制台
1. 登录日志通控制台。
2. 在导航窗格中的 **日志分析管道** 下，选择 **AWS 服务日志**。
3. 选择**创建日志摄取**按钮。
4. 在 **AWS 服务** 部分，选择 **AWS Config 日志**。
5. 选择**下一步**。
6. 在 **指定设置** 下，为 **日志创建**选择 **自动** 或 **手动**。
    - 对于**自动模式**，确认 AWS Config 日志存储的 S3 位置，并输入 **AWS Config 名称**。
    - 对于 **手动模式**，输入 **AWS Config 名称** 和 **日志位置**。
    - （可选步骤）如果需要跨账户摄取日志，需要先在 **账户** 的下拉列表中选择一个[链接的 AWS 账户](../link-account/index.md)。
7. 选择**下一步**。
8. 在 **指定 OpenSearch 域** 部分，为 **Amazon OpenSearch 域** 选择一个导入的域。
9. 如果您要摄取关联的模板化 Amazon OpenSearch Service 仪表板，请为 **示例仪表板** 选择 **是**。
10. 如果需要，您可以更改目标 Amazon OpenSearch Service 索引的 **索引前缀**。默认前缀是您之前输入的 AWS Config 名称。
11. 在 **日志生命周期** 部分，输入管理 Amazon OpenSearch Service 索引生命周期的天数。日志通 将为此管道自动创建关联的 [索引状态管理 (ISM)](https://opensearch.org/docs/latest/im-plugin/ism/index/) 策略。
12. 选择**下一步**。
13. 如果需要，添加标签。
14. 选择**创建**。

### 使用 CloudFormation 堆栈
此自动化 AWS CloudFormation 模板在 AWS 云中部署 *日志通- CloudFront 标准日志摄取* 解决方案。

|                      | 在 AWS 控制台中启动                                      | 下载模板                                           |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| AWS 海外区域 | [![Launch Stack](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/ConfigLog.template){target=_blank} | [Template](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/ConfigLog.template) |
| AWS 中国区域 | [![Launch Stack](../../images/launch-stack.png)](https://console.amazonaws.cn/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/ConfigLog.template){target=_blank} | [Template](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/ConfigLog.template) |

{%
include-markdown "include-cfn-common.md"
%}

## 查看仪表板

仪表板包括以下可视化。

| Visualization Name            | Source Field                                                                                                                                                                           | Description                                                                                                                              |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Global Filters                | <ul><li> awsAccountId </li><li> awsRegion </li><li>resourceType </li><li> resourceId </li><li> resourceName </li></ul>                                                                 |根据帐户 ID、区域、资源类型和其他条件过滤图表。                                         |
| Total Change Events           | <ul><li> log event </li></ul>                                                                                                                                                          | 显示所选时间段内检测到的所有 AWS 资源的配置更改数量。                               |
| Top Resource Types            | <ul><li> resourceType </li></ul>                                                                                                                                                       | 显示按最常修改的 AWS 资源类型在所选时间段内的配置更改分布。                        |
| Config History                | <ul><li> log event </li></ul>                                                                                                                                                          | 展示一个显示事件分布的柱状图。                                                                 |
| Total Delete Events           | <ul><li> log event </li></ul>                                                                                                                                                          | 显示 AWS Config 在所选时间段内检测到的 AWS 资源删除事件数量。                       |
| Config Status                 | <ul><li> configurationItemStatus </li></ul>                                                                                                                                            | 显示 AWS Config 服务在监控的区域和帐户中的操作状态。                                      |
| Top S3 Changes                | <ul><li> resourceName</li></ul>                                                                                                                                                        | 显示在所选时间段内经历最多配置更改的 Amazon S3 存储桶。                              |
| Top Changed Resources         | <ul><li> resourceName</li><li> resourceId</li><li> resourceType</li></ul>                                                                                                              | 显示在所选时间段内经历最多配置更改的个别 AWS 资源。                                    |
| Top VPC Changes               | <ul><li> resourceId</li></ul>                                                                                                                                                          | 展示一个显示在所选时间段内经历最多配置更改的 Amazon VPC。                             |
| Top Subnet Changes            | <ul><li> resourceId</li></ul>                                                                                                                                                          | 提供有针对性的可见性，了解经历最多变换以供治理、安全性和稳定性。                 |
| Top Network Interface Changes | <ul><li> resourceId</li></ul>                                                                                                                                                          | 突出显示在所选时间段内经历最多配置更改的 Amazon VPC 网络接口。                     |
| Top Security Group Changes    | <ul><li> resourceId</li></ul>                                                                                                                                                          | 前 10 个更改的安全组按总修改次数排序。                                            |
| EC2 Config                    | <ul><li>@timestamp</li><li>awsAccountId</li><li>awsRegion</li><li>resourceId</li><li>configurationItemStatus</li></ul>                                                                 | 允许重构逐步应用于 EC2 配置的更改，以进行审计。                                    |
| RDS Config                    | <ul><li>@timestamp</li><li>awsAccountId</li><li>awsRegion</li><li>resourceId</li><li>resourceName</li><li>configurationItemStatus</li></ul>                                            | 显示由 AWS Config 检测到的 RDS 数据库资源的配置历史记录和更改。                    |
| Latest Config Changes         | <ul><li>@timestamp</li><li>awsAccountId</li><li>awsRegion</li><li>resourceType</li><li>resourceId</li><li>resourceName</li><li>relationships</li><li>configurationItemStatus</li></ul> | 提供基础设施修改的一览概览。                                                          |

### 样品仪表板

{%
include-markdown "../include-dashboard.md"
%}

[![config-db]][config-db]

[config-db]: ../../images/dashboards/config-db.png
