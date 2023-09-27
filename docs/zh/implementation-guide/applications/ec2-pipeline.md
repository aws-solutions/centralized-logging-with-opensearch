# Amazon EC2 实例组作为日志源
实例组代表一组 EC2 Linux 实例，这使得解决方案能够快速将日志配置与多个 EC2 实例关联。 日志通使用 Systems Manager 代理（SSM 代理）来安装/配置 Fluent Bit 代理，并将日志数据发送到 Kinesis Data Streams。

本文将指导您如何从 EC2 实例组提取日志，并创建日志管道。

## 请确认您已经完成
1. [导入 Amazon OpenSearch Service 域](../domains/import.md)。

## 创建日志分析管道

1. 登录日志通控制台。

2. 在左侧边栏中的 **日志分析管道** 下，选择**应用日志**。
   
3. 单击 **创建日志管道**。

4. 单击 **实例组** 作为日志源, 并选择 **下一步**.

5. 选择您已创建的实例组，如果你还没有闯将实例组， 在右上角选择选择 **创建实例组** , 然后根据 [创建实例组](./create-log-source.md#amazon-ec2-instance-group) 的文档来创建实例组。 完成后, 选择 **刷新** 并选择最新创建的实例组.

6. (仅限于自动扩展组) 如果您的实例组是基于自动扩展组创建的，在摄取状态变为“已创建”后，您可以在实例组的详细页面中找到生成的Shell脚本。复制该shell脚本并更新自动扩展的 [启动配置](https://docs.aws.amazon.com/autoscaling/ec2/userguide/launch-configurations.html) 或 [启动模板](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-launch-templates.html) 中的用户数据。

7. 保持默认的 **权限授予方法**。

8. (可选) 如果您选择 **我会在管道创建后手动添加以下所需的权限**, 继续如下操作：

    1. 点击 **展开查看所需的权限** 并复制提供的JSON策略。
    2. 转到 **AWS Management Console**。
    3. 在左侧栏，选择 **IAM**, 并从 **Access management** 下面选择 **策略**。
    4. 选择 **创建策略**，选择 **JSON** 并替换文本块内的所有内容。请记住将 `<YOUR ACCOUNT ID>` 替换为您的账户ID。
    5. 选择 **下一步**, 然后为此策略输入名称。
    6. 将策略附加到您的EC2实例配置文件，以授予日志代理发送日志到应用日志管道的权限。如果您使用的是自动扩展组，则需要更新与自动扩展组关联的IAM实例配置文件。如有需要，您可以按照文档来更新您的[启动模板][launch-template]或[启动配置][launch-configuration]。

9. 选择 **下一步**。

您已为日志分析管道创建日志源。 现在您可以使用 Amazon EC2 实例组作为日志源对日志分析管道进行进一步配置。

1. 输入 **日志路径** 指定要收集的日志的位置。
   
2. 选择之前设置中创建的日志配置，点击 **下一步**。如果您没有从下拉列表中找到所需的日志配置，请选择 **创建新的**, 并参考 [日志配置](./create-log-config.md).

3. 在 **索引名称** 中小写指定。

4. 在 **缓冲区** 部分中，选择 **S3** 或 **Kinesis Data Streams**。如果您不希望有缓冲层，请选择 **无**。请参阅 [日志缓冲](./index.md#log-buffer) 获取关于选择适当缓冲层的更多信息。

    * S3缓冲参数

    | 参数                        | 默认值                                          | 描述                                                          |
    | ---------------------------- | ------------------------------------------------ | ------------------------------------------------------------ |
    | S3 Bucket                    | *解决方案将创建一个日志桶。*                           | 您也可以选择一个桶来存储日志数据。                                       |
    | S3 Bucket前缀                | `AppLogs/<index-prefix>/year=%Y/month=%m/day=%d` | 日志代理在将日志文件交付给S3桶时添加前缀。                                 |
    | 缓冲大小                      | 50 MiB                                           | 日志代理在将日志交付给S3之前在日志代理端缓存的日志数据的最大大小。有关更多信息，请查看 [数据交付频率](https://docs.aws.amazon.com/firehose/latest/dev/basic-deliver.html#frequency)。 |
    | 缓冲间隔                      | 60秒                                              | 日志代理将日志交付给S3的最大间隔。有关更多信息，请查看 [数据交付频率](https://docs.aws.amazon.com/firehose/latest/dev/basic-deliver.html#frequency)。 |
    | 数据记录的压缩                  | `Gzip`                                           | 日志代理在将它们交付给S3桶之前会压缩记录。                                   |

    * Kinesis Data Streams缓冲参数

    | 参数                     | 默认值                 | 描述                                                          |
    | ------------------------- | ---------------------- | ------------------------------------------------------------ |
    | 分片数量                   | `<需要输入>`              | Kinesis Data Streams的分片数量。每个分片每秒最多可容纳1,000个记录，并且总数据写入速率为每秒1MB。 |
    | 启用自动缩放               | `否`                   | 该解决方案每5分钟监视一次Kinesis Data Streams的利用率，并自动缩放分片的数量。解决方案在24小时内最多缩放8次。 |
    | 最大分片数量                | `<需要输入>`              | 如果启用了自动缩放，则需要。最大的分片数量。                             |

    !!! 重要 "重要"
        如果在Kinesis Data Streams（KDS）中发生阈值错误，您可能会在OpenSearch中观察到重复的日志。这是因为Fluent Bit日志代理以[块](https://docs.fluentbit.io/manual/administration/buffering-and-storage#chunks-memory-filesystem-and-backpressure) (包含多个记录)上传日志，并在上传失败时重试该块。每个KDS分片每秒最多可支持写入1,000条记录，最大总数据写入速率为每秒1MB。请估算您的日志量并选择合适的分片数量。

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

