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
您可以使用 Log Hub 控制台或通过部署独立的 CloudFormation 堆栈来将日志摄取到 AOS 中。

!!! important "重要"

    - RDS 和 CloudWatch 必须与 Log Hub 位于同一区域。
    - AOS索引每天轮换，不可调整。

### 使用 Log Hub 控制台
1. 登录 Log Hub 控制台。
2. 在导航窗格中的 **日志分析管道**，选择 **AWS 服务日志**。
3. 选择**创建日志摄取**按钮。
4. 在 **AWS 服务** 部分，选择 **Amazon RDS**。
5. 选择**下一步**。
6. 在 **指定设置**，为 **RDS 日志启用**选择 **自动** 或 **手动**。自动模式将自动检测您的 RDS 日志配置，并从 CloudWatch 摄取日志。
    - 对于**自动模式**，从下拉列表中选择 RDS 集群。
    - 对于**手动模式**，输入**数据库标识符**，选择**数据库类型**并在**日志类型和位置**中输入 CloudWatch 日志位置。
    - (可选步骤) 如果需要夸账户摄取日志，需要先在 **账户** 的下拉列表中选择一个[链接的 AWS 账户](../link-account/index.md)。
7. 选择**下一步**。
8. 在 **指定 OpenSearch 域** 部分，为 **Amazon OpenSearch 域** 选择一个导入的域。
9. 如果您要摄取关联的模板化 AOS 仪表板，请为 **示例仪表板** 选择 **是**。
10. 如果需要，您可以更改目标 AOS 索引的 **索引前缀**。默认前缀是`数据库标识符`。
11. 在 **日志生命周期** 部分，输入管理 AOS 索引生命周期的天数。 Log Hub 将为此管道自动创建关联的 [索引状态管理 (ISM)](https://opensearch.org/docs/latest/im-plugin/ism/index/) 策略。
12. 选择**下一步**。
13. 如果需要，添加标签。
14. 选择**创建**。

### 使用 CloudFormation 堆栈
此自动化 AWS CloudFormation 模板在 AWS 云中部署 *Log Hub - RDS Log Ingestion* 解决方案

|                      | 在 AWS 控制台中启动                                        | 下载模板                                            |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| AWS 海外区域 | [![启动堆栈](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/create/template?stackName=LogHub-RDS&templateURL=https://{{ bucket }}.s3.amazonaws.com/log-hub/{{ version }}/RDSLog.template){target=_blank} | [模板](https://{{ bucket }}.s3.amazonaws.com/log-hub/{{ version }}/RDSLog.template) |
| AWS 中国区域    | [![启动堆栈](../../images/launch-stack.png)](https://console.amazonaws.cn/cloudformation/home#/stacks/create/template?stackName=LogHub-RDS&templateURL=https://{{ bucket }}.s3.cn-north-1.amazonaws.com.cn/log-hub/{{ version }}/RDSLog.template){target=_blank} | [模板](https://{{ bucket }}.s3.cn-north-1.amazonaws.com.cn/log-hub/{{ version }}/RDSLog.template) |

{%
include-markdown "include-cw-cfn-common.md"
%}

## 示例仪表板
{%
include-markdown "include-dashboard.md"
%}

### RDS/Aurora MySQL

[![rds-dashboard]][rds-dashboard]


[rds-dashboard]: ../../images/dashboards/rds-db.png
