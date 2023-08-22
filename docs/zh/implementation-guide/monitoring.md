# 指标类型
在日志通（Centralized Logging with OpenSearch）控制台上，以下类型的指标是可用的。

## 日志源指标
### Fluent Bit

- `FluentBitOutputProcRecords` - 该输出实例成功发送的日志记录数量。这是由此输出发送的所有唯一块的总记录数。如果记录未成功发送，则不计入此指标。
- `FluentBitOutputProcBytes` - 该输出实例成功发送的日志记录字节数。这是由此输出发送的所有唯一块的总字节大小。如果由于某些错误未发送记录，则不计入此指标。
- `FluentBitOutputDroppedRecords` - 被输出丢弃的日志记录数量。这意味着它们遇到了无法恢复的错误或者重试超时。
- `FluentBitOutputErrors` - 遇到错误的块数（无论是无法恢复的还是可恢复的）。这是块失败的次数，与您在Fluent Bit日志输出中看到的错误消息数目无关。
- `FluentBitOutputRetriedRecords` - 经历重试的日志记录数量。请注意，这是在块级别计算的，当整个块被标记为重试时，计数会增加。输出插件可能会执行多个生成许多错误消息的操作，从而上传单个块。
- `FluentBitOutputRetriesFailed` - 重试为块过期的次数。每个插件都配置了适用于块的`Retry_Limit`。一旦块的重试限制达到，块将被丢弃，此指标会增加。
- `FluentBitOutputRetries` - 此输出实例为块请求重试的次数。

### 网络负载均衡器

- `SyslogNLBActiveFlowCount` - 客户端到目标的并发流（或连接）总数。此指标包括SYN_SENT和ESTABLISHED状态的连接。TCP连接在负载均衡器上不会终止，因此客户端打开到目标的TCP连接算作单个流。
- `SyslogNLBProcessedBytes` - 负载均衡器处理的字节数总量，包括TCP/IP头部。此计数包括与目标之间的流量，减去健康检查流量。

## 缓冲区指标
日志缓冲区是日志代理与OpenSearch集群之间的缓冲层。代理将日志上传到缓冲层，然后将其处理并传送到OpenSearch集群。缓冲层是一种保护OpenSearch集群免受过载的方式。

### Kinesis数据流

- `KDSIncomingBytes` – 在指定的时间段内成功放入Kinesis流中的字节数。此指标包括PutRecord和PutRecords操作的字节。最小、最大和平均统计数据表示在指定的时间段内流的单个放入操作的字节数。
- `KDSIncomingRecords` – 在指定的时间段内成功放入Kinesis流中的记录数。此指标包括PutRecord和PutRecords操作的记录计数。最小、最大和平均统计数据表示在指定的时间段内流的单个放入操作的记录数。
- `KDSPutRecordBytes` – 在指定的时间段内使用PutRecord操作放入Kinesis流中的字节数。
- `KDSThrottledRecords` – 在指定的时间段内由于限流而被拒绝的记录数，每个Kinesis数据流的PutRecords操作。 
- `KDSWriteProvisionedThroughputExceeded` – 在指定的时间段内由于限流而被拒绝的记录数。此指标包括PutRecord和PutRecords操作的限流。此指标通常使用平均统计数据。

  当最小统计数据具有非零值时，流在指定的时间段内将被限制。 
  当最大统计数据的值为0时，流在指定的时间段内不会被限制。

### SQS

- `SQSNumberOfMessagesSent` - 添加到队列的消息数。
- `SQSNumberOfMessagesDeleted` - 从队列中删除的消息数。

  Amazon SQS为每个成功使用有效接收处理程序执行的删除操作发出NumberOfMessagesDeleted指标，包括重复删除。以下情况可能导致NumberOfMessagesDeleted指标的值高于预期：

  - 对属于同一消息的不同接收处理程序调用DeleteMessage操作：如果消息在可见性超时到期之前未被处理，该消息将可供其他可以处理并再次删除的消费者使用，从而增加NumberOfMessagesDeleted指标的值。

  - 对相同接收处理程序调用DeleteMessage操作：如果消息被处理并删除，但您再次使用相同接收处理程序调用DeleteMessage操作，将返回成功状态，从而增加NumberOfMessagesDeleted指标的值。

- `SQSApproximateNumberOfMessagesVisible` - 可以从队列检索的消息数。
- `SQSApproximateAgeOfOldestMessage` - 队列中最旧的未删除消息的近似年龄。
  - 在消息被接收三次（或更多次）且未被处理之后，该消息被移动到队列的末尾，ApproximateAgeOfOldestMessage指标指向未被接收超过三次的第二旧消息。即使队列具有重试策略，此操作仍会发生。

  - 因为单个毒丸消息（多次接收但从未删除）可能会扭曲此指标，所以在成功消费毒丸消息之前，不会将毒丸消息的年龄包括在内。

  - 当队列具有重试策略时，消息在配置的**最大接收次数**后将移动到死信队列。当消息移动到死信队列时，死信队列的ApproximateAgeOfOldestMessage指标表示消息移动到死信队列的时间（而不是消息发送的原始时间）。

## 日志处理器指标
日志处理器Lambda负责对数据执行最终处理，并将其批量写入OpenSearch。

- `TotalLogs` – Lambda函数处理的日志记录或事件总数。
- `ExcludedLogs` – 由于过滤或其他条件而被排除在外的日志记录或事件数。
- `LoadedLogs` – 成功处理并加载到OpenSearch中的日志记录或事件数。
- `FailedLogs` – 未能被处理或加载到OpenSearch中的日志记录或事件数。
- `ConcurrentExecutions` – 处理事件的函数实例数。如果此数达到您在该区域的[并发执行限额](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html#compute-and-storage)，或函数的[预留并发限制](https://docs.aws.amazon.com/lambda/latest/dg/configuration-concurrency.html)，则Lambda会对其他调用请求进行限流。
- `Duration` – 函数代码处理事件所需的时间。对于一个调用的计费时长，是将Duration的值四舍五入到最近的毫秒。
- `Throttles` – 被限流的调用请求数。当所有函数实例都在处理请求且没有可用的并发数进行扩展时，Lambda将使用TooManyRequestsException错误拒绝附加请求。被限流的请求和其他调用错误既不计入调用次数，也不计入错误次数。
- `Invocations` – 函数代码被调用的次数，包括成功调用和导致函数错误的调用。如果调用请求被限流或以其他方式导致调用错误，则不记录调用次数。Invocations的值等于计费的请求次数。
