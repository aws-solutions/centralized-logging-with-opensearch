# CloudTrail 日志
Amazon CloudTrail 监控和记录您的 AWS 基础设施中的账户活动。它将所有数据输出到指定的 S3 存储桶或者 CloudWatch 日志组中。

## 创建日志摄取
您可以使用日志通控制台或通过部署独立的 CloudFormation 堆栈来将日志摄取到 Amazon OpenSearch Service 中。

!!! important "重要"
    - CloudTrail 必须与日志通位于同一区域。
    - 默认情况下，该解决方案将每天轮换索引。您可以在**额外设置**中进行调整。

### 使用日志通控制台
1. 登录日志通控制台。
2. 在导航窗格中的 **日志分析管道** 下，选择 **AWS 服务日志**。
3. 单击 **创建日志摄取** 按钮。
4. 在 **AWS 服务** 部分，选择 **Amazon CloudTrail**。
5. 选择**下一步**。
6. 在 **指定设置**，对于 **Trail**，从下拉列表中选择一项。（可选步骤）如果需要跨账户摄取日志，需要先在 **账户** 的下拉列表中选择一个[链接的 AWS 账户](../link-account/index.md)。
 7. 在 **日志来源**，选择 **S3** 或者 **CloudWatch** 作为日志源。
 8. 选择**下一步**。
 9. 在 **指定 OpenSearch 域** 部分，为 **Amazon OpenSearch 域** 选择一个导入的域。
 10. 如果要摄取关联的内置 Amazon OpenSearch Service 仪表板，请为 **示例仪表板** 选择 **是**。
 11. 如果需要，您可以更改目标 Amazon OpenSearch Service 索引的 **索引前缀**。默认前缀是您的跟踪名称。
 12. 在 **日志生命周期** 部分，输入管理 Amazon OpenSearch Service 索引生命周期的天数。日志通 将为此管道自动创建关联的 [索引状态管理 (ISM)](https://opensearch.org/docs/latest/im-plugin/ism/index/) 策略。
 13. 选择**下一步**。
 14. 如果需要，添加标签。
 15. 选择**创建**。

### 使用独立的 CloudFormation 堆栈
此自动化 AWS CloudFormation 模板在 AWS 云中部署 *日志通- CloudTrail Log Ingestion* 解决方案。

| | 在 AWS 控制台中启动 |下载模板 |
| -------------------- | -------------------------------------------------- ---------- | -------------------------------------------------- ---------- |
| AWS 海外区域 | [![启动堆栈](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CloudTrailLog.template){target=_blank} | [模板](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CloudTrailLog.template)  |
| AWS 中国区域 | [![启动堆栈](../../images/launch-stack.png)](https://console.amazonaws.cn/cloudformation/home#/stacks/new?templateURL= https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CloudTrailLog.template){target=_blank} | [模板](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CloudTrailLog.template) |

{%
include-markdown "include-cfn-common.md"
%}

## 示例仪表板
{%
include-markdown "include-dashboard.md"
%}

[![cloudtrail-db]][cloudtrail-db]


[cloudtrail-db]: ../../images/dashboards/cloudtrail-db.png

