# 应用程序负载平衡 (ALB) 日志
[ALB 访问日志](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-access-logs.html) 提供访问日志，用于捕获有关发送到负载均衡器的请求的详细信息。 ALB 为每个负载平衡器节点发布一个日志文件，每 5 分钟一次。

## 创建日志摄取
您可以使用日志通控制台或通过部署独立的 CloudFormation 堆栈来将日志摄取到 Amazon OpenSearch Service 中。

!!! important "重要"

    - ELB 日志存储桶区域必须与日志通解决方案部署区域相同。
    - 默认情况下，该解决方案将每天轮换索引。您可以在**额外设置**中进行调整。

### 使用日志通控制台

1. 登录日志通控制台。
2. 在导航窗格中的 **日志分析管道**，选择 **AWS 服务日志**。
3. 选择**创建日志摄取**按钮。
4. 在 **AWS 服务** 部分，选择 **Elastic Load Balancer**。
5. 选择**下一步**。
6. 在 **指定设置**，选择 **自动** 或 **手动**。
    - 对于 **自动** 模式，在下拉列表中选择应用程序负载均衡器。（如果选择的 ALB 访问日志没有开启，点击 **开启** 开启 ALB 访问日志。）
    - 对于 **手动** 模式，输入 **Application Load Balancer 标识符** 和 **日志位置**。
    - （可选步骤）如果需要跨账户摄取日志，需要先在 **账户** 的下拉列表中选择一个[链接的 AWS 账户](../link-account/index.md)。
7. 选择**下一步**。
8. 在 **指定 OpenSearch 域** 部分，为 **Amazon OpenSearch 域** 选择一个导入的域。
9. 如果您要摄取关联的模板化 Amazon OpenSearch Service 仪表板，请为 **示例仪表板** 选择 **是**。
10. 如果需要，您可以更改目标 Amazon OpenSearch Service 索引的 **索引前缀**。默认前缀是`负载均衡器名称`。
11. 在 **日志生命周期** 部分，输入管理 Amazon OpenSearch Service 索引生命周期的天数。日志通 将为此管道自动创建关联的 [索引状态管理 (ISM)](https://opensearch.org/docs/latest/im-plugin/ism/index/) 策略。
12. 选择**下一步**。
13. 如果需要，添加标签。
14. 选择**创建**。

### 使用 CloudFormation 堆栈
此自动化 AWS CloudFormation 模板在 AWS 云中部署 *日志通- ELB Log Ingestion* 解决方案。

|                      | 在 AWS 控制台中启动                                        | 下载模板                                            |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| AWS 海外区域 | [![启动堆栈](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/ELBLog.template){target=_blank} | [模板](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/ELBLog.template) |
| AWS 中国区域    | [![启动堆栈](../../images/launch-stack.png)](https://console.amazonaws.cn/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/ELBLog.template){target=_blank} | [模板](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/ELBLog.template) |


{%
include-markdown "include-cfn-plugins-common.md"
%}

## 示例仪表板
{%
include-markdown "include-dashboard.md"
%}

[![elb-db]][elb-db]

[elb-db]: ../../images/dashboards/elb-db.png

