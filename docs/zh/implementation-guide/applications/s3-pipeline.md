# Amazon S3 作为 日志源
对于 Amazon S3，日志通既可以连续提取指定 S3 位置中的日志或执行一次性提取。您还可以根据 S3 前缀过滤日志或使用自定义日志配置解析日志。

本文将指导您如何从 S3桶提取日志，并创建日志管道。

## 创建日志管道（OpenSearch Engine）

### 请确认您已经完成
1. [导入 Amazon OpenSearch Service 域](../domains/import.md)。

### 创建日志分析管道
1. 登录日志通控制台。

2. 在左侧边栏中的 **日志分析管道** 下，选择**应用日志**。

3. 单击 **创建日志管道**。

4. 单击 **S3桶** 作为日志源, 并选择 **下一步**。

5. 选择存储日志的 S3 桶，并按照你的实际需求输入 **前缀过滤器**（可选）。

6. 根据您的需求选择 **导入模式**。如果您想持续地摄取日志，请选择 **持续加载**；如果您只需要摄取日志一次，请选择 **一次性加载**。

7. 如果您的日志文件已压缩，请指定 **压缩格式**。

您已为日志分析管道创建日志源。 现在您可以使用 Amazon S3 作为日志源对日志分析管道进行进一步配置。

1. 选择之前设置中创建的日志配置，点击 **下一步** 。如果您没有从下拉列表中找到所需的日志配置，请选择 **创建新的**, 并参考 [日志配置](./create-log-config.md)。

2. 在 **索引名称** 中小写指定。

3. 选择 **下一步**。

4. 在 **指定OpenSearch域** 部分，为 **Amazon OpenSearch域** 选择一个已导入的域。

5. 在 **日志生命周期** 部分，输入天数以管理Amazon OpenSearch Service索引生命周期。与OpenSearch一起的中央化日志将为这个管道自动创建关联的 [索引状态管理(ISM)](https://opensearch.org/docs/latest/im-plugin/ism/index/) 政策。

6. 在 **日志处理器设置** 中，选择 **日志处理器类型**，并根据需要配置 Lambda 并发数，然后 **下一步**。

7. 如果需要，请启用 **警报** 并选择一个现有的SNS主题。如果您选择 **创建一个新的SNS主题**，请为新的SNS主题提供一个名称和电子邮件地址。

8. 如果需要，请添加标签。

9. 选择 **创建**。

10. 等待应用程序管道转变为“活动”状态。

## 创建日志管道（Light Engine）

### 创建日志分析管道

1. 登录日志通控制台。

2. 在左侧边栏中的 **日志分析管道** 下，选择**应用日志**。

3. 单击 **创建日志管道**。

4. 单击 **S3桶** 作为日志源, 选择**Light Engine**，并选择 **下一步**。

5. 选择存储日志的 S3 桶，并按照你的实际需求输入 **前缀过滤器**（可选）。

6. 根据您的需求选择 **导入模式**。如果您想持续地摄取日志，请选择 **持续加载**。

您已为日志分析管道创建日志源。 现在您可以使用 Amazon S3 作为日志源对日志分析管道进行进一步配置。

1. 选择之前设置中创建的日志配置，点击 **下一步** 。如果您没有从下拉列表中找到所需的日志配置，请选择 **创建新的**, 并参考 [日志配置](./create-log-config.md)。

2. 在 **指定 Light Engine 配置** 部分，如果您要摄取关联的模板化 Grafana 仪表板，请为 **样例看板** 选择 **是**。

3. 你可以选择一个Grafana，如果需要**导入**一个新的Grafana，可以跳转到[Grafana](../resources/grafana.md)进行配置。

4. 选择一个S3桶存放分区后的日志。并且定义一个用于存放日志表的名称。

5. 日志处理频率，默认为**5**分钟，最小时间处理频率为**1**分钟。

6. 在 **日志生命周期** 部分，输入管理 日志合并时间 和 日志归档时间。我们为你提供了默认值，你可以根据你的业务需求来进行调整。

7. Lambda会作为Light Engine的默认日志处理器，选择**下一步**。

8. 如果需要，开启应用告警，并按需添加标签。

9. 选择**创建**。

10. 等待应用程序管道转变为“活动”状态。



[kds]: https://aws.amazon.com/kinesis/data-streams/
[ssm-agent]: https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-agent.html
[open-ssl]: https://www.openssl.org/source/
[eks]: https://docs.aws.amazon.com/eks/latest/userguide/what-is-eks.html
[s3]: https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html
[daemonset]: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
[sidecar]: https://kubernetes.io/docs/concepts/workloads/pods/#workload-resources-for-managing-pods
[syslog]: https://en.wikipedia.org/wiki/Syslog
[bucket]: https://docs.aws.amazon.com/AmazonS3/latest/userguide//UsingBucket.html
[supported-platforms]: https://docs.fluentbit.io/manual/installation/supported-platforms
[vpc-connectivity]: https://docs.aws.amazon.com/whitepapers/latest/building-scalable-secure-multi-vpc-network-infrastructure/vpc-to-vpc-connectivity.html
[ec2-user-data]: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html#user-data-shell-scripts
[instance-refresh]: https://docs.aws.amazon.com/autoscaling/ec2/userguide/asg-instance-refresh.html

