# AWS CloudTrail 日志
AWS CloudTrail 监控和记录您的 AWS 基础设施中的账户活动。它将所有数据输出到指定的 S3 存储桶或者 CloudWatch 日志组中。

您可以使用日志通控制台或通过部署独立的 CloudFormation 堆栈来将日志摄取到 Amazon OpenSearch Service 中。

!!! important "重要"
    - CloudTrail 必须与日志通位于同一区域。
    - 默认情况下，该解决方案将每天轮换索引。您可以在**额外设置**中进行调整。

## 创建日志摄取（OpenSearch Engine）

### 使用日志通控制台
1. 登录日志通控制台。
2. 在导航窗格中的 **日志分析管道** 下，选择 **AWS 服务日志**。
3. 单击 **创建日志摄取** 按钮。
4. 在 **AWS 服务** 部分，选择 **AWS CloudTrail**。
5. 选择**下一步**。
6. 在 **指定设置** 下，选择 **自动** 或 **手动**。
    - 对于 **自动** 模式，请在下拉列表中选择一个 CloudTrail。
    - 对于 **手动** 模式，请输入 **CloudTrail 名称**。
    - （可选）如果您正在从另一个账户摄取 CloudTrail 日志，请先从 **账户** 下拉列表中选择一个[链接账户](../link-account/index.md)。
 7. 在 **日志来源**，选择 **S3** 或者 **CloudWatch** 作为日志源。
 8. 选择**下一步**。
 9. 在 **指定 OpenSearch 域** 部分，为 **Amazon OpenSearch 域** 选择一个导入的域。
 10. 如果要摄取关联的内置 Amazon OpenSearch Service 仪表板，请为 **示例仪表板** 选择 **是**。
 11. 如果需要，您可以更改目标 Amazon OpenSearch Service 索引的 **索引前缀**。默认前缀是您的跟踪名称。
 12. 在 **日志生命周期** 部分，输入管理 Amazon OpenSearch Service 索引生命周期的天数。日志通 将为此管道自动创建关联的 [索引状态管理 (ISM)](https://opensearch.org/docs/latest/im-plugin/ism/index/) 策略。
13. 在 **选择日志处理器** 部分，请选择日志处理器。
     - 当选择 Lambda 作为日志处理器时，您可以根据需要配置 Lambda 并发数。
     - （可选）这些[区域](https://aws.amazon.com/about-aws/whats-new/2023/04/amazon-opensearch-service-ingestion/)现在支持 OSI 作为日志处理器。 当选择 OSI 时，请输入 OCU 的最小和最大数量。 请参阅[此处](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/ingestion.html#ingestion-scaling) 的更多信息。
14. 选择**下一步**。
 14. 如果需要，添加标签。
 15. 选择**创建**。

### 使用 CloudFormation 堆栈
此自动化 AWS CloudFormation 模板在 AWS 云中部署 *日志通- CloudTrail Log Ingestion* 解决方案。

| | 在 AWS 控制台中启动 |下载模板 |
| -------------------- | -------------------------------------------------- ---------- | -------------------------------------------------- ---------- |
| AWS 海外区域 | [![启动堆栈](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CloudTrailLog.template){target=_blank} | [模板](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CloudTrailLog.template)  |
| AWS 中国区域 | [![启动堆栈](../../images/launch-stack.png)](https://console.amazonaws.cn/cloudformation/home#/stacks/new?templateURL= https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CloudTrailLog.template){target=_blank} | [模板](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CloudTrailLog.template) |

{%
include-markdown "include-cfn-common.md"
%}

### 查看仪表板

仪表板包括以下可视化。

| Visualization Name     | Source Field  | Description  |
| ---------- | ------ | -------------- |
| Global Control         |  awsRegion   | 为用户提供按区域拆分数据的能力。  |
| Event History          | log event | 展示一个显示事件分布的柱状图。                                                                                       |
| Event by Account ID    | userIdentity.accountId                                                                            | 根据 AWS 帐户 ID 细分事件，使您能够分析组织内不同帐户之间的活动模式。                  |
| Total Event Count    | eventSource eventName                                                    | 显示事件总数。                  |
| Top Event Names        | eventName  | 显示最常发生的事件名称，帮助您识别常见活动或潜在异常。                                                |
| Top Event Sources      | eventSource      | 突出显示生成事件的顶级来源，提供有关最活跃或事件量最高的服务或资源的洞察。 |
| Event By Region    | awsRegion                                                                          | 将事件按照区域划分，便于分析和了解跨区域的事件分布。               |
| Event Category         | eventCategory  | 将事件分类为不同的类型或分类，便于分析和了解跨类别的事件分布。                   |
| Top Users              | <ul><li> userIdentity.sessionContext.sessionIssuer.userName </li> <li> userIdentity.sessionContext.sessionIssuer.arn </li> <li> userIdentity.accountId </li> <li> userIdentity.sessionContext.sessionIssuer.type </li> </ul>      | 识别与最多事件关联的用户或 IAM 角色，有助于用户活动监控和访问管理。                      |
| Top Source IPs         | sourceIPAddress | 列出与事件相关的源 IP 地址，使您能够识别和调查潜在的可疑或未经授权的活动。              |
| S3 Access Denied       | <ul><li> eventSource: s3\* </li><li> errorCode: AccessDenied</li></ul>       | 显示访问 Amazon S3 资源被拒绝的事件，帮助您识别和排除权限问题或潜在的安全漏洞。        |
| S3 Buckets             | requestParameters.bucketName | 提供关于 S3 存储桶活动的摘要，包括创建、删除和修改操作，使您能够监控变更和访问模式。                |
| Top S3 Change Events   | <ul><li> eventName</li><li> requestParameters.bucketName</li></ul>      | 呈现对 S3 资源最常见的更改类型，例如对象上传、删除或修改，有助于更改跟踪和审计。   |
| EC2 Change Event Count | <ul><li> eventSource: ec2\* </li><li> eventName: (RunInstances or TerminateInstances or RunInstances or StopInstances)</li></ul>        | 显示与 EC2 相关的更改事件的总数，提供对 EC2 实例和资源的更改的数量和频率的概述。             |
| EC2 Changed By         | userIdentity.sessionContext.sessionIssuer.userName   | 标识对 EC2 资源进行更改的用户或 IAM 角色，有助于追踪和修改的责任。                         |
| Top EC2 Change Events  | eventName | 强调对 EC2 实例或相关资源进行的最常见更改类型，使您能够关注最重要或最频繁的更改。     |
| Error Events           | <ul><li>awsRegion</li><li>errorCode</li><li>errorMessage</li><li>eventName</li><li>eventSource</li><li>sourceIPAddress</li><li>userAgent</li><li>userIdentity.​accountId</li><li>userIdentity.​sessionContext.​sessionIssuer.​accountId</li><li>userIdentity.​sessionContext.​sessionIssuer.​arn</li><li>userIdentity.​sessionContext.​sessionIssuer.​type</li><li>userIdentity.​sessionContext.​sessionIssuer.​userName</li></ul> | 显示导致错误或失败的事件，帮助您识别和排除与 API 调用或资源操作相关的问题。                 |

#### 示例仪表板

{%
include-markdown "../include-dashboard.md"
%}

[![cloudtrail-db]][cloudtrail-db]

[cloudtrail-db]: ../../images/dashboards/cloudtrail-db.png


## 创建日志摄取（Light Engine）

### 使用日志通控制台
1. 登录日志通控制台。
2. 在导航窗格中的 **日志分析管道** 下，选择 **AWS 服务日志**。
3. 选择**创建日志摄取**按钮。
4. 在 **AWS 服务** 部分，选择 **AWS CloudTrail**。
5. 选择**Light Engine**， 选择**下一步**。
6. 在 **指定设置** 下，为 **CloudTrail 日志启用**选择 **自动** 或 **手动**。自动模式将自动检测 CloudTrail 日志位置。
    - 对于**自动模式**，从下拉列表中选择 CloudTrail 分配。
    - 对于 **手动模式**，输入 **CloudTrail ID** 和 **CloudTrail 标准日志来源**。
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
此自动化 AWS CloudFormation 模板在 AWS 云中部署 *日志通- CloudTrail 标准日志摄取* 解决方案。

|                      | 在 AWS 控制台中启动                                                                                                                                                                                                                  | 下载模板                                                                                            |
| -------------------- |-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------|
| AWS 海外区域 | [![启动堆栈](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/MicroBatchAwsServicesCloudTrailPipeline.template){target=_blank} | [模板](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/MicroBatchAwsServicesCloudTrailPipeline.template) |
| AWS 中国区域 | [![启动堆栈](../../images/launch-stack.png)](https://console.amazonaws.cn/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/MicroBatchAwsServicesCloudTrailPipeline.template){target=_blank}   | [模板](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/MicroBatchAwsServicesCloudTrailPipeline.template) |

1. 登录 AWS 管理控制台并选择以上按钮以启动 AWS CloudFormation 模板。您还可以下载模板开始部署。

2. 要在不同的 AWS 区域中启动堆栈，请使用控制台导航栏中的区域选择器。

3. 在 **创建堆栈** 页面上，验证正确的模板 URL 显示在 **Amazon S3 URL** 文本框中，然后选择 **下一步**。

4. 在 **指定堆栈详细信息** 页面上，为您的解决方案堆栈分配一个名称。

5. 在 **参数** 下，查看模板的参数并根据需要进行修改。此解决方案使用以下参数。

    - **Pipeline settings** 专用参数

    | 参数                             | 默认          | 描述                                                                                                       |
    | --------------------------------| ---------- |----------------------------------------------------------------------------------------------------------|
    | Pipeline Id                | `<需要输入>` | pipeline的唯一标识符，如果您需要创建多个ELB pipeline，将不同的CloudTrail日志写入到不同的表中时，则必须保证唯一性，可以通过[uuidgenerator](https://www.uuidgenerator.net/version4)生成唯一的。                                                                                          |
    | Staging Bucket Prefix              | AWSLogs/CloudTrailLogs | 日志在临时存储区的存放目录，不同pipeline要保证Prefix的唯一性且无重叠。                                                                                        |

    - **Destination settings** 专用参数

    | 参数                             | 默认          | 描述                                                                                                       |
    | --------------------------------| ---------- |----------------------------------------------------------------------------------------------------------|
    | Centralized Bucket Name | `<需要输入>` | 输入centralized的s3 bucket名称，例如centralized-logging-bucket。           |
    | Centralized Bucket Prefix     |  datalake                | 输入centralized bucket的路径前缀，默认为datalake，意味着您的数据库的location为s3://{Centralized Bucket Name}/{Centralized Bucket Prefix}/amazon_cl_centralized。 |
    | Centralized Table Name              | CloudTrail | 数据写入到Centralized数据库的表名称，按需定义，默认值为CloudTrail。                                                                                        |


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
    | Grafana URL   |  `<可选输入>`                | Grafana访问的URL，例如https://CloudTrail-72277319.us-west-2.elb.amazonaws.com。 |
    | Grafana Service Account Token              | `<可选输入>` | Grafana Service Account Token：Grafana中创建的Service Account Token。
                                                                                          |




6. 选择**下一步**。

7. 在 **配置堆栈选项** 页面上，选择 **下一步**。

8. 在 **审核** 页面上，查看并确认设置。选中确认模板创建 AWS Identity and Access Management (IAM) 资源的复选框。

9. 选择 **创建堆栈** 部署堆栈。

您可以在 AWS CloudFormation 控制台的 **状态** 列中查看堆栈的状态。正常情况下，您大约 10 分钟后会看到 **CREATE_COMPLETE** 状态。


