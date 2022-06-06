# 常见问题

## 如何在与 Log Hub 部署区域不同的区域中提取 AWS 托管服务的日志？

您可以利用 [S3 跨区域复制](https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication.html) 将日志复制到 Log Hub 部署区域，并设置适当的 [对象生命周期管理](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html) 删除原始数据。


## 当更新堆栈时，CloudFormation 堆栈在删除 `AWS::Lambda::Function` 资源时卡住了。如何解决？

Lambda 函数位于 VPC 中，您需要等待关联的 ENI 资源被删除。

![](../images/faq/cloudformation-stuck.png)

## 此解决方案有哪些限制？

- Log Hub 仅支持启用了细粒度访问控制的 AOS 域。按照[最佳实践](https://docs.aws.amazon.com/elasticsearch-service/latest/developerguide/aes-bp.html)，您可以在 VPC 中创建域。不支持使用公共访问的 AOS。
- Log Hub 必须与要使用的 AOS 域部署在同一 AWS 账户和同一区域中。


## 日志代理

### 重启EC2实例后代理状态为离线，如何让它在实例重启时自动启动？

如果您已安装日志代理，但在创建任何日志摄取之前重新启动实例，通常会发生这种情况。 如果您已经配置日志摄取，代理将自动重启。 如果您有日志摄取，
但依然发生此类问题，请使用 `systemctl status fluent-bit` 检查其在实例中的状态。


## 日志摄取

### 我创建了一个应用程序日志摄取，但是在 OpenSearch 中有重复的记录。

这通常是因为没有足够的 Kinesis Shards 来处理传入的请求。 发生阈值错误时，在 Kinesis 中，Fluent Bit 代理将 [重试](https://docs.fluentbit.io/manual/administration/scheduling-and-retries) [chunk](https://docs.fluentbit.io/manual/administration /缓冲和存储）。