# AWS Lambda 日志
AWS Lambda 会代表您自动监控 Lambda 函数并将函数指标发送到 Amazon CloudWatch。

## 创建日志摄取
您可以使用 Log Hub 控制台或通过部署独立的 CloudFormation 堆栈来将日志摄取到 AOS 中。

!!! important "Important"
    
    - Lambda 必须与 Log Hub 位于同一区域。
    - AOS 索引每天轮换，不能调整。

### 使用 Log Hub 控制台
1. 登录 Log Hub 控制台。
2. 在导航窗格中的 **日志分析管道** 下，选择 **AWS 服务日志**。
3. 选择**创建日志摄取**按钮。
4. 在 **AWS 服务** 部分，选择 **AWS Lambda**。
5. 选择**下一步**。
6. 在 **指定设置** 下，从下拉列表中选择 Lambda 函数。
9. 选择**下一步**。
10. 在 **指定 OpenSearch 域** 部分，为 **Amazon OpenSearch 域** 选择一个导入的域。
11. 如果您要摄取关联的模板化 AOS 仪表板，请为 **示例仪表板** 选择 **是**。
12. 如果需要，您可以更改目标 AOS 索引的**索引前缀**。默认前缀是 Lambda 函数名称。
13. 在 **日志生命周期** 部分，输入管理 AOS 索引生命周期的天数。 Log Hub 将为此管道自动创建关联的 [索引状态管理 (ISM)](https://opensearch.org/docs/latest/im-plugin/ism/index/) 策略。
14. 选择**下一步**。
15. 如果需要，添加标签。
16. 选择**创建**。

### 使用 CloudFormation 堆栈
此自动化 AWS CloudFormation 模板在 AWS 云中部署 *Log Hub - Lambda Log Ingestion* 解决方案。

|                      | 从 AWS 控制台中启动                                      | 下载模板                                            |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| AWS 海外区域 | [![启动堆栈](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/create/template?stackName=LogHub-Lambda&templateURL=https://{{ bucket }}.s3.amazonaws.com/log-hub/{{ version }}/LambdaLog.template){target=_blank} | [模板](https://{{ bucket }}.s3.amazonaws.com/log-hub/{{ version }}/LambdaLog.template) |
| AWS 中国区域 | [![启动堆栈](../../images/launch-stack.png)](https://console.amazonaws.cn/cloudformation/home#/stacks/create/template?stackName=LogHub-Lambda&templateURL=https://{{ bucket }}.s3.cn-north-1.amazonaws.com.cn/log-hub/{{ version }}/LambdaLog.template){target=_blank} | [模板](https://{{ bucket }}.s3.cn-north-1.amazonaws.com.cn/log-hub/{{ version }}/LambdaLog.template) |

1. 登录 AWS 管理控制台并选择上面的按钮以启动 AWS CloudFormation 模板。 您还可以下载模板开始部署。

2. 要在不同的 AWS 区域中启动堆栈，请使用控制台导航栏中的区域选择器。

3. 在 **创建堆栈** 页面上，验证正确的模板 URL 显示在 **Amazon S3 URL** 文本框中，然后选择 **下一步**。

4. 在 **指定堆栈详细信息** 页面上，为您的解决方案堆栈分配一个名称。

5. 在 **参数** 下，查看模板的参数并根据需要进行修改。 此解决方案使用以下默认值。

    | 参数  | 默认值          | 描述                                                  |
    | ---------- | ---------------- | ------------------------------------------------------------ |
    | LogGroupNames | `<Requires input>` | 日志的 CloudWatch 日志组的名称。  |
    | KDSShardNumber | `1` | 将订阅 CloudWatch 日志组的 Kinesis Data Streams 的分片数。 |
    | KDSRetentionHours | `48` | Kinesis Data Streams 的保留时间。|
    | Engine Type | OpenSearch | OpenSearch 的引擎类型。选择 OpenSearch 或 Elasticsearch。 |
    | OpenSearch Domain Name | `<需要输入>` | Amazon OpenSearch 集群的域名。|
    | OpenSearch Endpoint | `<需要输入>` | OpenSearch 端点 URL。例如，`vpc-your_opensearch_domain_name-xcvgw6uu2o6zafsiefxubwuohe.us-east-1.es.amazonaws.com`。 |
    | Index Prefix | `<需要输入>` | 日志的 OpenSearch 索引的公共前缀。索引名称将为 `<Index Prefix>-<log-type>-<YYYY-MM-DD>`。 |
    | Create Sample Dashboard | Yes | 是否创建示例 OpenSearch 仪表板。 |
    | VPC ID | `<需要输入>` | 选择可以访问 OpenSearch 域的 VPC。日志处理 Lambda 将驻留在选定的 VPC 中。 |
    | Subnet IDs | `<需要输入>` | 选择至少两个可以访问 OpenSearch 域的子网。日志处理 Lambda 将驻留在子网中。确保子网可以访问 Amazon S3 服务。 |
    | Security Group ID | `<需要输入>` | 选择将与日志处理 Lambda 关联的安全组。确保安全组有权访问 OpenSearch 域。|
    | S3 Backup Bucket | `<需要输入>` | 用于存储失败提取日志的 S3 备份存储桶名称。 |

6. 选择**下一步**。

7. 在 **配置堆栈选项** 页面上，选择 **下一步**。

8. 在 **审核** 页面上，查看并确认设置。 选中确认模板创建 AWS Identity and Access Management (IAM) 资源的复选框。

9. 选择 **创建堆栈** 部署堆栈。

您可以在 AWS CloudFormation 控制台的 **状态** 列中查看堆栈的状态。 正常情况下，您大约 10 分钟内会看到 **CREATE_COMPLETE** 状态。
