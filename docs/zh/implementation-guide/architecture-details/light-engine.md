# Light Engine

[![arch-light-engine]][arch-light-engine]
_Light Engine architecture_

## 主要组件

1. 日志处理器
    1. 批量处理存储在 S3 上的原始日志文件，并转换为 Apache Parquet 格式
    2. 根据时间和地区等自动对所有传入的数据进行分区
    3. 在执行任务时，仅计算当前 S3 存储桶中数据的指标
    4. 保存数据处理日志，并在任务执行失败时触发通知
    5. 每个管道/摄取对应于一个 Amazon EventBridge 规则，以定期触发日志处理器，例如，每 5 分钟一次。

2. 日志合并器
    1. 将小文件合并成指定大小的文件，减少文件数量，降低数据存储
    2. 优化分区粒度，并更新 Glue Data Catalog 以减少分区数量
    3. 记录数据处理日志，并在任务执行失败时发送电子邮件通知
    4. 每个管道对应于一个 Amazon EventBridge 规则，以定期触发日志合并器，例如，每天凌晨 1 点。

3. 日志归档器
    1. 将中央存储中的过期数据移动到归档区，直到生命周期规则删除文件
    2. 更新 Glue 数据目录并删除过期的表分区
    3. 记录数据处理日志，并在任务执行失败时发送电子邮件通知
    4. 每个管道对应于一个 Amazon EventBridge 规则，以定期触发日志归档器，例如，每天凌晨 1 点。


[arch-light-engine]: ../../images/architecture/arch-light-engine.svg