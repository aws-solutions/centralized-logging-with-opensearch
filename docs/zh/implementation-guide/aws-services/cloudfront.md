# Amazon CloudFront 日志

[CloudFront 标准日志](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/AccessLogs.html) 为每个发送到分发的请求提供详细的记录。

## 创建日志摄取
您可以使用日志通控制台或通过部署独立的 CloudFormation 堆栈来将日志摄取到 Amazon OpenSearch Service 中。

!!! important "Important"
    - CloudFront 日志存储桶必须与日志通位于同一区域。
    - 默认情况下，该解决方案将每天轮换索引。您可以在**额外设置**中进行调整。

### 使用日志通控制台
1. 登录日志通控制台。
2. 在导航窗格中的 **日志分析管道** 下，选择 **AWS 服务日志**。
3. 选择**创建日志摄取**按钮。
4. 在 **AWS 服务** 部分，选择 **Amazon CloudFront**。
5. 选择**下一步**。
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

## 查看仪表板

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

### 样品仪表板

{%
include-markdown "../include-dashboard.md"
%}

[![cloudfront-db]][cloudfront-db]

[cloudfront-db]: ../../images/dashboards/cloudfront-db.png
