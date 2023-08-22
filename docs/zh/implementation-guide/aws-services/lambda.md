# AWS Lambda 日志
AWS Lambda 会代表您自动监控 Lambda 函数并将函数指标发送到 Amazon CloudWatch。

## 创建日志摄取
您可以使用日志通控制台或通过部署独立的 CloudFormation 堆栈来将日志摄取到 Amazon OpenSearch Service 中。

!!! important "重要"

    - Lambda 必须与日志通位于同一区域。
    - 默认情况下，该解决方案将每天轮换索引。您可以在**额外设置**中进行调整。

### 使用日志通控制台
1. 登录日志通控制台。
2. 在导航窗格中的 **日志分析管道** 下，选择 **AWS 服务日志**。
3. 选择**创建日志摄取**按钮。
4. 在 **AWS 服务** 部分，选择 **AWS Lambda**。
5. 选择**下一步**。
6. 在 **指定设置** 下，从下拉列表中选择 Lambda 函数。（可选步骤）如果需要跨账户摄取日志，需要先在 **账户** 的下拉列表中选择一个[链接的 AWS 账户](../link-account/index.md)。
7. 选择 **下一步**。
8. 在 **指定 OpenSearch 域** 部分，为 **Amazon OpenSearch 域** 选择一个已导入的域。
9. 如果您想要加载关联的模板 Amazon OpenSearch 服务仪表板，请选择 **是**。
10. 如果需要，您可以更改目标 Amazon OpenSearch 服务索引的 **索引前缀**。默认前缀是 Lambda 函数名称。
11. 在 **日志生命周期** 部分，输入用于管理 Amazon OpenSearch 服务索引生命周期的天数。集中式日志功能将为此管道自动创建关联的 [索引状态管理 (ISM)](https://opensearch.org/docs/latest/im-plugin/ism/index/) 策略。
12. 选择 **下一步**。
13. 如有需要，添加标签。
14. 选择 **创建**。


### 使用 CloudFormation 堆栈
此自动化 AWS CloudFormation 模板在 AWS 云中部署 *日志通- Lambda Log Ingestion* 解决方案。

|                      | 从 AWS 控制台中启动                                      | 下载模板                                            |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| AWS 海外区域 | [![启动堆栈](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/LambdaLog.template){target=_blank} | [模板](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/LambdaLog.template) |
| AWS 中国区域 | [![启动堆栈](../../images/launch-stack.png)](https://console.amazonaws.cn/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/LambdaLog.template){target=_blank} | [模板](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/LambdaLog.template) |

{%
include-markdown "include-cw-cfn-common.md"
%}

## 查看仪表板

该仪表板包括以下可视化图表。

| 可视化名称      | 数据源字段                 | 描述                                                                                                  |
| ------------- | ------------------------ | ---------------------------------------------------------------------------------------------------- |
| Lambda 事件   | <ul><li> log event </li></ul> | 显示随时间分布的事件的图表。                                                                   |
| 日志帐户      | <ul><li> owner </li></ul> | 显示占不同 AWS 帐户（所有者）的日志事件比例的饼图。                                            |
| 日志组        | <ul><li> log_group </li></ul> | 显示 Lambda 环境中各种日志组之间日志事件分布的饼图。                                          |
| 日志列表      | <ul><li> time </li><li> log_group </li><li> log_stream </li><li> log_detail </li></ul> | 提供了包括时间戳、日志组、日志流和日志详细信息在内的日志事件的详细列表。 |

### 示例仪表板

{%
include-markdown "../include-dashboard.md"
%}

[![lambda-db]][lambda-db]

[lambda-db]: ../../images/dashboards/lambda-db.png
