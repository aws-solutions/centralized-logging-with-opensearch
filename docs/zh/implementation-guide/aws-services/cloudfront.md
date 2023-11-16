# Amazon CloudFront 日志

[CloudFront 标准日志](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/AccessLogs.html) 为每个发送到分发的请求提供详细的记录。

您可以使用日志通控制台或通过部署独立的 CloudFormation 堆栈来将日志摄取到 Amazon OpenSearch Service 中。

!!! important "Important"
    - CloudFront 日志存储桶必须与日志通位于同一区域。
    - 默认情况下，该解决方案将每天轮换索引。您可以在**额外设置**中进行调整。

## 创建日志摄取（Amazon OpenSearch）

### 使用日志通控制台
1. 登录日志通控制台。
2. 在导航窗格中的 **日志分析管道** 下，选择 **AWS 服务日志**。
3. 选择**创建日志摄取**按钮。
4. 在 **AWS 服务** 部分，选择 **Amazon CloudFront**。
5. 选择**Amazon OpenSearch**，选择**下一步**。
6. 在 **指定设置** 下，为 **CloudFront 日志启用**选择 **自动** 或 **手动**。自动模式将自动检测 CloudFront 日志位置。
    - 对于**自动模式**，从下拉列表中选择 CloudFront 分配。
    - 对于 **手动模式**，输入 **CloudFront Distribution ID** 和 **CloudFront 标准日志位置**。
    - （可选步骤）如果需要跨账户摄取日志，需要先在 **账户** 的下拉列表中选择一个[链接的 AWS 账户](../link-account/index.md)。
