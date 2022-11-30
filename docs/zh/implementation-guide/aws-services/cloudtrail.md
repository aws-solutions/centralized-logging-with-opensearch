# CloudTrail 日志
Amazon CloudTrail 监控和记录您的 AWS 基础设施中的账户活动。它将所有数据输出到指定的 S3 存储桶。

## 创建日志摄取
您可以使用 Log Hub 控制台或通过部署独立的 CloudFormation 堆栈来将日志摄取到 AOS 中。

!!! important "重要"
    - CloudTrail 必须与 Log Hub 位于同一区域。
    - AOS索引每天轮换，不可调整。

### 使用 Log Hub 控制台
1. 登录 Log Hub 控制台。
2. 在导航窗格中的 **日志分析管道** 下，选择 **AWS 服务日志**。
3. 单击 **创建日志摄取** 按钮。
4. 在 **AWS 服务** 部分，选择 **Amazon CloudTrail**。
5. 选择**下一步**。
6. 在 **指定设置**，对于 **Trail**，从下拉列表中选择一项。（可选步骤）如果需要跨账户摄取日志，需要先在 **账户** 的下拉列表中选择一个[链接的 AWS 账户](../link-account/index.md)。
7. 选择**下一步**。
8. 在 **指定 OpenSearch 域** 部分，为 **Amazon OpenSearch 域** 选择一个导入的域。
9. 如果要摄取关联的内置 AOS 仪表板，请为 **示例仪表板** 选择 **是**。
10. 如果需要，您可以更改目标 AOS 索引的 **索引前缀**。默认前缀是您的跟踪名称。
11. 在 **日志生命周期** 部分，输入管理 AOS 索引生命周期的天数。 Log Hub 将为此管道自动创建关联的 [索引状态管理 (ISM)](https://opensearch.org/docs/latest/im-plugin/ism/index/) 策略。
12. 选择**下一步**。
13. 如果需要，添加标签。
14. 选择**创建**。

### 使用独立的 CloudFormation 堆栈
此自动化 AWS CloudFormation 模板在 AWS 云中部署 *Log Hub - CloudTrail Log Ingestion* 解决方案。

| | 在 AWS 控制台中启动 |下载模板 |
| -------------------- | -------------------------------------------------- ---------- | -------------------------------------------------- ---------- |
| AWS 海外区域 | [![启动堆栈](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/create/template?stackName=LogHub-CloudTrail&templateURL=https://{{ bucket }}.s3.amazonaws.com/log-hub/{{ version }}/CloudTrailLog.template){target=_blank} | [模板](https://{{ bucket }}.s3.amazonaws.com/log-hub/{{ version }}/CloudTrailLog.template)  |
| AWS 中国区域 | [![启动堆栈](../../images/launch-stack.png)](https://console.amazonaws.cn/cloudformation/home#/stacks/create/template?stackName=LogHub-CloudTrail&templateURL= https://{{ bucket }}.s3.cn-north-1.amazonaws.com.cn/log-hub/{{ version }}/CloudTrailLog.template){target=_blank} | [模板](https://{{ bucket }}.s3.cn-north-1.amazonaws.com.cn/log-hub/{{ version }}/CloudTrailLog.template) |

{%
include-markdown "include-cfn-common.md"
%}

## 示例仪表板
{%
include-markdown "include-dashboard.md"
%}

[![cloudtrail-db]][cloudtrail-db]


[cloudtrail-db]: ../../images/dashboards/cloudtrail-db.png

