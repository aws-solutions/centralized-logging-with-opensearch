# VPC 流日志
[VPC 流日志](https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs.html) 可以让您可以捕获有关传入和传出您的 VPC 中网络接口的 IP 流量的信息。

## 创建日志摄取
您可以使用日志通控制台或通过部署独立的 CloudFormation 堆栈来将日志摄取到 Amazon OpenSearch Service 中。

!!! important "重要"

    - 日志通目前支持将流日志数据发布到 Amazon S3 或 CloudWatch 日志组的 VPC；在发布到S3的场景下，该 S3 桶必须与日志通位于同一区域。
    - 默认情况下，该解决方案将每天轮换索引。您可以在**额外设置**中进行调整。

### 使用日志通控制台
1. 登录日志通控制台。
2. 在导航窗格中的 **日志分析管道** 下，选择 **AWS 服务日志**。
3. 选择**创建日志摄取**按钮。
4. 在 **AWS 服务** 部分，选择 **VPC Flow 日志**。
5. 选择**下一步**。
6. 在 **指定设置** 下，为 **S3启用访问日志** 选择 **自动** 或 **手动**。如果尚未启用日志记录，自动模式将启用 VPC 流日志并将日志保存到集中式 S3 存储桶。
    - 对于 **自动模式**，从下拉列表中选择 VPC。
    - 对于 **手动模式**，输入 **VPC 名字** 和 **VPC 流日志位置**。
    - (可选步骤) 如果需要跨账户摄取日志，需要先在 **账户** 的下拉列表中选择一个[链接的 AWS 账户](../link-account/index.md)。
 7. 在 **日志来源** 中，选择 **S3** 或者 **CloudWatch** 作为日志源。
 8. 选择**下一步**。
 9. 在 **指定 OpenSearch 域** 部分，为 **Amazon OpenSearch 域** 选择一个导入的域。
 10. 如果要摄取关联的内置 Amazon OpenSearch Service 仪表板，请为 **示例仪表板** 选择 **是**。
 11. 如果需要，您可以更改目标 Amazon OpenSearch Service 索引的 **索引前缀**。默认前缀是您的 VPC 名称。
 12. 在 **日志生命周期** 部分，输入管理 Amazon OpenSearch Service 索引生命周期的天数。日志通 将为此管道自动创建关联的 [索引状态管理 (ISM)](https://opensearch.org/docs/latest/im-plugin/ism/index/) 策略。
 13. 选择**下一步**。
 14. 如果需要，添加标签。
 15. 选择**创建**。

### 使用 CloudFormation 堆栈
此自动化 AWS CloudFormation 模板在 AWS 云中部署 *日志通- VPC Flow Logs Ingestion* 解决方案。

|                      | 在 AWS 控制台中启动                                        | 下载模板                                            |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| AWS 海外区域 | [![Launch Stack](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/VPCFlowLog.template){target=_blank} | [Template](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/VPCFlowLog.template) |
| AWS 中国区域 | [![Launch Stack](../../images/launch-stack.png)](https://console.amazonaws.cn/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/VPCFlowLog.template){target=_blank} | [Template](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/VPCFlowLog.template) |

{%
include-markdown "include-cfn-common.md"
%}

## 示例仪表板
{%
include-markdown "include-dashboard.md"
%}

[![vpc-db]][vpc-db]


[vpc-db]: ../../images/dashboards/vpcflow-db.png