7. 选择**下一步**。
8. 在 **指定 OpenSearch 域** 部分，为 **Amazon OpenSearch 域** 选择一个导入的域。
9. 如果您要摄取关联的模板化 Amazon OpenSearch Service 仪表板，请为 **示例仪表板** 选择 **是**。
10. 如果需要，您可以更改目标 Amazon OpenSearch Service 索引的 **索引前缀**。默认前缀是 CloudFront 分配 ID。
11. 在 **日志生命周期** 部分，输入管理 Amazon OpenSearch Service 索引生命周期的天数。日志通 将为此管道自动创建关联的 [索引状态管理 (ISM)](https://opensearch.org/docs/latest/im-plugin/ism/index/) 策略。
12. 选择**下一步**。
13. 如果需要，添加标签。
14. 选择**创建**。

### 使用 CloudFormation 堆栈
此自动化 AWS CloudFormation 模板在 AWS 云中部署 *日志通- CloudFront 标准日志摄取* 解决方案。

|                      | 在 AWS 控制台中启动                                                                                                                                                                                                                  | 下载模板                                                                                            |
| -------------------- |-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------|
| AWS 海外区域 | [![启动堆栈](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CloudFrontLog.template){target=_blank} | [模板](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CloudFrontLog.template) |
| AWS 中国区域 | [![启动堆栈](../../images/launch-stack.png)](https://console.amazonaws.cn/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CloudFrontLog.template){target=_blank}   | [模板](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CloudFrontLog.template) |

{%
include-markdown "include-cfn-plugins-common.md"
%}

### 查看仪表板

仪表板包括以下可视化。

| Visualization Name                     | Source Field                                                               | Description                                                                                                                                                         |
| -------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Total Requests                         | <ul><li> log event </li></ul>                                              | 显示 Amazon CloudFront 接收的总观众请求次数，包括所有 HTTP 方法以及 HTTP 和 HTTPS 请求。                                                                                                 |
| Edge Locations                         | <ul><li> x-edge-location </li></ul>                                        | 显示代表 CloudFront 边缘服务器位置比例的饼图。                                                                                                                                       |
| Request History                        | <ul><li> log event </li></ul>                                              | 展示一个显示事件分布的柱状图。                                                                                                                                     |
| Unique Visitors                        | <ul><li> c-ip </li></ul>                                                   | 显示由客户端 IP 地址识别的唯一访客。                                                                                                                            |
| Cache Hit Rate                         | <ul><li> sc-bytes </li></ul>                                               | 显示从 CloudFront 缓存直接为您的观众请求提供内容的比例，而不是去原始服务器获取内容。                                                                                          |
| Result Type                            | <ul><li> x-edge-response-result-type </li></ul>                            | 显示对所选 CloudFront 分发的命中、未命中和错误的百分比：<ul><li>Hit - 来自 CloudFront 边缘缓存的对象的观众请求。在访问日志中，这些是 x-edge-response-result-type 值为 Hit 的请求。</li><li>Miss - 对象不在边缘缓存中的观众请求，所以 CloudFront 必须从您的源获取对象。在访问日志中，这些是 x-edge-response-result-type 值为 Miss 的请求。</li><li>Error - 导致错误的观众请求，所以 CloudFront 没有提供对象。在访问日志中，这些是 x-edge-response-result-type 值为 Error、LimitExceeded 或 CapacityExceeded 的请求。</li></ul> 图表不包括刷新命中-在边缘缓存中但已过期的对象的请求。在访问日志中，刷新命中是 x-edge-response-result-type 值为 RefreshHit 的请求。                     |
| Top Miss URI                           | <ul><li> cs-uri-stem</li> <li> cs-method </li>  </ul>                      | 显示不在缓存中的前 10 个请求对象。                                                                                                                             |
| Bandwidth                              | <ul><li> cs-bytes</li><li> sc-bytes</li></ul>                              | 提供来自 CloudFront 边缘位置的数据传输活动的洞察。                                                                                                                       |
| Bandwidth History                      | <ul><li> cs-bytes</li><li> sc-bytes </li></ul>                             | 显示来自 CloudFront 边缘位置的数据传输活动的历史趋势。                                                                                                                       |
| Top Client IPs                         | <ul><li> c-ip</li></ul>                                                    | 提供访问您的 Amazon CloudFront 的前 10 个 IP 地址。                                                                                                               |
| Status Code Count                      | <ul><li> sc-status</li></ul>                                               | 显示按 HTTP 状态代码（例如 200、404、403 等）分组的对 Amazon CloudFront 的请求计数。                                                                                       |
| Status History                         | <ul><li> @timestamp</li><li>sc-status </li></ul>                           | 显示 Amazon CloudFront 在特定时间段返回的 HTTP 状态代码的历史趋势。                                                                                                  |
| Status Code                            | <ul><li> sc-status</li></ul>                                               | 标识对 EC2 资源进行更改的用户或 IAM 角色，协助追踪和修改的责任。                                                                                                   |
| Average Time Taken                     | <ul><li> time-taken</li></ul>                                              | 此可视化计算并显示 Amazon CloudFront 中各种操作的平均时间（例如 GET、PUT 请求的平均时间等）。                                                                      |
| Average Time History                   | <ul><li>time-taken</li><li>time-to-first-byte</li><li>@timestamp</li></ul> | 显示 Amazon CloudFront 中各种操作的平均时间的历史趋势。                                                                                                                |
| Http Method                            | <ul><li> cs-method</li></ul>                                               | 使用饼图显示按 http 请求方法名称（例如 POST、GET、HEAD 等）分组的对 Amazon CloudFront 的请求计数。                                                                    |
| Average Time To First Byte             | <ul><li> time-to-first-byte</li></ul>                                      | 提供原始服务器响应第一个字节的响应所需的平均时间。                                                                                                                         |
| Top Request URIs                       | <ul><li> cs-uri-stem</li><li>cs-method</li></ul>                           | 提供访问您的 CloudFront 的前 10 个请求 URIs。                                                                                                                           |
| Top User Agents                        | <ul><li> cs-user-agent</li></ul>                                           | 提供访问您的 CloudFront 的前 10 个用户代理。                                                                                                                         |
| Edge Location Heatmap                  | <ul><li> x-edge-location</li><li>x-edge-result-type</li></ul>              | 显示代表每个边缘位置的结果类型的热图。                                                                                                                              |
| Top Referers                           | <ul><li> cs-referer</li></ul>                                              | 与 Amazon CloudFront 访问的前 10 个引荐者。                                                                                                                           |
| Top Countries or Regions               | <ul><li> c_country</li></ul>                                               | 与 Amazon CloudFront 访问的前 10 个国家。                                                                                                                            |

#### 样品仪表板

## 创建日志摄取（Light Engine）

### 使用日志通控制台
1. 登录日志通控制台。
2. 在导航窗格中的 **日志分析管道** 下，选择 **AWS 服务日志**。
3. 选择**创建日志摄取**按钮。
4. 在 **AWS 服务** 部分，选择 **Amazon CloudFront**。
5. 选择**Light Engine**， 选择**下一步**。
6. 在 **指定设置** 下，为 **CloudFront 日志启用**选择 **自动** 或 **手动**。自动模式将自动检测 CloudFront 日志位置。
    - 对于**自动模式**，从下拉列表中选择 CloudFront 分配。
    - 对于 **手动模式**，输入 **CloudFront Distribution ID** 和 **CloudFront 标准日志位置**。
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
此自动化 AWS CloudFormation 模板在 AWS 云中部署 *日志通- CloudFront 标准日志摄取* 解决方案。

|                      | 在 AWS 控制台中启动                                                                                                                                                                                                                  | 下载模板                                                                                            |
| -------------------- |-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------|
| AWS 海外区域 | [![启动堆栈](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/MicroBatchAwsServicesCloudFrontPipeline.template){target=_blank} | [模板](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/MicroBatchAwsServicesCloudFrontPipeline.template) |
| AWS 中国区域 | [![启动堆栈](../../images/launch-stack.png)](https://console.amazonaws.cn/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/MicroBatchAwsServicesCloudFrontPipeline.template){target=_blank}   | [模板](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/MicroBatchAwsServicesCloudFrontPipeline.template) |

1. 登录 AWS 管理控制台并选择以上按钮以启动 AWS CloudFormation 模板。您还可以下载模板开始部署。

2. 要在不同的 AWS 区域中启动堆栈，请使用控制台导航栏中的区域选择器。

3. 在 **创建堆栈** 页面上，验证正确的模板 URL 显示在 **Amazon S3 URL** 文本框中，然后选择 **下一步**。

4. 在 **指定堆栈详细信息** 页面上，为您的解决方案堆栈分配一个名称。

5. 在 **参数** 下，查看模板的参数并根据需要进行修改。此解决方案使用以下参数。

    - **Pipeline settings** 专用参数

    | 参数                             | 默认          | 描述                                                                                                       |
    | --------------------------------| ---------- |----------------------------------------------------------------------------------------------------------|
    | Pipeline Id                | `<需要输入>` | pipeline的唯一标识符，如果您需要创建多个ELB pipeline，将不同的CloudFront日志写入到不同的表中时，则必须保证唯一性，可以通过[uuidgenerator](https://www.uuidgenerator.net/version4)生成唯一的。                                                                                          |
    | Staging Bucket Prefix              | AWSLogs/CloudFrontLogs | 日志在临时存储区的存放目录，不同pipeline要保证Prefix的唯一性且无重叠。                                                                                        |

    - **Destination settings** 专用参数

    | 参数                             | 默认          | 描述                                                                                                       |
    | --------------------------------| ---------- |----------------------------------------------------------------------------------------------------------|
    | Centralized Bucket Name | `<需要输入>` | 输入centralized的s3 bucket名称，例如centralized-logging-bucket。           |
    | Centralized Bucket Prefix     |  datalake                | 输入centralized bucket的路径前缀，默认为datalake，意味着您的数据库的location为s3://{Centralized Bucket Name}/{Centralized Bucket Prefix}/amazon_cl_centralized。 |
    | Centralized Table Name              | CloudFront | 数据写入到Centralized数据库的表名称，按需定义，默认值为CloudFront。                                                                                        |
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
    | Grafana URL   |  `<可选输入>`                | Grafana访问的URL，例如https://cloudfront-72277319.us-west-2.elb.amazonaws.com。 |
    | Grafana Service Account Token              | `<可选输入>` | Grafana Service Account Token：Grafana中创建的Service Account Token。  
                                                                                          |

   


6. 选择**下一步**。

7. 在 **配置堆栈选项** 页面上，选择 **下一步**。

8. 在 **审核** 页面上，查看并确认设置。选中确认模板创建 AWS Identity and Access Management (IAM) 资源的复选框。

9. 选择 **创建堆栈** 部署堆栈。

您可以在 AWS CloudFormation 控制台的 **状态** 列中查看堆栈的状态。正常情况下，您大约 10 分钟后会看到 **CREATE_COMPLETE** 状态。


### 查看仪表板

该仪表板包括以下可视化图表。

| Visualization Name                                | Source Field                                        | Description                                                                                                                                                                                                                                                                                   |
|---------------------------------------------------|-----------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Filters                                           | Filters                                             | 可以通过查询过滤条件对以下数据进行筛选。                                                                                                                                                                                                                                                                   |
| Total Requests                                    | log event                                           | 显示 Amazon CloudFront 接收的总观众请求次数，包括所有 HTTP 方法以及 HTTP 和 HTTPS 请求。                                                                                                                                                                                                               |
| Unique Vistors                                    | c-ip                                                | 显示由客户端 IP 地址识别的唯一访客。                                                                                                                                                                                                                                                                       |
| Requests History                                  | log event                                           | 展示一个显示事件分布的柱状图。                                                                                                                                                                                                                                                                           |
| Request By Edge Location                          | x-edge-location                                     | 显示代表 CloudFront 边缘服务器位置比例的饼图。                                                                                                                                                                                                                                                           |
| HTTP Status Code                                  | sc-status                                           | 显示按 HTTP 状态代码（例如 200、404、403 等）分组的对 Amazon CloudFront 的请求计数。                                                                                                                                                                                                                     |
| Status Code History                               | sc-status                                           | 显示 Amazon CloudFront 在特定时间段返回的 HTTP 状态代码的历史趋势。                                                                                                                                                                                                                                       |
| Status Code Pie                                   | sc-status                                           | 使用饼图表示基于不同 HTTP 状态代码的请求分布。                                                                                                                                                                                                                                                           |
| Average Processing Time                           | time-taken<br>time-to-first-byte                 | 此可视化计算并显示 Amazon CloudFront 中各种操作的平均时间（例如 GET、PUT 请求的平均时间等）。                                                                                                                                                                                                            |
| Avg. Processing Time History                      | time-taken<br>time-to-first-byte                 | 显示 Amazon CloudFront 中各种操作的平均时间的历史趋势。                                                                                                                                                                                                                                                    |
| HTTP Method                                       | cs-method                                           | 使用饼图显示按 http 请求方法名称（例如 POST、GET、HEAD 等）分组的对 Amazon CloudFront 的请求计数。                                                                                                                                                                                                       |
| Total Bytes                                       | cs-bytes<br>sc-bytes                             | 提供数据传输活动的洞察，包括总字节数传输。                                                                                                                                                                                                                                                               |
| Response Bytes History                            | cs-bytes<br>sc-bytes                             | 显示接收字节数和发送字节数的历史趋势。                                                                                                                                                                                                                                                                   |
| Edge Response Type                                | x-edge-response-result-type                         | 显示对所选 CloudFront 分发的命中、未命中和错误的百分比：<br>Hit - 来自 CloudFront 边缘缓存的对象的观众请求。在访问日志中，这些是 x-edge-response-result-type 值为 Hit 的请求。<br>Miss - 对象不在边缘缓存中的观众请求，所以 CloudFront 必须从您的源获取对象。在访问日志中，这些是 x-edge-response-result-type 值为 Miss 的请求。<br>Error - 导致错误的观众请求，所以 CloudFront 没有提供对象。在访问日志中，这些是 x-edge-response-result-type 值为 Error、LimitExceeded 或 CapacityExceeded 的请求。<br>图表不包括刷新命中-在边缘缓存中但已过期的对象的请求。在访问日志中，刷新命中是 x-edge-response-result-type 值为 RefreshHit 的请求。 |
| Requests / Origin Requests                        | log event                                           | 显示对 CloudFront 发出的请求次数和回源的请求次数。                                                                                                                                                                                                                                                        |
| Requests / Origin Requests Latency                | log event<br>time-taken                           | 显示从客户端到 CloudFront 的请求时延和回源请求时延。                                                                                                                                                                                                                                                      |
| Top 20 URLs with most requests                     | log event                                           | 根据请求数量统计的前 20 个 URL。                                                                                                                                                                                                                                                                         |
| Requests 3xx / 4xx / 5xx error rate                | log event<br>sc-status                            | 显示从客户端到 CloudFront 的 3xx/4xx/5xx 状态码比例。                                                                                                                                                                                                                                                      |
| Origin Requests 3xx / 4xx / 5xx error rate         | log eventsc-status                            | 显示从 CloudFront 到源的 3xx/4xx/5xx 状态码比例。                                                                                                                                                                                                                                                       |
| Top Referring Domains                             | cs(Referer)                                         | 根据请求中的 Referer 标头统计的前 20 个域名。                                                                                                                                                                                                                                                            |
| Top User Agents                                   | cs(User-Agent)                                      | 根据请求中的 User-Agent 标头统计的前 20 个用户代理。                                                                                                                                                                                                                                                      |
| Viewer Country                                    | x-edge-location<br>clientCountry<br>x-countryname | 使用地图显示观众国家/地区的分布。                                                                                                                                                                                                                                                                       |
| Viewer City                                       | x-edge-location<br>clientCountry<br>clientCity    | 使用地图显示观众城市的分布。                                                                                                                                                                                                                                                                           |
| SSL Protocol Version                              | ssl-protocol                                      | 显示使用的 SSL 协议版本的比例。                                                                                                                                                                                                                                                                         |
| SSL Cipher Suite                                  | ssl-cipher                                        | 显示使用的 SSL 密码套件的比例。                                                                                                                                                                                                                                                                         |
| SSL Handshake Time                                | ssl-handshake-time                                | 显示 SSL 握手时间的分布。                                                                                                                                                                                                                                                                               |
| SSL Handshake Time History                        | ssl-handshake-time                                | 显示 SSL 握手时间的历史趋势。                                                                                                                                                                                                                                                                           |
| SSL Handshake Failures                            | ssl-handshake-failures                            | 显示 SSL 握手失败的次数。                                                                                                                                                                                                                                                                               |
| SSL Handshake Failures History                    | ssl-handshake-failures                            | 显示 SSL 握手失败的历史趋势。                                                                                                                                                                                                                                                                           |
| Cache Hit Rate                                    | x-edge-response-result-type                       | 显示 CloudFront 边缘缓存命中的比例。                                                                                                                                                                                                                                                                   |
| Cache Hit Rate History                            | x-edge-response-result-type                       | 显示 CloudFront 边缘缓存命中率的历史趋势。                                                                                                                                                                                                                                                              |
| Cache Hit Rate by File Extension                  | x-edge-response-result-type<br>cs-uri-extension   | 显示不同文件扩展名的边缘缓存命中率。                                                                                                                                                                                                                                                                   |
| Cache Hit Rate by Content Type                    | x-edge-response-result-type<br>cs(Content-Type)   | 显示不同内容类型的边缘缓存命中率。                                                                                                                                                                                                                                                                     |
| Cache Hit Rate by HTTP Method                      | x-edge-response-result-type<br>cs-method           | 显示不同 HTTP 方法的边缘缓存命中率。                                                                                                                                                                                                                                                                   |
| Cache Hit Rate by HTTP Status Code                | x-edge-response-result-type<br>sc-status           | 显示不同 HTTP 状态码的边缘缓存命中率。                                                                                                                                                                                                                                                                  |
| Cache Hit Rate by Query String                    | x-edge-response-result-type<br>cs-uri-query       | 显示带有不同查询字符串的边缘缓存命中率。                                                                                                                                                                                                                                                               |
| Cache Hit Rate by Host Header                     | x-edge-response-result-type<br>cs(Host)           | 显示不同主机头的边缘缓存命中率。                                                                                                                                                                                                                                                                       |
| Cache Hit Rate by Referer Header                  | x-edge-response-result-type<br>cs(Referer)        | 显示不同 Referer 头的边缘缓存命中率。                                                                                                                                                                                                                                                                   |
| Cache Hit Rate by User Agent Header               | x-edge-response-result-type<br>cs(User-Agent)     | 显示不同 User-Agent 头的边缘缓存命中率。                                                                                                                                                                                                                                                                |
| Cache Hit Rate by Cookie Header                   | x-edge-response-result-type<br>cs(Cookie)         | 显示不同 Cookie 头的边缘缓存命中率。                                                                                                                                                                                                                                                                    |
| Cache Hit Rate by Accept-Encoding Header          | x-edge-response-result-type<br>cs(Accept-Encoding)| 显示不同 Accept-Encoding 头的边缘缓存命中率。                                                                                                                                                                                                                                                           |
| Cache Hit Rate by Content Encoding                | x-edge-response-result-type<br>cs(Content-Encoding)| 显示不同内容编码的边缘缓存命中率。                                                                                                                                                                                                                                                                     |
| Cache Hit Rate by Vary Header                     | x-edge-response-result-type<br>cs(Vary)           | 显示不同 Vary 头的边缘





[![cloudfront-db]][cloudfront-db]

[cloudfront-db]: ../../images/dashboards/cloudfront-db.png
