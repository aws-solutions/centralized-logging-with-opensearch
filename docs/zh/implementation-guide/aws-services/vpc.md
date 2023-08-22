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

## 查看仪表板

该仪表板包括以下可视化图表。

| 可视化名称                  | 源字段                                                                                                                                                                                                                                          | 描述                                                                                                                                                                                                                                                              |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Global Filters            | <ul><li> account-id </li><li> region </li><li> vpc-id </li><li> subnet-id </li><li> action </li><li> flow-direction </li><li> log-status </li><li> protocol-code </li><li> type </li></ul> | 根据帐户 ID、区域、VPC ID 和其他条件筛选图表。                                                                                                                                                                                                                     |
| Total Requests            | <ul><li> log event </li></ul>                                                                                                                                                 | 显示选定时间段内 VPC 流日志记录的网络请求总数。                                                                                                                                                                                                                    |
| Request History           | <ul><li> log event </li></ul>                                                                                                                                                 | 提供一个柱状图，显示随时间分布的事件情况。                                                                                                                                                                                                                        |
| Requests By VPC ID        | <ul><li> vpc-id </li></ul>                                                                                                                                                    | 使用饼图显示根据源 VPC 的比例分布的网络请求。                                                                                                                                                                                                                        |
| Total Requests By Action  | <ul><li> action </li></ul>                                                                                                                                                    | 显示随时间段划分的按操作分段的请求总量。                                                                                                                                                                                                                          |
| Total Bytes               | <ul><li> bytes</li></ul>                                                                                                                                                      | 提供对受监控的 VPC、子网、网络接口和安全组中整体带宽使用和流量模式的可见性。                                                                                                                                                                                      |
| Total Packets             | <ul><li> packets </li></ul>                                                                                                                                                   | 显示随时间的总记录数据包，以可视化趋势、高峰和低谷。                                                                                                                                                                                                                |
| Bytes Metric              | <ul><li> bytes</li><li>flow-direction</li></ul>                                                                                                                               | 在特定时间段内，根据流日志记录的一系列流中的传入（入口）和传出（出口）网络流量的字节分布。                                                                                                                                                                           |
| Requests By Direction     | <ul><li> flow-direction</li></ul>                                                                                                                                             | 提供传入与传出请求的比例组成的可见性。                                                                                                                                                                                                                              |
| Total Requests By Type    | <ul><li> type </li></ul>                                                                                                                                                      | 显示每种类型的流量量。这提供了对穿越环境的网络请求的协议组成的可见性。                                                                                                                                                                                                |
| Top Source Bytes          | <ul><li> srcaddr</li><li> bytes</li></ul>                                                                                                                                     | 在所选时间段内显示传输出最高数据量的源 IP 地址。                                                                                                                                                                                                                    |
| Top Destination Bytes     | <ul><li> dstaddr</li><li> bytes</li></ul>                                                                                                                                     | 使您能够监视和分析从您的 VPC 到外部目标的出站流量。                                                                                                                                                                                                                  |
| Top Source Requests       | <ul><li>srcaddr </li></ul>                                                                                                                                                    | 允许您查看在您的 VPC 内部哪些资源发起了外部请求。                                                                                                                                                                                                                  |
| Top Destination Requests  | <ul><li> dstaddr</li></ul>                                                                                                                                                    | 允许您查看哪些外部主机受到您的 VPC 资源的最多联系。                                                                                                                                                                                                              |
| Requests by Protocol      | <ul><li> protocol-code</li></ul>                                                                                                                                              | 显示按流量类型（TCP、UDP、ICMP 等）分割的 VPC 流日志记录的网络流。                                                                                                                                                                                                   |
| Requests by Status        | <ul><li> log-status</li></ul>                                                                                                                                                 | 通过流量状态（已接受、已拒绝或其他）对网络流进行了分解。                                                                                                                                                                                                             |
| Top Sources AWS Services  | <ul><li> pkt-src-aws-service</li></ul>                                                                                                                                        | 显示来自顶级 AWS 源（如 S3、CloudFront、Lambda 等）的流的比例分布，以选定的时间段为基础。                                                                                                                                                                           |
| Top Destination AWS Services | <ul><li> pkt-dst-aws-service</li></ul>                                                                                                                                       | 通过在 VPC 子网/接口上启用流日志，并在以 ACCEPT 操作为过滤条件的情况下，筛选出从您的 VPC 到各种 AWS 服务的出站流量，可以查看从您的 VPC 到各种 AWS 服务的出站流量。                                                                                                         |
| Network Flow              | <ul><li>srcaddr</li><li>dstaddr</li></ul>                                                                                                                                     | 允许您查看有关在您的 VPC 中的网络接口之间出入的 IP 流量的信息。                                                                                                                                                                                                      |
| Heat Map                  | <ul><li>srcaddr</li><li>dstaddr</li></ul>                                                                                                                                     | 提供您的流量日志数据中源 IP 地址和目标 IP 地址之间连接的视觉摘要。                                                                                                                                                                                                   |
| Egress Traffic Path       | <ul><li>traffic-path</li></ul>                                                                                                                                                | 允许您在 VPC 网络接口上启用流日志，以捕获有关进出该接口的所有 IP 流量的信息。                                                                                                                                                                                           |
| Search                    | <ul><li>@timestamp</li><li>account-id</li><li>vpc-id</li><li>	flow-direction</li><li>action</li><li>protocol-code</li><li>srcaddr</li><li>scaport</li><li>dstaddr</li><li>dstport</li><li>bytes</li><li>packets</li><li>log-status</li></ul>| 通过对详细流量日志数据进行搜索，可以精确定位分析安全事件、网络问题、使用模式的变化等。                                                                                                                                                                                  |

### 示例仪表板

{%
include-markdown "../include-dashboard.md"
%}

[![vpcflow-db]][vpcflow-db]

[vpcflow-db]: ../../images/dashboards/vpcflow-db.png
