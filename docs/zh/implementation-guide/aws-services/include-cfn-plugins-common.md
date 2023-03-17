1. 登录 AWS 管理控制台并选择以上按钮以启动 AWS CloudFormation 模板。您还可以下载模板开始部署。

2. 要在不同的 AWS 区域中启动堆栈，请使用控制台导航栏中的区域选择器。

3. 在 **创建堆栈** 页面上，验证正确的模板 URL 显示在 **Amazon S3 URL** 文本框中，然后选择 **下一步**。

4. 在 **指定堆栈详细信息** 页面上，为您的解决方案堆栈分配一个名称。

5. 在 **参数** 下，查看模板的参数并根据需要进行修改。

    | 参数                             | 默认         | 描述                                                                                                            |
    |------------|---------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------|
    | Log Bucket Name                | `<需要输入>`   | 存储日志的 S3 存储桶名称。                                                                                               |
    | Log Bucket Prefix              | `<需要输入>`   | 存储日志的 S3 存储桶路径前缀。                                                                                             |
    | Log Source Account ID          | `<可选输入>`   | 存储日志的 S3 存储桶所在账户 ID. 对于跨账户日志摄取是必填 (需要先 [添加一个成员账户](../link-account/index.md)). 默认情况下, 会使用您在 **步骤 1** 中登录的账户 ID。 |
    | Log Source Region              | `<可选输入>`   | 存储日志的 S3 存储桶所在的区域. 默认情况下, 会使用您在 **步骤 2** 中指定的区域。                                                               |
    | Log Source Account Assume Role | `<可选输入>`   | 跨账户日志摄取所需要使用的 IAM Role. 对于跨账户日志摄取是必填 (需要先 [添加一个成员账户](../link-account/index.md))。                              |
    | Engine Type                    | OpenSearch | OpenSearch 的引擎类型。选择 OpenSearch 或 Elasticsearch。                                                               |
    | OpenSearch Domain Name         | `<需要输入>`   | Amazon OpenSearch 集群的域名。                                                                                      |
    | OpenSearch Endpoint            | `<需要输入>`   | OpenSearch 端点 URL。例如，`vpc-your_opensearch_domain_name-xcvgw6uu2o6zafsiefxubwuohe.us-east-1.es.amazonaws.com`。 |
    | Index Prefix                   | `<需要输入>`   | 日志的 OpenSearch 索引的公共前缀。索引名称将为 `<Index Prefix>-<Log Type>-<Other Suffix>`。                                       |
    | Create Sample Dashboard        | Yes        | 是否创建示例 OpenSearch 仪表板。                                                                                        |
    | VPC ID                         | `<需要输入>`   | 选择可以访问 OpenSearch 域的 VPC。日志处理 Lambda 将驻留在选定的 VPC 中。                                                           |
    | Subnet IDs                     | `<需要输入>`   | 选择至少两个可以访问 OpenSearch 域的子网。日志处理 Lambda 将驻留在子网中。确保子网可以访问 Amazon S3 服务。                                         |
    | Security Group ID              | `<需要输入>`   | 选择将与日志处理 Lambda 关联的安全组。确保安全组有权访问 OpenSearch 域。                                                                |
    | S3 Backup Bucket               | `<需要输入>`   | 用于存储失败提取日志的 S3 备份存储桶名称。                                                                                       |
    | KMS-CMK ARN                | `<可选输入>`   | 用于加密的 KMS-CMK ARN. 留空以创建新的 KMS CMK.                                                                           |
    | Number Of Shards               | 5          | 将索引均匀分布在所有数据节点上的分片数。将每个分片的大小保持在 10-50 GiB 之间。                                                                 |
    | Number of Replicas             | 1          | OpenSearch 索引的副本数。每个副本都是索引的完整副本。                                                                              |
    | Age to Warm Storage           | `<可选输入>` | 将索引移至温存储所需的时间（例如 7d）。索引时间是从创建到现在之间的时间。支持的单位是 d（天）和 h（小时）。仅当OpenSearch 中启用了温存储时才生效。                                                        |
    | Age to Cold Storage           | `<可选输入>` | 将索引移入冷存储所需的时间（例如 30d）。索引时间是从创建到现在之间的时间。支持的单位是 d（天）和 h（小时）。仅当 OpenSearch 中启用了冷存储时才生效。                                                         |
    | Age to Retain                 | `<可选输入>` | 保留索引的时间（例如 180d）。索引时间是从创建到现在之间的时间。支持的单位是 d（天）和 h（小时）。如果值为空，则不会删除该索引。                                                                                 |
    | Rollover Index Size                 | `<可选输入>` | 索引滚动所需的分片大小（例如 30GB）。                                                                               |
    | Index Suffix                 | yyyy-MM-dd | 索引后缀格式（例如：yyyy-MM-dd、yyyy-MM-dd-HH）。索引名称将为 `<Index Prefix>-<Log Type>-<Index Suffix>-000001`。                                                                                 |
    | Compression type                 | best_compression | 用于压缩存储数据的压缩类型。 可用值为 best_compression 和 default。                                                                           |
    | Refresh Interval                 | 1s | 索引多久刷新，即刷新索引最近的更改数据并使它们可用于搜索。 可以设置为 -1 以禁用刷新。 默认为 1秒。                                                                                 |
    | Plugins | `<可选输入>`   | 用逗号分隔的插件列表，如果无需使用插件，请留空。 合法输入为 `user_agent`， `geo_ip`。                                                        |

6. 选择**下一步**。

7. 在 **配置堆栈选项** 页面上，选择 **下一步**。

8. 在 **审核** 页面上，查看并确认设置。选中确认模板创建 AWS Identity and Access Management (IAM) 资源的复选框。

9. 选择 **创建堆栈** 部署堆栈。

您可以在 AWS CloudFormation 控制台的 **状态** 列中查看堆栈的状态。正常情况下，您大约 10 分钟后会看到 **CREATE_COMPLETE** 状态。