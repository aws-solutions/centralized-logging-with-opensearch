# 应用程序负载平衡 (ALB) 日志
[ALB 访问日志](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-access-logs.html) 提供访问日志，用于捕获有关发送到负载均衡器的请求的详细信息。 ALB 为每个负载平衡器节点发布一个日志文件，每 5 分钟一次。


您可以使用日志通控制台或通过部署独立的 CloudFormation 堆栈来将日志摄取到 Amazon OpenSearch Service 或Light Engine 分析引擎中。

!!! important "重要"

    - ELB 日志存储桶区域必须与日志通解决方案部署区域相同。
    - 默认情况下，该解决方案将每天轮换索引。您可以在**额外设置**中进行调整。

## 创建日志摄取（Amazon OpenSearch）
### 使用日志通控制台

1. 登录日志通控制台。
2. 在导航窗格中的 **日志分析管道**，选择 **AWS 服务日志**。
3. 选择**创建日志摄取**按钮。
4. 在 **AWS 服务** 部分，选择 **Elastic Load Balancer**。
5. 选择**Amazon OpenSearch**，选择**下一步**。
6. 在 **指定设置**，选择 **自动** 或 **手动**。
    - 对于 **自动** 模式，在下拉列表中选择应用程序负载均衡器。（如果选择的 ALB 访问日志没有开启，点击 **开启** 开启 ALB 访问日志。）
    - 对于 **手动** 模式，输入 **Application Load Balancer 标识符** 和 **日志位置**。
    - （可选步骤）如果需要跨账户摄取日志，需要先在 **账户** 的下拉列表中选择一个[链接的 AWS 账户](../link-account/index.md)。
