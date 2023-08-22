# AWS WAF 日志
[WAF 访问日志](https://docs.aws.amazon.com/waf/latest/developerguide/logging.html) 提供有关由您的 Web ACL 分析的流量的详细信息。 记录的信息包括 AWS WAF 从您的 AWS 资源收到 Web 请求的时间、有关请求的详细信息以及有关请求匹配的规则的详细信息。

## 创建日志摄取
您可以使用日志通控制台或通过部署独立的 CloudFormation 堆栈来将日志摄取到 Amazon OpenSearch Service 中。

!!! important "重要提示"

    - 日志通解决方案必须与 Web ACL 部署在同一个可用区中，否则您将无法创建WAF日志摄取。
    例如:
        - 如果您的 Web ACL 与 Global Cloudfront 相关联，那么您的日志通 必须部署在 us-east-1。
        - 如果您的 Web ACL 与在 Ohio 的 AWS 资源相关联，那么您的日志通 必须部署在 us-east-2。
    - WAF 日志存储桶必须和日志通 位于同一区域。
    - 日志通 不支持 [WAF Classic](https://docs.aws.amazon.com/waf/latest/developerguide/classic-waf-chapter.html) 产生的日志。您可以了解如何[从 WAF Classic 迁移到新 AWS WAF](https://aws.amazon.com/blogs/security/migrating-rules-from-aws-waf-classic-to-new-aws-waf/)。
    - 默认情况下，该解决方案将每天轮换索引。您可以在**额外设置**中进行调整。

### 使用日志通控制台

1. 登录日志通控制台。
2. 在导航窗格中的 **日志分析管道** 下，选择 **AWS 服务日志**。
3. 选择**创建日志摄取**按钮。
4. 在 **AWS 服务** 部分，选择 **AWS WAF**。
5. 选择**下一步**。
6. 在 **指定设置** 下，选择 **自动** 或 **手动**。
    - 对于 **自动** 模式，在下拉列表中选择一个 Web ACL。
    - 对于 **手动** 模式，输入 **Web ACL name**。
    - (可选步骤) 如果需要跨账户摄取日志，需要先在 **账户** 的下拉列表中选择一个[链接的 AWS 账户](../link-account/index.md)。
7. 在 **摄取选项** 中. 选择 **采样** 或 **全量**.
    - 对于 **采样**， 请输入摄取采样日志的频率。
    - 对于 **全量**， 如果未启用 Web ACL 日志，请单击 **开启** 启用访问日志。或在手动模式中输入日志位置。请注意，使用日志通将自动启用使用 Kinesis Data Firehose 流作为 WAF 日志的目标。
8. 选择**下一步**。
9. 在 **指定 OpenSearch 域** 部分，为 **Amazon OpenSearch 域** 选择一个导入的域。
10. 如果您要摄取关联的模板化 Amazon OpenSearch Service 仪表板，请为 **示例仪表板** 选择 **是**。
11. 如果需要，您可以更改目标 Amazon OpenSearch Service 索引的 **索引前缀**。默认前缀是`Web ACL 名称`。
12. 在 **日志生命周期** 部分，输入管理 Amazon OpenSearch Service 索引生命周期的天数。日志通 将为此管道自动创建关联的 [索引状态管理 (ISM)](https://opensearch.org/docs/latest/im-plugin/ism/index/) 策略。
13. 选择**下一步**。
14. 如果需要，添加标签。
15. 选择**创建**。

### 使用 CloudFormation 堆栈
此自动化 AWS CloudFormation 模板在 AWS 云中部署 *日志通- waf Log Ingestion* 解决方案。


|                                         | 从 AWS 控制台启动                                                                                                                                                                                                                                                       | 下载模板                                            |
|-----------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------| ------------------------------------------------------------ |
| AWS 海外区域 (全量请求)    | [![启动堆栈](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/WAFLog.template){target=_blank}                    | [模板](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/WAFLog.template) |
| AWS 中国区域 (全量请求)       | [![启动堆栈](../../images/launch-stack.png)](https://console.amazonaws.cn/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/WAFLog.template){target=_blank}        | [模板](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/WAFLog.template) |
| AWS 海外区域 (采样请求) | [![启动堆栈](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/WAFSampledLog.template){target=_blank}             | [模板](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/WAFSampledLog.template) |
| AWS 中国区域 (采样请求)    | [![启动堆栈](../../images/launch-stack.png)](https://console.amazonaws.cn/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/WAFSampledLog.template){target=_blank} | [模板](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/WAFSampledLog.template) |

1. 登录 AWS 管理控制台并选择以上按钮以启动 AWS CloudFormation 模板。您还可以下载模板开始部署。

2. 要在不同的 AWS 区域中启动堆栈，请使用控制台导航栏中的区域选择器。

3. 在 **创建堆栈** 页面上，验证正确的模板 URL 显示在 **Amazon S3 URL** 文本框中，然后选择 **下一步**。

4. 在 **指定堆栈详细信息** 页面上，为您的解决方案堆栈分配一个名称。

5. 在 **参数** 下，查看模板的参数并根据需要进行修改。此解决方案使用以下参数。

    - **全量请求** 专用参数

    | 参数                             | 默认          | 描述                                                                                                       |
    | --------------------------------| ---------- |----------------------------------------------------------------------------------------------------------|
    | Log Bucket Name                | `<需要输入>` | 存储日志的 S3 存储桶名称。                                                                                          |
    | Log Bucket Prefix              | `<需要输入>` | 存储日志的 S3 存储桶路径前缀。                                                                                        |

    - **采样请求** 专用参数

    | 参数                             | 默认          | 描述                                                                                                       |
    | --------------------------------| ---------- |----------------------------------------------------------------------------------------------------------|
    | WebACL Names | `<需要输入>` | WebACL 名称列表，以逗号分隔。           |
    | Interval     | `1`                | 获取采样日志的默认时间间隔（以分钟为单位）。 |

    - 通用参数

    | 参数                             | 默认          | 描述                                                                                                       |
    | --------------------------------| ---------- |----------------------------------------------------------------------------------------------------------|
    | Log Bucket Name                | `<需要输入>` | 存储日志的 S3 存储桶名称。                                                                                          |
    | Log Bucket Prefix              | `<需要输入>` | 存储日志的 S3 存储桶路径前缀。                                                                                        |
    | Log Source Account ID          | `<可选输入>`  | 存储日志的 S3 存储桶所在账户 ID. 对于跨账户日志摄取是必填 (需要先 [添加一个成员账户](../link-account/index.md))。 默认情况下, 会使用您在 **步骤 1** 中登录的账户 ID。 |
    | Log Source Region              | `<可选输入>` | 存储日志的 S3 存储桶所在的区域. 默认情况下, 会使用您在 **步骤 2** 中指定的区域。                                                          |
    | Log Source Account Assume Role | `<可选输入>` | 跨账户日志摄取所需要使用的 IAM Role. 对于跨账户日志摄取是必填 (需要先 [添加一个成员账户](../link-account/index.md))。                                 |
    | Engine Type                    | OpenSearch | OpenSearch 的引擎类型。选择 OpenSearch 或 Elasticsearch。                                                          |
    | OpenSearch Domain Name         | `<需要输入>` | Amazon OpenSearch 集群的域名。                                                                                 |
    | OpenSearch Endpoint            | `<需要输入>` | OpenSearch 端点 URL。例如，`vpc-your_opensearch_domain_name-xcvgw6uu2o6zafsiefxubwuohe.us-east-1.es.amazonaws.com`。 |
    | Index Prefix                   | `<需要输入>` | 日志的 OpenSearch 索引的公共前缀。索引名称将为 `<Index Prefix>-<log-type>-<YYYY-MM-DD>`。                                  |
    | Create Sample Dashboard        | Yes | 是否创建示例 OpenSearch 仪表板。                                                                                   |
    | VPC ID                         | `<需要输入>` | 选择可以访问 OpenSearch 域的 VPC。日志处理 Lambda 将驻留在选定的 VPC 中。                                                      |
    | Subnet IDs                     | `<需要输入>` | 选择至少两个可以访问 OpenSearch 域的子网。日志处理 Lambda 将驻留在子网中。确保子网可以访问 Amazon S3 服务。                                    |
    | Security Group ID              | `<需要输入>` | 选择将与日志处理 Lambda 关联的安全组。确保安全组有权访问 OpenSearch 域。                                                           |
    | S3 Backup Bucket               | `<需要输入>` | 用于存储失败提取日志的 S3 备份存储桶名称。                                                                                  |
    | KMS-CMK ARN                | `<可选输入>` | 用于加密的 KMS-CMK ARN。 留空以创建新的 KMS CMK。                                                                                 |
    | Number Of Shards               | 5 | 将索引均匀分布在所有数据节点上的分片数。将每个分片的大小保持在 10-50 GiB 之间。                                                            |
    | Number of Replicas             | 1 | OpenSearch 索引的副本数。每个副本都是索引的完整副本。                                                                         |
    | Days to Warm Storage           | 0 | 将索引移动到热存储所需的天数。仅当该值大于 0 且 OpenSearch 中启用了热存储时才生效。                                                        |
    | Days to Cold Storage           | 0 | 将索引移入冷存储所需的天数。仅当该值大于 0 且 OpenSearch 中启用了冷存储时才生效。                                                         |
    | Days to Retain                 | 0 | 保留索引的总天数。如果值为 0，则不会删除索引。                                                                                 |


6. 选择**下一步**。

7. 在 **配置堆栈选项** 页面上，选择 **下一步**。

8. 在 **审核** 页面上，查看并确认设置。选中确认模板创建 AWS Identity and Access Management (IAM) 资源的复选框。

9. 选择 **创建堆栈** 部署堆栈。

您可以在 AWS CloudFormation 控制台的 **状态** 列中查看堆栈的状态。正常情况下，您大约 10 分钟后会看到 **CREATE_COMPLETE** 状态。

## 查看仪表板

该仪表板包括以下可视化图表。

| 可视化名称                  | 源字段                                                                                                                                                                                                                                                     | 描述                                                                                                                                               |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Filters                   | <ul><li> Filters </li></ul>                                                                                                                                                             | 可以通过查询过滤条件对以下数据进行筛选。                                                                                                              |
| Web ACLs                  | <ul><li> log event</li><li>webaclName</li></ul>                                                                                                                                        | 显示按 Web ACL 名称分组的请求总数。                                                                                                                  |
| Total Requests            | <ul><li> log event </li></ul>                                                                                                                                                         | 显示总的 Web 请求数。                                                                                                                                |
| Request Timeline          | <ul><li> log event </li></ul>                                                                                                                                                         | 提供一个柱状图，显示随时间分布的事件情况。                                                                                                           |
| WAF Rules                 | <ul><li> terminatingRuleId </li></ul>                                                                                                                                                 | 提供一个饼图，显示 Web ACL 中的 WAF 规则分布情况。                                                                                                |
| Total Blocked Requests    | <ul><li> log event </li></ul>                                                                                                                                                         | 显示被阻止的 Web 请求总数。                                                                                                                           |
| Unique Client IPs         | <ul><li> Request.ClientIP</li></ul>                                                                                                                                                   | 显示通过客户端 IP 地址识别的唯一访问者。                                                                                                               |
| Country or Region By Request | <ul><li> Request.Country </li></ul>                                                                                    | 显示 Web ACL 上的请求数（按客户端 IP 解析的相应国家或地区分组）。                                                                                     |
| Http Methods              | <ul><li> Request.HTTPMethod</li></ul>                                                                                  | 使用饼图显示 Web ACL 上的请求数（按 HTTP 请求方法名称分组，如 POST、GET、HEAD 等）。                                                                    |
| Http Versions             | <ul><li> Request.HTTPVersion</li></ul>                                                                                 | 使用饼图显示 Web ACL 上的请求数（按 HTTP 协议版本分组，如 HTTP/2.0、HTTP/1.1 等）。                                                                     |
| Top WebACLs               | <ul><li> webaclName</li><li> webaclId.keyword</li></ul>                                                               | Web 请求视图使您能够分析顶级 Web 请求。                                                                                                               |
| Top Hosts                 | <ul><li> host</li></ul>                                                                                                | 列出与事件关联的源 IP 地址，使您能够识别和调查潜在的可疑或未经授权的活动。                                                                                |
| Top Request URIs          | <ul><li> Request.URI</li></ul>                                                                                        | 前 10 个请求 URI。                                                                                                                                    |
| Top Countries or Regions  | <ul><li> Request.country</li></ul>                                                                                    | Web ACL 访问中前 10 个国家。                                                                                                                           |
| Top Rules                 | <ul><li> terminatingRuleId</li></ul>                                                                                  | Web ACL 中匹配请求的前 10 条规则。                                                                                                                     |
| Top Client IPs            | <ul><li> Request.ClientIP</li></ul>                                                                                     | 提供前 10 个 IP 地址。                                                                                                                               |
| Top User Agents           | <ul><li> userAgent</li></ul>                                                                                            | 提供前 10 个用户代理。                                                                                                                               |
| Block Allow Host Uri      | <ul><li> host</li><li>Request.URI</li><li>action</li></ul>                                                              | 提供被阻止或允许的 Web 请求。                                                                                                                         |
| Top Labels with Host, Uri | <ul><li> labels.name</li><li>host</li><li>Request.URI</li></ul>                                                        | 使用主机和 URI 的标签的前 10 个详细日志。                                                                                                              |
| View by Matching Rule     | <ul><li> sc-status</li></ul>                                                                                            | 该可视化图表提供了由 DQL“terminatingRuleId:*”提供的详细日志。                                                                                       |
| View by httpRequest args,uri,path | <ul><li> sc-status</li></ul>                                                                                            | 该可视化图表提供了由 DQL 提供的详细日志。                                                                                                        |


### 示例仪表板

{%
include-markdown "../include-dashboard.md"
%}

[![waf-db]][waf-db]

[waf-db]: ../../images/dashboards/waf-db.png


