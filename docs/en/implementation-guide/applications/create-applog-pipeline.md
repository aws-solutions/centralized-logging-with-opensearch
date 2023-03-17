1. Sign in to the Centralized Logging with OpenSearch Console.

2. In the left sidebar, under **Log Analytics Pipelines**, choose **Application Log**.

3. Click the **Create a pipeline**.

4. Specify **Index name** in lowercase.

5. In the **Buffer** section, choose **S3** or **Kinesis Data Streams**. If you don't want the buffer layer, choose **None**. Refer to the [Log Buffer](./index.md#log-buffer) for more information about choosing the appropriate buffer layer.

    * S3 buffer parameters

    | Parameter                    | Default                                          | Description                                                  |
    | ---------------------------- | ------------------------------------------------ | ------------------------------------------------------------ |
    | S3 Bucket                    | *A log bucket will be created by the solution.*           | You can also select a bucket to store the log data.                       |
    | S3 Bucket Prefix             | `AppLogs/<index-prefix>/year=%Y/month=%m/day=%d` | The log agent appends the prefix when delivering the log files to the S3 bucket. |
    | Buffer size                  | 50 MiB                                           | The maximum size of log data cached at the log agent side before delivering to S3. For more information, see [Data Delivery Frequency](https://docs.aws.amazon.com/firehose/latest/dev/basic-deliver.html#frequency). |
    | Buffer interval              | 60 seconds                                       | The maximum interval of the log agent to deliver logs to S3. For more information, see [Data Delivery Frequency](https://docs.aws.amazon.com/firehose/latest/dev/basic-deliver.html#frequency). |
    | Compression for data records | `Gzip`                                           | The log agent compresses records before delivering them to the S3 bucket. |

    * Kinesis Data Streams buffer parameters

    | Parameter            | Default            | Description                                                  |
    | -------------------- | ------------------ | ------------------------------------------------------------ |
    | Shard number         | `<Requires input>` | The number of shards of the Kinesis Data Streams. Each shard can have up to 1,000 records per second and total data write rate of 1MB per second. |
    | Enable auto scaling | `No`               | This solution monitors the utilization of Kinesis Data Streams every 5 minutes, and scale in/out the number of shards automatically. The solution will scale in/out for a maximum of 8 times within 24 hours. |
    | Maximum Shard number | `<Requires input>` | Required if auto scaling is enabled. The maximum number of shards. |


    !!! important "Important"
        You may observe duplicate logs in OpenSearch if threshold error occurs in Kinesis Data Streams (KDS). This is because the Fluent Bit log agent uploads logs in [chunk](https://docs.fluentbit.io/manual/administration/buffering-and-storage#chunks-memory-filesystem-and-backpressure) (contains multiple records), and will retry the chunk if upload failed. Each
        KDS shard can support up to 1,000 records per second for writes, up to a maximum total data write rate of 1 MB per second. Please estimate your log volume and choose an appropriate shard number.

6. Choose **Next**.

7. In the **Specify OpenSearch domain** section, select an imported domain for **Amazon OpenSearch domain**.

8. In the **Log Lifecycle** section, enter the number of days to manage the Amazon OpenSearch Service index lifecycle. The Centralized Logging with OpenSearch will create the associated [Index State Management (ISM)](https://opensearch.org/docs/latest/im-plugin/ism/index/) policy automatically for this pipeline.

9. Choose **Next**.

10. Add tags if needed.

11. Choose **Create**.

12. Wait for the application pipeline turning to "Active" state.