7. 选择**下一步**。
8. 在 **指定 OpenSearch 域** 部分，为 **Amazon OpenSearch 域** 选择一个导入的域。
9. 如果您要摄取关联的模板化 Amazon OpenSearch Service 仪表板，请为 **示例仪表板** 选择 **是**。
10. 如果需要，您可以更改目标 Amazon OpenSearch Service 索引的 **索引前缀**。默认前缀是`负载均衡器名称`。
11. 在 **日志生命周期** 部分，输入管理 Amazon OpenSearch Service 索引生命周期的天数。日志通 将为此管道自动创建关联的 [索引状态管理 (ISM)](https://opensearch.org/docs/latest/im-plugin/ism/index/) 策略。
13. 在 **选择日志处理器** 部分，请选择日志处理器。
     - （可选）这些[区域](https://aws.amazon.com/about-aws/whats-new/2023/04/amazon-opensearch-service-ingestion/)现在支持 OSI 作为日志处理器。 当选择 OSI 时，请输入 OCU 的最小和最大数量。 请参阅[此处](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/ingestion.html#ingestion-scaling) 的更多信息。
14. 选择**下一步**。
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

### 查看仪表板

仪表板包括以下可视化。

| Visualization Name               | Source Field                                                                                                                                                                                                                                                     | Description                                                                                                                                               |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Total Requests                   | <ul><li> log event </li></ul>                                                                                                                                                                                                                                    | 显示根据指定时间间隔汇总的事件。                                                                                            |
| Request History                  | <ul><li> log event </li></ul>                                                                                                                                                                                                                                    | 展示一个显示事件分布的柱状图。                                                                                                      |
| Request By Target                | <ul><li> log event</li><li>target_ip </li></ul>                                                                                                                                                                                                                  | 展示一个显示随时间分布和 IP 的柱状图。                                                                                               |
| Unique Visitors                   | <ul><li> client_ip </li></ul>                                                                                                                                                                                                                                    | 显示通过客户端 IP 地址标识的独特访问者。                                                                                                      |
| Status Code                      | <ul><li>elb_status_code</li></ul>                                                                                                                                                                                                                                | 显示对 ALB 发出的请求次数，按 HTTP 状态代码分组 (例如，200、404、403 等)。                      |
| Status History                   | <ul><li>elb_status_code </li></ul>                                                                                                                                                                                                                               | 显示 ALB 在特定时间段内返回的 HTTP 状态代码的历史趋势。                                |
| Status Code Pipe                 | <ul><li>elb_status_code</li></ul>                                                                                                                                                                                                                                | 使用饼图表示基于不同 HTTP 状态代码的请求分布。                                                         |
| Average Processing Time          | <ul><li>request_processing_time</li><li>response_processing_time</li><li>target_processing_time</li></ul>                                                                                                                                                        | 此可视化呈现 ALB 中各种操作所花费的平均时间。                                          |
| Avg. Processing Time History     | <ul><li>request_processing_time</li><li>response_processing_time</li><li>target_processing_time</li></ul>                                                                                                                                                        | 显示 ALB 在特定时间段内每个操作所花费的平均时间的历史趋势。                           |
| Request Verb                     | <ul><li> request_verb</li></ul>                                                                                                                                                                                                                                  | 使用饼图显示发送到 ALB 的请求次数，按 http 请求方法名称分组 (例如，POST、GET、HEAD 等)。     |
| Total Bytes                      | <ul><li>received_bytes</li><li>sent_bytes</li></ul>                                                                                                                                                                                                              | 提供数据传输活动的洞察，包括总字节数传输。                                                         |
| Sent and Received Bytes History  | <ul><li>received_bytes</li><li>sent_bytes</li></ul>                                                                                                                                                                                                              | 显示接收字节数和发送字节数的历史趋势。                                                            |
| SSL Protocol                     | <ul><li> ssl_protocol</li></ul>                                                                                                                                                                                                                                  | 显示发送到 ALB 的请求次数，按 SSL 协议分组。                                                            |
| Top Request URLs                 | <ul><li> request_url</li></ul>                                                                                                                                                                                                                                   | 网页请求视图使您能够分析最常见的网页请求。                                                           |
| Top Client IPs                   | <ul><li>client_ip</li></ul>                                                                                                                                                                                                                                      | 提供前 10 个访问 ALB 的 IP 地址。                                                                   |
| Top User Agents                  | <ul><li> user_agent</li></ul>                                                                                                                                                                                                                                    | 提供前 10 个访问 ALB 的用户代理。                                                                  |
| Target Status                    | <ul><li> target_ip</li><li>target_status_code</li></ul>                                                                                                                                                                                                          | 显示 ALB 目标组中目标的 http 状态码请求次数。                                                      |
| Abnormal Requests                | <ul><li> @timestamp</li><li> client_ip</li><li> target_ip</li><li> elb_status_code</li><li> error_reason</li><li>request_verb</li><li>target_status_code</li><li>target_status_code_list</li><li> request_url</li><li> request_proto</li><li> trace_id</li></ul> | 提供详细的日志事件列表，包括时间戳、客户端 IP、目标 IP 等。                                    |
| Requests by OS                   | <ul><li> ua_os</li></ul>                                                                                                                                                                                                                                         | 显示对 ALB 发出的请求次数，按用户代理操作系统分组。                                            |
| Request by Device                | <ul><li> ua_device</li></ul>                                                                                                                                                                                                                                     | 显示对 ALB 发出的请求次数，按用户代理设备分组。                                               |
| Request by Browser               | <ul><li> ua_browser</li></ul>                                                                                                                                                                                                                                    | 显示对 ALB 发出的请求次数，按用户代理浏览器分组。                                              |
| Request by Category              | <ul><li> ua_category</li></ul>                                                                                                                                                                                                                                   | 显示对 ALB 发出的请求次数，按用户代理类别分组 (例如，PC、移动、平板等)。                   |
| Requests by Countries or Regions | <ul><li> geo_iso_code</li></ul>                                                                                                                                                                                                                                  | 显示对 ALB 发出的请求次数 (按客户端 IP 解析的对应国家或地区)。                                |
| Top Countries or Regions         | <ul><li> geo_country</li></ul>                                                                                                                                                                                                                                   | 前 10 个访问 ALB 的国家。                                                                             |
| Top Cities                       | <ul><li> geo_city</li></ul>                                                                                                                                                                                                                                      | 前 10 个访问 ALB 的城市。                                                                             |

#### 样品仪表板

{%
include-markdown "../include-dashboard.md"
%}

[![elb-db]][elb-db]

[elb-db]: ../../images/dashboards/elb-db.png

## 创建日志摄取（Light Engine）
### 使用日志通控制台

1. 登录日志通控制台。
2. 在导航窗格中的 **日志分析管道**，选择 **AWS 服务日志**。
3. 选择**创建日志摄取**按钮。
4. 在 **AWS 服务** 部分，选择 **Elastic Load Balancer**。
5. 选择**Light Engine**，选择**下一步**。
6. 在 **指定设置**，选择 **自动** 或 **手动**。
    - 对于 **自动** 模式，在下拉列表中选择应用程序负载均衡器。（如果选择的 ALB 访问日志没有开启，点击 **开启** 开启 ALB 访问日志。）
    - 对于 **手动** 模式，输入 **Application Load Balancer 标识符** 和 **日志位置**。
    - （可选步骤）如果需要跨账户摄取日志，需要先在 **账户** 的下拉列表中选择一个[链接的 AWS 账户](../link-account/index.md)。
7. 选择**下一步**。
8. 在**日志处理**中丰富的字段，可以选择的插件有**定位**和**操作系统/代理**，开启丰富的字段会增加数据处理的延迟和加工成本，默认不开启。
8. 在 **指定 Light Engine 配置** 部分，如果您要摄取关联的模板化 Grafana 仪表板，请为 **样例看板** 选择 **是**。
6. 你可以选择一个Grafana，如果需要**导入**一个新的Grafana，可以跳转到[Grafana](../resources/grafana.md)进行配置。
8. 选择一个S3桶存放分区后的日志。并且定义一个用于存放日志表的名称，我们已经为你预定义了一个表名，你可以根据你的业务需求进行修改。
9. 日志处理频率，默认为**5**分钟，最小时间处理频率为**1**分钟。
10. 在 **日志生命周期** 部分，输入管理 日志合并时间 和 日志归档时间。我们为你提供了默认值，你可以根据你的业务需求来进行调整。
11. 选择**下一步**。
12. 如果需要，添加标签。
13. 选择**创建**。

### 使用 CloudFormation 堆栈
此自动化 AWS CloudFormation 模板在 AWS 云中部署 *日志通- ELB Log Ingestion* 解决方案。

|                      | 在 AWS 控制台中启动                                        | 下载模板                                            |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| AWS 海外区域 | [![启动堆栈](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/MicroBatchAwsServicesAlbPipeline.template){target=_blank} | [模板](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/MicroBatchAwsServicesAlbPipeline.template) |
| AWS 中国区域    | [![启动堆栈](../../images/launch-stack.png)](https://console.amazonaws.cn/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/MicroBatchAwsServicesAlbPipeline.template){target=_blank} | [模板](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/MicroBatchAwsServicesAlbPipeline.template) |


1. 登录 AWS 管理控制台并选择以上按钮以启动 AWS CloudFormation 模板。您还可以下载模板开始部署。

2. 要在不同的 AWS 区域中启动堆栈，请使用控制台导航栏中的区域选择器。

3. 在 **创建堆栈** 页面上，验证正确的模板 URL 显示在 **Amazon S3 URL** 文本框中，然后选择 **下一步**。

4. 在 **指定堆栈详细信息** 页面上，为您的解决方案堆栈分配一个名称。

5. 在 **参数** 下，查看模板的参数并根据需要进行修改。此解决方案使用以下参数。

    - **Pipeline settings** 专用参数

    | 参数                             | 默认          | 描述                                                                                                       |
    | --------------------------------| ---------- |----------------------------------------------------------------------------------------------------------|
    | Pipeline Id                | `<需要输入>` | pipeline的唯一标识符，如果您需要创建多个ALB pipeline，将不同的ALB日志写入到不同的表中时，则必须保证唯一性，可以通过[uuidgenerator](https://www.uuidgenerator.net/version4)生成唯一的Pipeline Id。                                                                                          |
    | Staging Bucket Prefix              | AWSLogs/ALBLogs | 日志在临时存储区的存放目录，不同pipeline要保证Prefix的唯一性且无重叠。                                                                                        |

    - **Destination settings** 专用参数

    | 参数                             | 默认          | 描述                                                                                                       |
    | --------------------------------| ---------- |----------------------------------------------------------------------------------------------------------|
    | Centralized Bucket Name | `<需要输入>` | 输入centralized的s3 bucket名称，例如centralized-logging-bucket。           |
    | Centralized Bucket Prefix     |  datalake                | 输入centralized bucket的路径前缀，默认为datalake，意味着您的数据库的location为s3://{Centralized Bucket Name}/{Centralized Bucket Prefix}/amazon_cl_centralized。 |
    | Centralized Table Name              | ALB | 数据写入到Centralized数据库的表名称，按需定义，默认值为ALB。                                                                                        |
     | Enrichment Plugins              | `<可选输入>` | 丰富的字段，可以选择的插件有定位和操作系统/代理，开启丰富的字段会增加数据处理的延迟和加工成本，默认不开启。                                                                                       |

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
    | Grafana URL   |  `<可选输入>`                | Grafana访问的URL，例如https://alb-72277319.us-west-2.elb.amazonaws.com。 |
    | Grafana Service Account Token              | `<可选输入>` | Grafana Service Account Token：Grafana中创建的Service Account Token。  
                                                                                          |

   


6. 选择**下一步**。

7. 在 **配置堆栈选项** 页面上，选择 **下一步**。

8. 在 **审核** 页面上，查看并确认设置。选中确认模板创建 AWS Identity and Access Management (IAM) 资源的复选框。

9. 选择 **创建堆栈** 部署堆栈。

您可以在 AWS CloudFormation 控制台的 **状态** 列中查看堆栈的状态。正常情况下，您大约 10 分钟后会看到 **CREATE_COMPLETE** 状态。


### 查看仪表板

该仪表板包括以下可视化图表。

| 可视化名称                        | 源字段                                  | 描述                                                                                                                                         |
|-------------------------------------------|-----------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------|
| Filters                                   | Filters                                       | 可以通过查询过滤条件对以下数据进行筛选。                                                                                                         |
| Total Requests                            | log event                                     | 显示根据指定时间间隔汇总的事件。                                                                                                                 |
| Unique Visitors                           | client_ip                                     | 显示通过客户端 IP 地址标识的独特访问者。                                                                                                           |
| Requests History                          | log event                                     | 展示一个显示事件分布的柱状图。                                                                                                                     |
| Request By Target                         | log event <br/>target_ip                         | 展示一个显示随时间分布和 IP 的柱状图。                                                                                                             |
| HTTP Status Code                          | elb_status_code                               | 显示对 ALB 发出的请求次数，按 HTTP 状态代码分组 (例如，200、404、403 等)。                                                                          |
| Status Code History                       | elb_status_code                               | 显示 ALB 在特定时间段内返回的 HTTP 状态代码的历史趋势。                                                                                             |
| Status Code Pie                           | elb_status_code                               | 使用饼图表示基于不同 HTTP 状态代码的请求分布。                                                                                                     |
| Average Processing Time                   | request_processing_time<br/> response_processing_time <br/>target_processing_time | 此可视化呈现 ALB 中各种操作所花费的平均时间。                                                                                                 |
| Avg. Processing Time History              | request_processing_time <br/>response_processing_time <br/>target_processing_time | 显示 ALB 在特定时间段内每个操作所花费的平均时间的历史趋势。                                                                                         |
| HTTP Method                               | request_verb                                  | 使用饼图显示发送到 ALB 的请求次数，按 HTTP 请求方法名称分组 (例如，POST、GET、HEAD 等)。                                                            |
| Total Bytes                               | received_bytes <br/>sent_bytes                    | 提供数据传输活动的洞察，包括总字节数传输。                                                                                                         |
| Sent and Received Bytes History           | received_bytes <br/>sent_bytes                    | 显示接收字节数和发送字节数的历史趋势。                                                                                                               |
| SSL Protocol                              | ssl_protocol                                  | 显示发送到 ALB 的请求次数，按 SSL 协议分组。                                                                                                         |
| Top Request URLs                          | request_url                                   | 网页请求视图使您能够分析最常见的网页请求。                                                                                                         |
| Top Client IPs                            | client_ip                                     | 提供前 10 个访问 ALB 的 IP 地址。                                                                                                                   |
| Bad Requests                              | type client_ip <br/>target_group_arn <br/>target_ip <br/>elb_status_code <br/>request_verb <br/>request_url <br/>ssl_protocol <br/>received_bytes <br/>sent_bytes | 提供详细的日志事件列表，包括时间戳、客户端 IP、目标 IP 等。                                                                                    |
| Requests by OS                            | ua_os                                         | 显示对 ALB 发出的请求次数，按用户代理操作系统分组。                                                                                                 |
| Requests by Device                        | ua_device                                     | 显示对 ALB 发出的请求次数，按用户代理设备分组。                                                                                                     |
| Requests by Browser                       | ua_browser                                    | 显示对 ALB 发出的请求次数，按用户代理浏览器分组。                                                                                                   |
| Requests by Category                      | ua_category                                   | 显示对 ALB 发出的请求次数，按用户代理类别分组 (例如，PC、移动、平板等)。                                                                              |
| Requests by Countries or Regions          | geo_iso_code                                  | 显示对 ALB 发出的请求次数 (按客户端 IP 解析的对应国家或地区)。                                                                                     |
| Top Countries or Regions                  | geo_country                                   | 前 10 个访问 ALB 的国家。                                                                                                                           |
| Top Cities                                | geo_city                                      | 前 10 个访问 ALB 的城市。                                                                                                                           |