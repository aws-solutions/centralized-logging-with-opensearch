# CloudTrail 日志
Amazon CloudTrail 监控和记录您的 AWS 基础设施中的账户活动。它将所有数据输出到指定的 S3 存储桶或者 CloudWatch 日志组中。

## 创建日志摄取
您可以使用日志通控制台或通过部署独立的 CloudFormation 堆栈来将日志摄取到 Amazon OpenSearch Service 中。

!!! important "重要"
    - CloudTrail 必须与日志通位于同一区域。
    - 默认情况下，该解决方案将每天轮换索引。您可以在**额外设置**中进行调整。

### 使用日志通控制台
1. 登录日志通控制台。
2. 在导航窗格中的 **日志分析管道** 下，选择 **AWS 服务日志**。
3. 单击 **创建日志摄取** 按钮。
4. 在 **AWS 服务** 部分，选择 **Amazon CloudTrail**。
5. 选择**下一步**。
6. 在 **指定设置**，对于 **Trail**，从下拉列表中选择一项。（可选步骤）如果需要跨账户摄取日志，需要先在 **账户** 的下拉列表中选择一个[链接的 AWS 账户](../link-account/index.md)。
 7. 在 **日志来源**，选择 **S3** 或者 **CloudWatch** 作为日志源。
 8. 选择**下一步**。
 9. 在 **指定 OpenSearch 域** 部分，为 **Amazon OpenSearch 域** 选择一个导入的域。
 10. 如果要摄取关联的内置 Amazon OpenSearch Service 仪表板，请为 **示例仪表板** 选择 **是**。
 11. 如果需要，您可以更改目标 Amazon OpenSearch Service 索引的 **索引前缀**。默认前缀是您的跟踪名称。
 12. 在 **日志生命周期** 部分，输入管理 Amazon OpenSearch Service 索引生命周期的天数。日志通 将为此管道自动创建关联的 [索引状态管理 (ISM)](https://opensearch.org/docs/latest/im-plugin/ism/index/) 策略。
 13. 选择**下一步**。
 14. 如果需要，添加标签。
 15. 选择**创建**。

### 使用独立的 CloudFormation 堆栈
此自动化 AWS CloudFormation 模板在 AWS 云中部署 *日志通- CloudTrail Log Ingestion* 解决方案。

| | 在 AWS 控制台中启动 |下载模板 |
| -------------------- | -------------------------------------------------- ---------- | -------------------------------------------------- ---------- |
| AWS 海外区域 | [![启动堆栈](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CloudTrailLog.template){target=_blank} | [模板](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CloudTrailLog.template)  |
| AWS 中国区域 | [![启动堆栈](../../images/launch-stack.png)](https://console.amazonaws.cn/cloudformation/home#/stacks/new?templateURL= https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CloudTrailLog.template){target=_blank} | [模板](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CloudTrailLog.template) |

{%
include-markdown "include-cfn-common.md"
%}

## 查看仪表板

仪表板包括以下可视化。

| Visualization Name     | Source Field  | Description  |
| ---------- | ------ | -------------- |
| Global Control         |  awsRegion   | 为用户提供按区域拆分数据的能力。  |
| Event History          | log event | 展示一个显示事件分布的柱状图。                                                                                       |
| Event by Account ID    | userIdentity.accountId                                                                            | 根据 AWS 帐户 ID 细分事件，使您能够分析组织内不同帐户之间的活动模式。                  |
| Top Event Names        | eventName  | 显示最常发生的事件名称，帮助您识别常见活动或潜在异常。                                                |
| Top Event Sources      | eventSource      | 突出显示生成事件的顶级来源，提供有关最活跃或事件量最高的服务或资源的洞察。 |
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

### 示例仪表板

{%
include-markdown "../include-dashboard.md"
%}

[![cloudtrail-db]][cloudtrail-db]

[cloudtrail-db]: ../../images/dashboards/cloudtrail-db.png
