# 创建一个应用日志分析管道

1. 登录 Log Hub 控制台。
2. 在左侧边栏中的 **日志分析管道** 下，选择 **应用日志**。
3. 单击**创建管道**。
4. 以小写形式指定**索引名称**。
5. 在 **Buffer(Amazon Kinesis Data Streams)** 部分中，指定初始分片号。

    !!! important "重要"
        如果 Kinesis Data Streams (KDS) 中出现阈值错误，您可能会在 OpenSearch 中观察到重复日志。 这是因为 Fluent Bit 日志代理以[块](https://docs.fluentbit.io/manual/administration/buffering-and-storage#chunks-memory-filesystem-and-backpressure)的形式上传日志（包含多条记录），如果上传失败会重试该块。 每个 KDS 分片最多可支持每秒 1,000 条记录进行写入，最高总数据写入速率为每秒 1 MB。 请估计您的日志量并选择合适的分片数。

7. （可选步骤）选择 **是** 以根据输入日志流量启用 Kinesis Data Streams 分片的自动缩放，并指定最大分片数。
8. 选择**下一步**。
9. 在 **指定 OpenSearch 域** 部分，为 **Amazon OpenSearch 域** 选择一个导入的域。
10. 在 **日志生命周期** 部分，输入管理 AOS 索引生命周期的天数。  Log Hub 将为此管道自动创建关联的 [索引状态管理 (ISM)](https://opensearch.org/docs/latest/im-plugin/ism/index/) 策略。
11. 选择**下一步**。
12. 如果需要，添加标签。
13. 选择**创建**。
14. 等待应用管道转为"有效"状态。