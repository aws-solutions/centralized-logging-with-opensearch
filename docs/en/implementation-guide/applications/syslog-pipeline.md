# Syslog as log source
Centralized Logging with OpenSearch will collect syslog logs through UDP or TCP protocol.

This article guides you to create a log pipeline that ingests logs from a syslog endpoint.

## Create a log analytics pipeline (OpenSearch Engine)

### Prerequisites
1. [Import an Amazon OpenSearch Service domain](../domains/import.md).

### Create log analytics pipeline

1. Sign in to the Centralized Logging with OpenSearch Console.

2. In the left sidebar, under **Log Analytics Pipelines**, choose **Application Log**.

3. Choose **Create a pipeline**.

4. Choose **Syslog Endpoint** as Log Source, choose **Amazon OpenSearch**, and choose **Next**.

5. Select **UDP** or **TCP** with custom port number. Choose **Next**.

You have created a log source for the log analytics pipeline. Now you are ready to make further configurations for the log analytics pipeline with syslog as log source.

1. Select a log config. If you do not find the desired log config from the drop-down list, choose **Create New**. Refer to [Log Config](./create-log-config.md) for more information.

2. Choose **Next**.

3. Specify **Index name** in lowercase.

4. In the **Buffer** section, choose **S3** or **Kinesis Data Streams**. If you don't want the buffer layer, choose **None**. Refer to the [Log Buffer](./index.md#log-buffer) for more information about choosing the appropriate buffer layer.

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

5. Choose **Next**.

6. In the **Specify OpenSearch domain** section, select an imported domain for **Amazon OpenSearch domain**.

7. In the **Log Lifecycle** section, enter the number of days to manage the Amazon OpenSearch Service index lifecycle. The Centralized Logging with OpenSearch will create the associated [Index State Management (ISM)](https://opensearch.org/docs/latest/im-plugin/ism/index/) policy automatically for this pipeline.

8. In the **Select log processor** section, please choose the log processor.
    - When selecting Lambda as log processor, you can configure the Lambda concurrency if needed.
    - (Optional) OSI as log processor is now supported in these [regions](https://aws.amazon.com/about-aws/whats-new/2023/04/amazon-opensearch-service-ingestion/). When OSI is selected, please type in the minimum and maximum number of OCU. See more information [here](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/ingestion.html#ingestion-scaling).
9. Choose **Next**.

10. Enable **Alarms** if needed and select an exiting SNS topic. If you choose **Create a new SNS topic**, please provide a name and an email address for the new SNS topic.

11. Add tags if needed.

12. Choose **Create**.

13. Wait for the application pipeline turning to "Active" state.

## Create a log analytics pipeline (Light Engine)

### Create a log analytics pipeline

1. Sign in to the Centralized Logging with OpenSearch Console.

2. In the left sidebar, under **Log Analytics Pipelines**, choose **Application Log**.

3. Choose **Create a pipeline**.

4. Choose **Syslog Endpoint** as Log Source, choose **Light Engine**, and choose **Next**.

5. Select **UDP** or **TCP** with custom port number. Choose **Next**.

You have created a log source for the log analytics pipeline. Now you are ready to make further configurations for the log analytics pipeline with syslog as log source.

1. Select a log config. If you do not find the desired log config from the drop-down list, choose **Create New**. Refer to [Log Config](./create-log-config.md) for more information.

2. Choose **Next**.

3. In the **Buffer** section, choose **S3**.
    * S3 buffer parameters

    | Parameter                    | Default                                          | Description                                                  |
    | ---------------------------- | ------------------------------------------------ | ------------------------------------------------------------ |
    | S3 Bucket                    | *A log bucket will be created by the solution.*           | You can also select a bucket to store the log data.                       |
    | S3 Bucket Prefix             | `AppLogs/<index-prefix>/year=%Y/month=%m/day=%d` | The log agent appends the prefix when delivering the log files to the S3 bucket. |
    | Buffer size                  | 50 MiB                                           | The maximum size of log data cached at the log agent side before delivering to S3. For more information, see [Data Delivery Frequency](https://docs.aws.amazon.com/firehose/latest/dev/basic-deliver.html#frequency). |
    | Buffer interval              | 60 seconds                                       | The maximum interval of the log agent to deliver logs to S3. For more information, see [Data Delivery Frequency](https://docs.aws.amazon.com/firehose/latest/dev/basic-deliver.html#frequency). |
    | Compression for data records | `Gzip`                                           | The log agent compresses records before delivering them to the S3 bucket. |

4. Choose **Next**.

4. In the **Specify Light Engine Configuration** section, if you want to ingest associated templated Grafana dashboards, select **Yes** for the sample dashboard.

5. You can choose an existing Grafana, or if you need to import a new one, you can go to Grafana for configuration.

6. Select an S3 bucket to store partitioned logs and define a name for the log table. We have provided a predefined table name, but you can modify it according to your business needs.

7. The log processing frequency is set to **5** minutes by default, with a minimum processing frequency of **1** minute.

8. In the **Log Lifecycle** section, enter the log merge time and log archive time. We have provided default values, but you can adjust them based on your business requirements.

9. Select **Next**.

10. Enable **Alarms** if needed and select an exiting SNS topic. If you choose **Create a new SNS topic**, please provide a name and an email address for the new SNS topic.

11. If desired, add tags.

12. Select **Create**.

13. Wait for the application pipeline turning to "Active" state.

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

