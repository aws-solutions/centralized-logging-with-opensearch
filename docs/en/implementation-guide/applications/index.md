# Application Log Analytics Pipelines

Centralized Logging with OpenSearch supports ingesting application logs from the following log sources:

- [Amazon Instance Group](./ec2-pipeline.md): the solution automatically installs [log agent](#log-agent) (Fluent Bit 1.9), collects application logs on EC2 instances and then sends logs into Amazon OpenSearch.
- [Amazon EKS cluster](./eks-pipeline.md): the solution generates all-in-one configuration file for customers to deploy the [log agent](#log-agent) (Fluent Bit 1.9) as a DaemonSet or Sidecar. After log agent is deployed, the solution starts collecting pod logs and sends them to Amazon OpenSearch Service.
- [Amazon S3](./s3-pipeline.md): the solution either ingests logs in the specified Amazon S3 location continuously or performs one-time ingestion. You can also filter logs based on Amazon S3 prefix or parse logs with custom Log Config.
- [Syslog](./syslog-pipeline.md): the solution collects syslog logs through UDP or TCP protocol.

Amazon OpenSearch Service is suitable for real-time log analytics and frequent queries and has full-text search capability.

As of release 2.1.0, the solution starts to support log ingestion into Light Engine, which is suitable for non real-time log analytics and infrequent queries and has SQL-like search capability.

After creating a log analytics pipeline, you can add more log sources to the log analytics pipeline. For more information, see [add a new log source](./create-log-source.md#add-a-new-log-source).

!!! Important "Important"

    If you are using Centralized Logging with OpenSearch to create an application log pipeline for the first time, you are recommended to learn the [concepts](#concepts) and [supported log formats and log sources](#supported-log-formats-and-log-sources).

## Supported Log Formats and Log Sources
{%
include-markdown "include-supported-app-logs.md"
%}
