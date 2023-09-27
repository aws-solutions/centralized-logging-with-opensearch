# Amazon EC2 instance group as log source
An instance group represents a group of EC2 Linux instances, which enables the solution to associate a Log Config with multiple EC2 instances quickly. Centralized Logging with OpenSearch uses Systems Manager Agent (SSM Agent) to install/configure Fluent Bit agent, and sends log data to Kinesis Data Streams.

This article guides you to create a log pipeline that ingests logs from an EC2 instance group.

## Prerequisites
1. [Import an Amazon OpenSearch Service domain](../domains/import.md).

## Create a log analytics pipeline

1. Sign in to the Centralized Logging with OpenSearch Console.

2. In the left sidebar, under **Log Analytics Pipelines**, choose **Application Log**.
   
3. Choose **Create a pipeline**

4. Choose **Instance Group** as Log Source, and choose **Next**.

5. Select an instance group. If you have no instance group yet, choose **Create Instance Group** at the top right corner, and follow the [Instance Group](./create-log-source.md#amazon-ec2-instance-group) guide to create an instance group. After that, choose **Refresh** and then select the newly created instance group.

6. (Auto Scaling Group only) If your instance group is created based on an Auto Scaling Group, after ingestion status become "Created", then you can find the generated Shell Script in the instance group's detail page. Copy the shell script and update the User Data of the Auto Scaling [Launch configurations](https://docs.aws.amazon.com/autoscaling/ec2/userguide/launch-configurations.html) or [Launch template](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-launch-templates.html).

7. Keep the default **Permission grant method**.

8. (Optional) If you choose **I will manually add the below required permissions after pipeline creation**, continue to do the following:

    1. Choose **Expand to view required permissions** and copy the provided JSON policy.
    2. Go to **AWS Management Console**.
    3. On the left navigation pane, choose **IAM**, and select **Policies** under **Access management**.
    4. Choose **Create Policy**, choose **JSON** and replace all the content inside the text block. Make sure to substitute `<YOUR ACCOUNT ID>` with your account id.
    5. Choose **Next**, and then enter a name for this policy.
    6. Attach the policy to your EC2 instance profile to grant the log agent permissions to send logs to the application log pipeline. If you are using Auto Scaling group, you need to update the IAM instance profile associated with the Auto Scaling Group. If needed, you can follow the documentation to update your [launch template][launch-template] or [launch configuration][launch-configuration].

9. Choose **Next**.

You have created a log source for the log analytics pipeline. Now you are ready to make further configurations for the log analytics pipeline with Amazon EC2 instance group as log source.

1. Enter a **Log Path** to specify the location of logs you want to collect.
   
2. Select a log config and then choose **Next**. If you do not find desired log config from the drop-down list, choose **Create New**, and follow instructions in [Log Cong](./create-log-config.md).

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

8. Choose **Next**.

9. Enable **Alarms** if needed and select an exiting SNS topic. If you choose **Create a new SNS topic**, please provide a name and an email address for the new SNS topic.

10. Add tags if needed.

11. Choose **Create**.

12. Wait for the application pipeline turning to "Active" state.




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

