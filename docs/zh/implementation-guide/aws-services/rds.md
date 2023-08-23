# Amazon RDS/Aurora 日志

您可以[将数据库实例日志发布到 Amazon CloudWatch Logs](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_LogAccess.Procedural.UploadtoCloudWatch.html)。 然后，您可以对日志数据进行实时分析，将数据存储在高度耐用的存储中，并使用 CloudWatch Logs 代理管理数据。

## 前提条件
确保您的数据库日志已启用。 某些数据库日志默认未启用，您需要更新数据库参数以启用日志。

请参阅[如何为 Amazon RDS MySQL 数据库实例启用和监控日志？](https://aws.amazon.com/premiumsupport/knowledge-center/rds-mysql-logs/) 了解如何将日志输出到 CloudWatch 日志。

下表列出了 RDS/Aurora MySQL 参数的要求。

| 参数           | 要求                                                  |
| -------------- | ------------------------------------------------------------ |
| Audit Log      | 数据库实例必须使用带有 `MARIADB_AUDIT_PLUGIN` 选项的自定义选项组。|
| General log    | 数据库实例必须使用参数设置为 `general_log = 1` 的自定义参数组来启用通用日志。 |
| Slow query log | 数据库实例必须使用参数设置为 `slow_query_log = 1` 的自定义参数组来启用慢查询日志。 |
| Log output     | 数据库实例必须使用参数设置为 `log_output = FILE` 的自定义参数组将日志写入文件系统并将它们发布到 CloudWatch Logs。 |

## 创建日志摄取
您可以使用日志通 控制台或通过部署独立的 CloudFormation 堆栈来将日志摄取到 Amazon OpenSearch Service 中。

!!! important "重要"

    - RDS 和 CloudWatch 必须与日志通位于同一区域。
    - 默认情况下，该解决方案将每天轮换索引。您可以在**额外设置**中进行调整。

### 使用日志通控制台
1. 登录日志通控制台。
2. 在导航窗格中的 **日志分析管道**，选择 **AWS 服务日志**。
3. 选择**创建日志摄取**按钮。
4. 在 **AWS 服务** 部分，选择 **Amazon RDS**。
5. 选择**下一步**。
6. 在 **指定设置**，为 **RDS 日志启用**选择 **自动** 或 **手动**。自动模式将自动检测您的 RDS 日志配置，并从 CloudWatch 摄取日志。
    - 对于**自动模式**，从下拉列表中选择 RDS 集群。
    - 对于**手动模式**，输入**数据库标识符**，选择**数据库类型**并在**日志类型和位置**中输入 CloudWatch 日志位置。
    - (可选步骤) 如果需要跨账户摄取日志，需要先在 **账户** 的下拉列表中选择一个[链接的 AWS 账户](../link-account/index.md)。
7. 选择**下一步**。
8. 在 **指定 OpenSearch 域** 部分，为 **Amazon OpenSearch 域** 选择一个导入的域。
9. 如果您要摄取关联的模板化 Amazon OpenSearch Service 仪表板，请为 **示例仪表板** 选择 **是**。
10. 如果需要，您可以更改目标 Amazon OpenSearch Service 索引的 **索引前缀**。默认前缀是`数据库标识符`。
11. 在 **日志生命周期** 部分，输入管理 Amazon OpenSearch Service 索引生命周期的天数。日志通 将为此管道自动创建关联的 [索引状态管理 (ISM)](https://opensearch.org/docs/latest/im-plugin/ism/index/) 策略。
12. 选择**下一步**。
13. 如果需要，添加标签。
14. 选择**创建**。

### 使用 CloudFormation 堆栈
此自动化 AWS CloudFormation 模板在 AWS 云中部署 *日志通- RDS Log Ingestion* 解决方案

|                      | 在 AWS 控制台中启动                                        | 下载模板                                            |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| AWS 海外区域 | [![启动堆栈](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/RDSLog.template){target=_blank} | [模板](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/RDSLog.template) |
| AWS 中国区域    | [![启动堆栈](../../images/launch-stack.png)](https://console.amazonaws.cn/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/RDSLog.template){target=_blank} | [模板](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/RDSLog.template) |

{%
include-markdown "include-cw-cfn-common.md"
%}

## 查看仪表板

该仪表板包括以下可视化图表。

| Visualization Name             | Source Field                                                                                                                                                                                                                                                | Description                                                                                                                                                                                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Controller                     | <ul><li> db-identifier </li><li> sq-table-name </li></ul>                                                                                                                                                                                                    | 此可视化允许用户根据“db-identifier”和“sq-table-name”字段进行数据筛选。                                                                                                                                                                                               |
| Total Log Events Overview      | <ul><li> db-identifier </li><li> log event </li></ul>                                                                                                                                                                                                        | 此可视化呈现了指定数据库（“db-identifier”）的总日志事件概览。它有助于监控各种日志事件的发生频率。                                                                                                                                                                   |
| Slow Query History             | <ul><li> log event </li></ul>                                                                                                                                                                                                                                | 此可视化显示了慢查询日志事件的历史数据。它可以帮助跟踪慢查询的发生次数并识别潜在的性能问题。                                                                                                                                                                         |
| Average Slow Query Time History| <ul><li> Average sq-duration </li></ul>                                                                                                                                                                                                                    | 此可视化显示了慢查询的平均持续时间（“sq-duration”）的历史趋势。它有助于了解数据库随时间的性能情况，并识别与慢查询持续时间相关的趋势。                                                                                                                                   |
| Total Slow Queries             | <ul><li> log event </li></ul>                                                                                                                                                                                                                                | 此可视化提供了日志事件中慢查询总数。它可以立即查看在特定时间段内发生了多少个慢查询，这有助于评估数据库的性能和潜在的瓶颈。                                                                                                                                         |
| Average Slow Query Duration    | <ul><li> Average sq-duration </li></ul>                                                                                                                                                                                                                    | 此可视化显示了慢查询的平均持续时间（“sq-duration”）随时间的变化。它对于了解数据库中慢查询的典型性能非常有价值。                                                                                                                                                |
| Top Slow Query IP              | <ul><li> sq-ip </li><li> sq-duration </li></ul>                                                                                                                                                                                                              | 此可视化突出显示了与最慢查询相关的 IP 地址（“sq-ip”）及其相应的持续时间（“sq-duration”）。它有助于识别慢查询的来源并确定优化的潜在领域。                                                                                                                             |
| Slow Query Scatter Plot        | <ul><li> sq-duration </li><li> sq-ip </li><li> sq-query </li></ul>                                                                                                                                                                                           | 此散点图可视化表示慢查询持续时间（“sq-duration”）、源 IP 地址（“sq-ip”）以及实际查询内容（“sq-query”）之间的关系。它有助于理解查询性能模式，并识别特定查询及其来源的潜在问题。                                                                                                                   |
| Slow Query Pie                 | <ul><li> sq-query </li></ul>                                                                                                                                                                                                                                | 此饼图可视化显示了基于查询内容（“sq-query”）的慢查询分布。它提供了引起性能问题的查询类型的概览，使您可以专注于优化特定的查询模式。                                                                                                                                     |
| Slow Query Table Name Pie      | <ul><li> sq-table-name </li></ul>                                                                                                                                                                                                                           | 此饼图可视化显示了基于访问的表名（“sq-table-name”）的慢查询分布。它有助于识别哪些表受到慢查询的影响，从而可以有针对性地优化特定表。                                                                                                                                   |
| Top Slow Query                 | <ul><li> sq-query </li></ul>                                                                                                                                                                                                                                | 此可视化呈现了基于查询内容（“sq-query”）的最慢单个查询。它有助于精确定位对性能产生

