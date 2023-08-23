# 推荐告警

Amazon OpenSearch 提供一组[推荐的 CloudWatch 告警](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/cloudwatch-alarms.html) 来监控 Amazon OpenSearch Service 域的运行状况。日志通帮助您自动创建告警，并通过 SNS 将通知发送到您的电子邮件（或 SMS）。

## 创建告警

### 使用日志通控制台
1. 登录日志通控制台。
2. 在导航窗格中的 **集群** 下，选择 **OpenSearch 域**。
3. 从表中选择域。
4. 在 **基本配置** 下，在 **告警** 标签处选择 **开启**。
5. 输入**电子邮件**。
6. 选择您要创建的告警并根据需要调整设置。
7. 选择**创建**。

### 使用 CloudFormation 堆栈
1. 登录 AWS 管理控制台并选择按钮以启动 AWS CloudFormation 模板。

    [![启动堆栈](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/AlarmForOpenSearch.template){target=_blank}

    您还可以 [下载模板](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/AlarmForOpenSearch.template) 开始部署。

2. 要在不同的 AWS 区域中启动堆栈，请使用控制台导航栏中的区域选择器。

3. 在 **创建堆栈** 页面上，验证正确的模板 URL 显示在 **Amazon S3 URL** 文本框中，然后选择 **下一步**。

4. 在 **指定堆栈详细信息** 页面上，为您的堆栈分配一个名称。

5. 在 **参数** 部分，查看模板的参数并根据需要进行修改。此解决方案使用以下默认值。

    |参数 |默认 |说明 |
    | ---------- | ---------------- | -------------------------------------------------- ---------- |
    | Endpoint | `<需要输入>` | OpenSearch 域的端点，例如，`vpc-your_opensearch_domain_name-xcvgw6uu2o6zafsiefxubwuohe.us-east-1.es.amazonaws.com`。 |
    | DomainName | `<需要输入>` | OpenSearch 域的名称。 |
    | Email | `<需要输入>` |通知电子邮件地址。告警将通过 SNS 发送到此电子邮件地址。 |
    | ClusterStatusRed | `是` |当至少一个主分片及其副本未分配给节点时是否启用告警。 |
    | ClusterStatusYellow | `是` |当至少一个副本分片未分配给节点时是否启用告警。 |
    | FreeStorageSpace | `10` |是否在集群中的节点下降到您在 GiB 中输入的可用存储空间时启用告警。我们建议将其设置为每个节点存储空间的 25%。 `0` 表示告警被禁用。 |
    | ClusterIndexWritesBlocked | `1` | 在 5 分钟出现集群阻止写入错误的次数，连续 1 次。`0`表示告警被禁用。 |
    | UnreachableNodeNumber | `3` |节点最小值为 < x 1 天，连续 1 次。 `0` 表示告警被禁用。 |
    | AutomatedSnapshotFailure | `是` |自动快照失败时是否开启告警。 AutomatedSnapshotFailure 最大值 >= 1 持续 1 分钟，连续 1 次。 |
    | CPUUtilization | `是` |发生持续高 CPU 使用率时是否启用告警。 CPUUtilization 或 WarmCPUUtilization 最大值 >= 80% 持续 15 分钟，连续 3 次。 |
    | JVMMemoryPressure | `是` | JVM RAM 使用高峰发生时是否开启告警。 JVMMemoryPressure 或 WarmJVMMemoryPressure 最大值 >= 80% 持续 5 分钟，连续 3 次。 |
    | MasterCPUUtilization | `是` |主节点CPU持续高使用时是否开启告警。 MasterCPUUtilization 最大值 >= 50% 持续 15 分钟，连续 3 次。 |
    | MasterJVMMemoryPressure | `是` |当主节点出现 JVM RAM 使用高峰时是否开启告警。 MasterJVMMemoryPressure 最大值 >= 80% 持续 15 分钟，连续 1 次。 |
    | KMSKeyError | `是` |禁用 KMS 加密密钥时是否启用告警。 KMSKeyError 在 1 分钟内 >= 1，连续 1 次。 |
    | KMSKeyInaccessible | `是` |是否在 KMS 加密密钥已被删除或已撤销其对 OpenSearch 服务的授权时启用告警。 KMSKeyInaccessible 在 1 分钟内 >= 1，连续 1 次。 |

6. 选择**下一步**。

7. 在 **配置堆栈选项** 页面上，选择 **下一步**。

8. 在 **审核** 页面上，查看并确认设置。 选中确认模板创建 AWS Identity and Access Management (IAM) 资源的复选框。

9. 选择 **创建堆栈** 部署堆栈。

您可以在 AWS CloudFormation 控制台的 **状态** 列中查看堆栈的状态。 你应该收到
大约 5 分钟后出现 **CREATE_COMPLETE** 状态。

创建告警后，将向您的电子邮件地址发送一封确认电子邮件。 您需要单击电子邮件中的 ****确认**** 链接。

您可以通过日志通控制台的 **基本配置 > 告警 > Cloudwatch 告警** 链接访问 Cloudwatch 中新创建的告警，链接位置如下图所示：

![](../../images/domain/cloudwatch-alarm-link-zh.png)

请确保所有的告警状态都是 **确定** 状态。因为任何在您确认订阅邮件提醒之前发出的告警并不会发送通知邮件。

!!! Warning "注意"

    在您订阅邮件提醒之前，告警并不会触发任何SNS通知。我们建议您在创建完告警功能后，通过上文提到的链接前往 CloudWatch 页面检查每一个告警的状态，并优先解决已经触发的告警内容。

## 删除告警

1. 登录日志通 控制台。
2. 在导航窗格中的 **集群** 下，选择 **OpenSearch 域**。
3. 从表中选择域。
4. 选择**告警**选项卡。
5. 选择**删除**。
6. 在确认提示中，选择 **删除**。

