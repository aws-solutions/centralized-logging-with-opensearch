# 创建一个应用日志分析管道

1. 登录 Log Hub 控制台。
2. 在左侧边栏中的 **日志分析管道** 下，选择 **应用日志**。
3. 单击**创建管道**。
4. 以小写形式指定**索引名称**。
5. 在 **Buffer** 选项中, 选择 **S3** 或者 **Kinesis Data Streams**. 如果您不需要缓冲层, 选择 **None**. 详情请参阅 [Log Buffer](./index.md#log-buffer)，来选择适合您场景的缓冲层。

    * S3 buffer 参数

    | 参数                    | 默认值                                              | 描述                                                         |
    |--------------------------------------------------|------------------------------------------------------------| ------------------------------------------------------------ |
    | S3 Bucket           | *默认为您创建的 log bucket*                             | 选择存储数据的桶。                                                  |
    | S3 Bucket Prefix    | `AppLogs/<index-prefix>/year=%Y/month=%m/day=%d` | 日志代理在将日志文件传送到 S3 存储桶时的附加前缀。                                |
    | Buffer size         | 50 MiB                                           | 在传送到 S3 之前在日志代理端缓存的最大日志数据量。如果 Buffer interval 先触发，数据量可能会更小。 |
    | Buffer interval     | 60 seconds                                       | 日志代理将日志传送到 S3 的时间间隔。如果 Buffer size 先触发，间隔可能会更短。            |
    | Compression for data records | `Gzip`                                           | 日志代理在将日志传送到 S3 存储桶之前的压缩格式。                                 |

    * Kinesis Data Streams buffer 参数

    | Parameter            | Default            | Description                                                         |
    | -------------------- |---------------------------------------------------------------------| ------------------------------------------------------------ |
    | Shard number         | `<requires input>` | Kinesis Data Streams 的分片数量。每个分片每秒最多可以有 1,000 条记录，总的数据写入速率为每秒 1MB。   |
    | Enable auto scaling? | `No`               | 该解决方案每 5 分钟监控一次 Kinesis Data Streams 的利用率，并自动缩放分片数量。24 小时内最多缩放 8 次。 |
    | Maximum Shard number | `<requires input>` | 分片的最大数量。如果启用了自动缩放，则需要填写。                                            |




    !!! important "重要"
        如果 Kinesis Data Streams (KDS) 中出现阈值错误，您可能会在 OpenSearch 中观察到重复日志。 这是因为 Fluent Bit 日志代理以[块](https://docs.fluentbit.io/manual/administration/buffering-and-storage#chunks-memory-filesystem-and-backpressure)的形式上传日志（包含多条记录），如果上传失败会重试该块。 每个 KDS 分片最多可支持每秒 1,000 条记录进行写入，最高总数据写入速率为每秒 1 MB。 请估计您的日志量并选择合适的分片数。

6. 选择**下一步**。
7. 在 **指定 OpenSearch 域** 部分，为 **Amazon OpenSearch 域** 选择一个导入的域。
8. 在 **日志生命周期** 部分，输入管理 AOS 索引生命周期的天数。  Log Hub 将为此管道自动创建关联的 [索引状态管理 (ISM)](https://opensearch.org/docs/latest/im-plugin/ism/index/) 策略。
9. 选择**下一步**。
10. 如果需要，添加标签。
11. 选择**创建**。
12. 等待应用管道转为"有效"状态。