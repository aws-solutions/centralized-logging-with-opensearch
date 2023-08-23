<!--ig-start-->
#### 实例组作为日志源

1. 登录至使用OpenSearch的中央化日志控制台。

2. 在左侧边栏中，点击 **日志分析管道** 下的 **应用日志**。

3. 选择 **日志源** 为实例组。

4. 选择您已创建的实例组，

5. (仅限于自动扩展组) 如果您的实例组是基于自动扩展组创建的，在摄取状态变为“已创建”后，您可以在实例组的详细页面中找到生成的Shell脚本。复制该shell脚本并更新自动扩展的 [启动配置](https://docs.aws.amazon.com/autoscaling/ec2/userguide/launch-configurations.html) 或 [启动模板](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-launch-templates.html) 中的用户数据。

6. 选择 **权限授予方法**。如果您选择 **我会在管道创建后手动添加以下所需的权限**，您需要点击 **展开查看所需的权限** 并复制提供的JSON策略。

7. 转到 **AWS控制台 > IAM > 策略** 在左侧列，并

    1. 选择 **创建策略**，选择 **JSON** 并替换文本块内的所有内容。请记住将 `<YOUR ACCOUNT ID>` 替换为您的账户ID。

    2. 选择 **下一步**，**下一步**，然后为此策略输入名称。

    3. 将策略附加到您的EC2实例配置文件，以授予日志代理发送日志到应用日志管道的权限。如果您使用的是自动扩展组，则需要更新与自动扩展组关联的IAM实例配置文件。如有需要，您可以按照文档来更新您的[启动模板][launch-template]或[启动配置][launch-configuration]。

8. 输入 **日志路径** 并选择之前设置中创建的日志配置，然后选择 **下一步**。

9. 在 **索引名称** 中小写指定。

10. 在 **缓冲区** 部分中，选择 **S3** 或 **Kinesis Data Streams**。如果您不希望有缓冲层，请选择 **无**。请参阅 [日志缓冲](./index.md#log-buffer) 获取关于选择适当缓冲层的更多信息。

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

11. 选择 **下一步**。

12. 在 **指定OpenSearch域** 部分，为 **Amazon OpenSearch域** 选择一个已导入的域。

13. 在 **日志生命周期** 部分，输入天数以管理Amazon OpenSearch Service索引生命周期。与OpenSearch一起的中央化日志将为这个管道自动创建关联的 [索引状态管理(ISM)](https://opensearch.org/docs/latest/im-plugin/ism/index/) 政策。

14. 选择 **下一步**。

15. 如果需要，请启用 **警报** 并选择一个现有的SNS主题。如果您选择 **创建一个新的SNS主题**，请为新的SNS主题提供一个名称和电子邮件地址。

16. 如果需要，请添加标签。

17. 选择 **创建**。

18. 等待应用程序管道转变为“活动”状态。

<!--ig-start-->

<!--eks-start-->
### Amazon EKS集群作为日志来源

1. 登录到**日志通控制台**。

2. 在左侧边栏下，点击 **日志分析管道**，选择 **应用日志**。

3. 选择存储日志的AWS帐户和在**先决条件**期间导入作为日志来源的EKS集群。

4. 输入日志文件的位置。

5. 选择在之前设置中创建的日志配置，并选择 **下一步**。

6. 以小写指定**索引名称**。

7. 在**缓冲**部分，选择**S3**或**Kinesis Data Streams**。如果您不希望使用缓冲层，选择**无**。有关选择适当的缓冲层的更多信息，请参阅[日志缓冲](./index.md#log-buffer)。

    * S3缓冲参数

    | 参数                          | 默认值                                                    | 描述                                                         |
    | ---------------------------- | ------------------------------------------------------- | ------------------------------------------------------------ |
    | S3 Bucket                    | *此解决方案将创建一个日志桶。*                                 | 你也可以选择一个桶来存储日志数据。                                         |
    | S3 Bucket Prefix             | `AppLogs/<index-prefix>/year=%Y/month=%m/day=%d`         | 日志代理在将日志文件交付给S3桶时添加前缀。                               |
    | Buffer size                  | 50 MiB                                                   | 在将日志交付给S3之前，日志代理端缓存的日志数据的最大大小。关于更多信息，请查看[数据交付频率](https://docs.aws.amazon.com/firehose/latest/dev/basic-deliver.html#frequency)。|
    | Buffer interval              | 60 秒                                                    | 日志代理交付日志到S3的最大间隔。关于更多信息，请查看[数据交付频率](https://docs.aws.amazon.com/firehose/latest/dev/basic-deliver.html#frequency)。 |
    | Compression for data records | `Gzip`                                                   | 日志代理在将记录交付给S3桶之前压缩它们。                            |

    * Kinesis Data Streams缓冲参数

    | 参数                    | 默认值                 | 描述                                                         |
    | --------------------   | ------------------   | ------------------------------------------------------------ |
    | Shard number           | `<需要输入>`            | Kinesis Data Streams的分片数。每个分片每秒最多可以有1,000条记录，并且总数据写入速率为每秒1MB。 |
    | Enable auto scaling    | `否`                   | 此解决方案每5分钟监控一次Kinesis Data Streams的使用情况，并自动放大/缩小分片数量。此解决方案在24小时内最多会放大/缩小8次。|
    | Maximum Shard number   | `<需要输入>`            | 如果启用了自动缩放，则需要。分片的最大数量。                        |

    !!! important "重要"
        如果在Kinesis Data Streams（KDS）中发生阈值错误，您可能会在OpenSearch中观察到重复的日志。这是因为Fluent Bit日志代理以[块](https://docs.fluentbit.io/manual/administration/buffering-and-storage#chunks-memory-filesystem-and-backpressure)（包含多个记录）上传日志，并在上传失败时重试该块。每个KDS分片每秒最多可支持写入1,000条记录，最大总数据写入速率为每秒1MB。请估算您的日志量并选择合适的分片数量。

8. 选择**下一步**。

9. 在**指定OpenSearch域**部分，为**Amazon OpenSearch域**选择一个导入的域。

10. 在**日志生命周期**部分，输入管理 Amazon OpenSearch Service 索引生命周期的天数。日志通与 OpenSearch 将自动为此管道创建相关的[Index State Management (ISM)](https://opensearch.org/docs/latest/im-plugin/ism/index/)策略。

11. 选择**下一步**。

12. 如果需要，请启用**警报**并选择现有的SNS主题。如果您选择**创建新的SNS主题**，请为新的SNS主题提供一个名称和电子邮件地址。

13. 如有需要，请添加标签。

14. 选择**创建**以完成摄取的创建。

15. 等待应用程序管道转变为“活动”状态。

16. 按照日志通生成的指南部署 Fluent Bit 日志代理。

    1. 选择在之前设置中创建的应用程序管道

    2. 选择刚刚创建的应用日志摄取。

    3. 按照**DaemonSet**或**Sidecar**指南部署日志代理。

<!--eks-end-->

<!--s3-start-->
### Amazon S3 作为日志源

1. 登录到 日志通 控制台。
2. 在左侧边栏下，选择 **日志分析管道**，然后选择 **应用日志**。
3. 选择 Amazon S3 作为 **日志源**。
4. 选择存储日志的 S3 桶并输入 **前缀过滤器**（请注意，**前缀过滤器** 是可选的）。
5. 根据您的需要选择 **导入模式**。如果您想持续地摄取日志，请选择 **持续加载**；如果您只需要摄取一次日志，请选择 **一次性加载**。
6. 如果您的日志文件已经被压缩，指定 **压缩格式**。
7. 选择在之前设置中创建的日志配置，然后选择 **下一步**。
8. 用小写字母指定 **索引名称**。

9. 在 **Buffer** 部分中，选择 **S3** 或 **Kinesis Data Streams**。如果您不需要缓冲层，请选择 **None**。有关选择合适的缓冲层的更多信息，请参考 [Log Buffer](./index.md#log-buffer)。

    * S3 缓冲参数

    | Parameter                    | Default                                         | Description                                                  |
    | ---------------------------- | ----------------------------------------------- | ------------------------------------------------------------ |
    | S3 Bucket                    | *该解决方案会创建一个日志桶。*                   | 您也可以选择一个桶来存储日志数据。                            |
    | S3 Bucket Prefix             | `AppLogs/<index-prefix>/year=%Y/month=%m/day=%d`| 日志代理在将日志文件传送到 S3 桶时会追加前缀。                  |
    | Buffer size                  | 50 MiB                                          | 在日志代理端缓存的日志数据的最大大小，传送到 S3 之前。关于这点的更多信息，请查看 [Data Delivery Frequency](https://docs.aws.amazon.com/firehose/latest/dev/basic-deliver.html#frequency)。 |
    | Buffer interval              | 60 seconds                                      | 日志代理传送日志到 S3 的最大间隔。关于这点的更多信息，请查看 [Data Delivery Frequency](https://docs.aws.amazon.com/firehose/latest/dev/basic-deliver.html#frequency)。 |
    | Compression for data records | `Gzip`                                          | 日志代理在将它们传送到 S3 桶之前会压缩记录。                    |

    * Kinesis Data Streams 缓冲参数

    | Parameter            | Default            | Description                                                  |
    | -------------------- | ------------------ | ------------------------------------------------------------ |
    | Shard number         | `<需要输入>`       | Kinesis Data Streams 的 shard 数量。每个 shard 最多可以每秒有 1,000 条记录，并且总的数据写入速率为每秒 1MB。 |
    | Enable auto scaling  | `No`               | 此解决方案每 5 分钟监视一次 Kinesis Data Streams 的使用情况，并自动调整 shard 的数量。该解决方案将在 24 小时内最多调整 8 次。 |
    | Maximum Shard number | `<需要输入>`       | 如果启用了自动缩放，则需要。shard 的最大数量。               |

    !!! important "重要"
        如果在 Kinesis Data Streams (KDS) 中出现阈值错误，您可能会在 OpenSearch 中观察到重复的日志。这是因为 Fluent Bit 日志代理在 [chunk](https://docs.fluentbit.io/manual/administration/buffering-and-storage#chunks-memory-filesystem-and-backpressure)（包含多个记录）中上传日志，如果上传失败会重试该 chunk。每个 KDS shard 最多可以每秒支持 1,000 条记录的写入，最大总数据写入速率为每秒 1MB。请估计您的日志量，并选择合适的 shard 数量。

10. 选择 **下一步**。
11. 在 **Specify OpenSearch domain** 部分，为 **Amazon OpenSearch domain** 选择一个导入的域。
12. 在 **Log Lifecycle** 部分，输入管理 Amazon OpenSearch Service 索引生命周期的天数。日志通 将为此管道自动创建相关的 [Index State Management (ISM)](https://opensearch.org/docs/latest/im-plugin/ism/index/) 策略。
13. 选择 **下一步**。
14. 如有需要，请启用 **Alarms** 并选择一个现有的 SNS 主题。如果您选择 **Create a new SNS topic**，请为新的 SNS 主题提供一个名称和电子邮件地址。
15. 如有需要，添加标签。
16. 选择 **Create**。
17. 等待应用程序管道转变为“Active”状态。
<!--s3-end-->

<!--syslog-start-->
### Syslog 作为 日志源

1. 登录到 日志通 控制台。

2. 在左侧边栏中，在 **日志分析管道** 下，选择 **应用日志**。

3. 选择 Syslog Endpoint 作为 **日志源**。

4. 您可以使用 UDP 或 TCP 并带有自定义端口号。选择 **下一步**。

5. 选择在之前设置中创建的日志配置，然后选择 **下一步**。

6. 以小写形式指定 **索引名称**。

7. 在 **Buffer** 部分中，选择 **S3** 或 **Kinesis Data Streams**。如果您不希望有缓冲层，请选择 **None**。请参阅 [Log Buffer](./index.md#log-buffer) 以获取有关选择合适的缓冲层的更多信息。

    * S3 缓冲参数

    | 参数                          | 默认值                                           | 描述                                                         |
    | ----------------------------- | ------------------------------------------------ | ------------------------------------------------------------ |
    | S3 Bucket                     | *解决方案将创建一个日志存储桶。*                        | 您还可以选择一个存储日志数据的存储桶。                                  |
    | S3 Bucket Prefix              | `AppLogs/<index-prefix>/year=%Y/month=%m/day=%d` | 日志代理在将日志文件传送到 S3 存储桶时会附加前缀。                         |
    | Buffer size                   | 50 MiB                                           | 在将数据传送到 S3 之前，日志代理侧缓存的日志数据的最大大小。有关更多信息，请参见 [Data Delivery Frequency](https://docs.aws.amazon.com/firehose/latest/dev/basic-deliver.html#frequency)。 |
    | Buffer interval               | 60 seconds                                       | 日志代理传送日志到 S3 的最大间隔。有关更多信息，请参见 [Data Delivery Frequency](https://docs.aws.amazon.com/firehose/latest/dev/basic-deliver.html#frequency)。 |
    | Compression for data records  | `Gzip`                                           | 日志代理在将其传送到 S3 存储桶之前会压缩记录。                           |

    * Kinesis Data Streams 缓冲参数

    | 参数                         | 默认值                    | 描述                                                         |
    | --------------------------- | ------------------------- | ------------------------------------------------------------ |
    | Shard number                | `<Requires input>`        | Kinesis Data Streams 的碎片数量。每个碎片每秒最多可以有 1,000 个记录，数据写入速率最大为 1MB。 |
    | Enable auto scaling         | `No`                      | 该解决方案每5分钟监视 Kinesis Data Streams 的利用情况，并自动增加/减少碎片数量。此解决方案每24小时最多可以增加/减少8次。 |
    | Maximum Shard number        | `<Requires input>`        | 如果启用了 auto scaling，则需要。碎片的最大数量。                  |

    !!! important "重要"
        如果在 Kinesis Data Streams (KDS) 中发生阈值错误，您可能会在 OpenSearch 中观察到重复的日志。这是因为 Fluent Bit 日志代理以 [chunk](https://docs.fluentbit.io/manual/administration/buffering-and-storage#chunks-memory-filesystem-and-backpressure) （包含多个记录）上传日志，并且如果上传失败会重试该块。每个 KDS 碎片最多可以支持每秒1,000条记录的写入，最大总数据写入速率为1 MB。请估计您的日志量并选择合适的碎片数量。

8. 选择 **下一步**。

9. 在 **Specify OpenSearch domain** 部分中，为 **Amazon OpenSearch domain** 选择一个已导入的域。

10. 在 **Log Lifecycle** 部分中，输入管理 Amazon OpenSearch Service 索引生命周期的天数。日志通 将为此管道自动创建关联的 [Index State Management (ISM)](https://opensearch.org/docs/latest/im-plugin/ism/index/) 策略。

11. 选择 **下一步**。

12. 如果需要，请启用 **Alarms** 并选择一个现有的 SNS 主题。如果您选择 **Create a new SNS topic**，请为新的 SNS 主题提供名称和电子邮件地址。

13. 如果需要，请添加标签。

14. 选择 **Create**。

15. 等待应用管道转到 "Active" 状态。

<!--syslog-end-->






[launch-template]: https://docs.aws.amazon.com/autoscaling/ec2/userguide/create-launch-template.html#advanced-settings-for-your-launch-template
[launch-configuration]: https://docs.aws.amazon.com/autoscaling/ec2/userguide/change-launch-config.html