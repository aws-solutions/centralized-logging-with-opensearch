# Amazon S3 作为 日志源
对于 Amazon S3，日志通既可以连续提取指定 S3 位置中的日志或执行一次性提取。您还可以根据 S3 前缀过滤日志或使用自定义日志配置解析日志。

本文将指导您如何从 S3桶提取日志，并创建日志管道。

## 请确认您已经完成
1. [导入 Amazon OpenSearch Service 域](../domains/import.md)。

## 创建日志分析管道
1. 登录日志通控制台。

2. 在左侧边栏中的 **日志分析管道** 下，选择**应用日志**。
   
3. 单击 **创建日志管道**。

4. 单击 **S3桶** 作为日志源, 并选择 **下一步**。

5. 选择存储日志的 S3 桶，并按照你的实际需求输入 **前缀过滤器**（可选）。

6. 根据您的需求选择 **导入模式**。如果您想持续地摄取日志，请选择 **持续加载**；如果您只需要摄取日志一次，请选择 **一次性加载**。

7. 如果您的日志文件已压缩，请指定 **压缩格式**。

您已为日志分析管道创建日志源。 现在您可以使用 Amazon EC2 实例组作为日志源对日志分析管道进行进一步配置。

1. 输入 **日志路径** 指定要收集的日志的位置。
   
2. 选择之前设置中创建的日志配置，点击 **下一步**  I如果您没有从下拉列表中找到所需的日志配置，请选择 **创建新的**, 并参考 [日志配置](./create-log-config.md)。

3. 在 **索引名称** 中小写指定。

5. 选择 **下一步**。

6. 在 **指定OpenSearch域** 部分，为 **Amazon OpenSearch域** 选择一个已导入的域。

7. 在 **日志生命周期** 部分，输入天数以管理Amazon OpenSearch Service索引生命周期。与OpenSearch一起的中央化日志将为这个管道自动创建关联的 [索引状态管理(ISM)](https://opensearch.org/docs/latest/im-plugin/ism/index/) 政策。

8. 选择 **下一步**。

9. 如果需要，请启用 **警报** 并选择一个现有的SNS主题。如果您选择 **创建一个新的SNS主题**，请为新的SNS主题提供一个名称和电子邮件地址。

10. 如果需要，请添加标签。

11. 选择 **创建**。

12. 等待应用程序管道转变为“活动”状态。



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

