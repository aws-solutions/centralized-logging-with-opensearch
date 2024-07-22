# VPC 流日志
[VPC 流日志](https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs.html) 可以让您可以捕获有关传入和传出您的 VPC 中网络接口的 IP 流量的信息。

您可以使用日志通控制台或通过部署独立的 CloudFormation 堆栈来将日志摄取到 Amazon OpenSearch Service 中。

!!! important "重要"

    - 日志通目前支持将流日志数据发布到 Amazon S3 或 CloudWatch 日志组的 VPC；在发布到S3的场景下，该 S3 桶必须与日志通位于同一区域。
    - 默认情况下，该解决方案将每天轮换索引。您可以在**额外设置**中进行调整。


## 创建日志摄取（OpenSearch Engine）

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
13. 在 **选择日志处理器** 部分，请选择日志处理器。
     - 当选择 Lambda 作为日志处理器时，您可以根据需要配置 Lambda 并发数。
     - （可选）这些[区域](https://aws.amazon.com/about-aws/whats-new/2023/04/amazon-opensearch-service-ingestion/)现在支持 OSI 作为日志处理器。 当选择 OSI 时，请输入 OCU 的最小和最大数量。 请参阅[此处](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/ingestion.html#ingestion-scaling) 的更多信息。
14. 选择**下一步**。
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

### 查看仪表板

该仪表板包括以下可视化图表。

| 可视化名称                  | 源字段                                                                                                                                                                                                                                          | 描述                                                                                                                                                                                                                                                              |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Global Filters            | <ul><li> account-id </li><li> region </li><li> vpc-id </li><li> subnet-id </li><li> action </li><li> flow-direction </li><li> log-status </li><li> protocol-code </li><li> type </li></ul> | 根据帐户 ID、区域、VPC ID 和其他条件筛选图表。                                                                                                                                                                                                                     |
| Total Requests            | <ul><li> log event </li></ul>                                                                                                                                                 | 显示选定时间段内 VPC 流日志记录的网络请求总数。                                                                                                                                                                                                                    |
| Request History           | <ul><li> log event </li></ul>                                                                                                                                                 | 提供一个柱状图，显示随时间分布的事件情况。                                                                                                                                                                                                                        |
| Requests by VPC ID        | <ul><li> vpc-id </li></ul>                                                                                                                                                    | 使用饼图显示根据源 VPC 的比例分布的网络请求。                                                                                                                                                                                                                        |
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
| Top Source AWS Services  | <ul><li> pkt-src-aws-service</li></ul>                                                                                                                                        | 显示来自顶级 AWS 源（如 S3、VPC Flow、Lambda 等）的流的比例分布，以选定的时间段为基础。                                                                                                                                                                           |
| Top Destination AWS Services | <ul><li> pkt-dst-aws-service</li></ul>                                                                                                                                       | 通过在 VPC 子网/接口上启用流日志，并在以 ACCEPT 操作为过滤条件的情况下，筛选出从您的 VPC 到各种 AWS 服务的出站流量，可以查看从您的 VPC 到各种 AWS 服务的出站流量。                                                                                                         |
| Network Flow              | <ul><li>srcaddr</li><li>dstaddr</li></ul>                                                                                                                                     | 允许您查看有关在您的 VPC 中的网络接口之间出入的 IP 流量的信息。                                                                                                                                                                                                      |
| Heat Map                  | <ul><li>srcaddr</li><li>dstaddr</li></ul>                                                                                                                                     | 提供您的流量日志数据中源 IP 地址和目标 IP 地址之间连接的视觉摘要。                                                                                                                                                                                                   |
| Egress Traffic Path       | <ul><li>traffic-path</li></ul>                                                                                                                                                | 允许您在 VPC 网络接口上启用流日志，以捕获有关进出该接口的所有 IP 流量的信息。                                                                                                                                                                                           |
| Search                    | <ul><li>@timestamp</li><li>account-id</li><li>vpc-id</li><li>	flow-direction</li><li>action</li><li>protocol-code</li><li>srcaddr</li><li>scaport</li><li>dstaddr</li><li>dstport</li><li>bytes</li><li>packets</li><li>log-status</li></ul>| 通过对详细流量日志数据进行搜索，可以精确定位分析安全事件、网络问题、使用模式的变化等。                                                                                                                                                                                  |

#### 示例仪表板

{%
include-markdown "../include-dashboard.md"
%}

[![vpcflow-db]][vpcflow-db]

[vpcflow-db]: ../../images/dashboards/vpcflow-db.png


## 创建日志摄取（Light Engine）

### 使用日志通控制台
1. 登录日志通控制台。
2. 在导航窗格中的 **日志分析管道** 下，选择 **AWS 服务日志**。
3. 选择**创建日志摄取**按钮。
4. 在 **AWS 服务** 部分，选择 **VPC Flow 日志**。
5. 选择**Light Engine**， 选择**下一步**。
6. 在 **指定设置** 下，为 **VPC Flow 日志启用**选择 **自动** 或 **手动**。自动模式将自动检测 VPC Flow 日志位置。
    - 对于**自动模式**，从下拉列表中选择 VPC流日志。
    - 对于 **手动模式**，输入 **VPC 名称** 和 **VPC 日志源位置位置**。
    - （可选步骤）如果需要跨账户摄取日志，需要先在 **账户** 的下拉列表中选择一个[链接的 AWS 账户](../link-account/index.md)。
7. 选择**下一步**。
8. 在 **指定 Light Engine 配置** 部分，如果您要摄取关联的模板化 Grafana 仪表板，请为 **样例看板** 选择 **是**。
6. 你可以选择一个Grafana，如果需要**导入**一个新的Grafana，可以跳转到[Grafana](../resources/grafana.md)进行配置。
8. 选择一个S3桶存放分区后的日志。并且定义一个用于存放日志表的名称，我们已经为你预定义了一个表名，你可以根据你的业务需求进行修改。
9. 日志处理频率，默认为**5**分钟，最小时间处理频率为**1**分钟。
10. 在 **日志生命周期** 部分，输入管理 日志合并时间 和 日志归档时间。我们为你提供了默认值，你可以根据你的业务需求来进行调整。
11. 选择**下一步**。
12. 如果需要，添加标签。
13. 选择**创建**。

### 使用 CloudFormation 堆栈
此自动化 AWS CloudFormation 模板在 AWS 云中部署 *日志通- VPC Flow 标准日志摄取* 解决方案。

|                      | 在 AWS 控制台中启动                                                                                                                                                                                                                  | 下载模板                                                                                            |
| -------------------- |-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------|
| AWS 海外区域 | [![启动堆栈](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/MicroBatchAwsServicesVPCFlowPipeline.template){target=_blank} | [模板](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/MicroBatchAwsServicesVPCFlowPipeline.template) |
| AWS 中国区域 | [![启动堆栈](../../images/launch-stack.png)](https://console.amazonaws.cn/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/MicroBatchAwsServicesVPCFlowPipeline.template){target=_blank}   | [模板](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/MicroBatchAwsServicesVPCFlowPipeline.template) |

1. 登录 AWS 管理控制台并选择以上按钮以启动 AWS CloudFormation 模板。您还可以下载模板开始部署。

2. 要在不同的 AWS 区域中启动堆栈，请使用控制台导航栏中的区域选择器。

3. 在 **创建堆栈** 页面上，验证正确的模板 URL 显示在 **Amazon S3 URL** 文本框中，然后选择 **下一步**。

4. 在 **指定堆栈详细信息** 页面上，为您的解决方案堆栈分配一个名称。

5. 在 **参数** 下，查看模板的参数并根据需要进行修改。此解决方案使用以下参数。

    - **Pipeline settings** 专用参数

    | 参数                             | 默认          | 描述                                                                                                       |
    | --------------------------------| ---------- |----------------------------------------------------------------------------------------------------------|
    | Pipeline Id                | `<需要输入>` | pipeline的唯一标识符，如果您需要创建多个ELB pipeline，将不同的VPC Flow日志写入到不同的表中时，则必须保证唯一性，可以通过[uuidgenerator](https://www.uuidgenerator.net/version4)生成唯一的。                                                                                          |
    | Staging Bucket Prefix              | AWSLogs/VPCFlowLogs | 日志在临时存储区的存放目录，不同pipeline要保证Prefix的唯一性且无重叠。                                                                                        |

    - **Destination settings** 专用参数

    | 参数                             | 默认          | 描述                                                                                                       |
    | --------------------------------| ---------- |----------------------------------------------------------------------------------------------------------|
    | Centralized Bucket Name | `<需要输入>` | 输入centralized的s3 bucket名称，例如centralized-logging-bucket。           |
    | Centralized Bucket Prefix     |  datalake                | 输入centralized bucket的路径前缀，默认为datalake，意味着您的数据库的location为s3://{Centralized Bucket Name}/{Centralized Bucket Prefix}/amazon_cl_centralized。 |
    | Centralized Table Name              | VPCFlow | 数据写入到Centralized数据库的表名称，按需定义，默认值为VPCFlow。                                                                                        |


    - **Scheduler settings** 专用参数

    | 参数                             | 默认          | 描述                                                                                                       |
    | --------------------------------| ---------- |----------------------------------------------------------------------------------------------------------|
    | LogProcessor Schedule Expression | rate(5 minutes) | 执行数据加工的任务周期表达式，默认值为每5分钟执行一次LogProcessorr，配置[可参考](https://docs.aws.amazon.com/scheduler/latest/UserGuide/schedule-types.html)。           |
    | LogMerger Schedule Expression   |  cron(0 1 * * ? *)                | 执行数据文件合并的任务周期表达式，默认值为每天1点执行LogMerger,配置[可参考](https://docs.aws.amazon.com/scheduler/latest/UserGuide/schedule-types.html)。 |
    | LogArchive Schedule Expression              | cron(0 2 * * ? *) | 执行数据归档的任务周期表达式，默认值为每天2点执行LogArchive，配置[可参考](https://docs.aws.amazon.com/scheduler/latest/UserGuide/schedule-types.html)。
    | Age to Merge   |  7                | 小文件保留天数，默认值为7，表示会对7天以前的日志进行小文件合并，可按需调整。 |
    | Age to Archive              | 30 | 日志保留天数，默认值为30，表示30天以前的数据会进行归档删除，可按需调整。

    - **Notification settings** 专用参数

    | 参数                             | 默认          | 描述                                                                                                       |
    | --------------------------------| ---------- |----------------------------------------------------------------------------------------------------------|
    | Notification Service | SNS | 告警通知方式，如果您的主栈是使用China，则只能选择SNS方式，如果您的主栈是使用Global，则可以使用SNS或SES方式。           |
    | Recipients   |  `<需要输入>`               | 告警通知，如果Notification Service为SNS，则此处输入SNS的Topic arn，确保有权限，如果Notification Service为SES，则此处输入邮箱地址，以逗号分隔，确保邮件地址已在SES中Verified identities，创建主stack输入的adminEmail默认会发送验证邮件。 |

    - **Dashboard settings** 专用参数

    | 参数                             | 默认          | 描述                                                                                                       |
    | --------------------------------| ---------- |----------------------------------------------------------------------------------------------------------|
    | Import Dashboards | FALSE | 是否导入Dashboard到Grafana中，默认值为false，如设置为true，则必须填写Grafana URL和Grafana Service Account Token。           |
    | Grafana URL   |  `<可选输入>`                | Grafana访问的URL，例如https://VPCFlow-72277319.us-west-2.elb.amazonaws.com。 |
    | Grafana Service Account Token              | `<可选输入>` | Grafana Service Account Token：Grafana中创建的Service Account Token。
                                                                                          |




6. 选择**下一步**。

7. 在 **配置堆栈选项** 页面上，选择 **下一步**。

8. 在 **审核** 页面上，查看并确认设置。选中确认模板创建 AWS Identity and Access Management (IAM) 资源的复选框。

9. 选择 **创建堆栈** 部署堆栈。

您可以在 AWS CloudFormation 控制台的 **状态** 列中查看堆栈的状态。正常情况下，您大约 10 分钟后会看到 **CREATE_COMPLETE** 状态。
