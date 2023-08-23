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

## 查看仪表板

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

### 样品仪表板

{%
include-markdown "../include-dashboard.md"
%}

[![elb-db]][elb-db]

[elb-db]: ../../images/dashboards/elb-db.png

