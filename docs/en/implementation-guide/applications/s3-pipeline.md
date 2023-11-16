# Amazon S3 as log source
For Amazon S3, Centralized Logging with OpenSearch will ingest logs in a specified S3 location continuously or perform one-time ingestion. You can also filter logs based on S3 prefix or parse logs with custom Log Config.

This article guides you to create a log pipeline that ingests logs from an S3 bucket.

## Prerequisites
1. [Import an Amazon OpenSearch Service domain](../domains/import.md).

## Create log analytics pipeline
1. Sign in to the Centralized Logging with OpenSearch Console.

2. In the left sidebar, under **Log Analytics Pipelines**, choose **Application Log**.

3. Choose **Create a pipeline**.

4. Choose **Amazon S3** as Log Source, and choose **Next**.

5. Choose the Amazon S3 bucket where your logs are stored. If needed,enter **Prefix filter**, which is optional.

6. Choose **Ingestion mode** based on your need. If you want to ingest the log continuously, select **On-going**; if you only need to ingest the log once, select **One-time**.

7. Specify **Compression format** if your log files are compressed, and choose **Next**.

You have created a log source for the log analytics pipeline. Now you are ready to make further configurations for the log analytics pipeline with Amazon S3 as log source.

1. Select a log config. If you do not find the desired log config from the drop-down list, choose **Create New**. Refer to [Log Config](./create-log-config.md) for more information.

2. Choose **Next**.

3. Specify **Index name** in lowercase.

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

