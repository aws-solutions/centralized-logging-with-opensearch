# Application Log Analytics Pipelines

Centralized Logging with OpenSearch supports ingesting application logs from the following log sources:

- [Amazon EC2 instance group](./ec2-pipeline.md): the solution automatically installs [log agent](#log-agent) (Fluent Bit 1.9), collects application logs on EC2 instances and then sends logs into Amazon OpenSearch.
- [Amazon EKS cluster](./eks-pipeline.md): the solution generates all-in-one configuration file for customers to deploy the [log agent](#log-agent) (Fluent Bit 1.9) as a DaemonSet or Sidecar. After log agent is deployed, the solution starts collecting pod logs and sends them to Amazon OpenSearch Service.
- [Amazon S3](./s3-pipeline.md): the solution either ingests logs in the specified Amazon S3 location continuously or performs one-time ingestion. You can also filter logs based on Amazon S3 prefix or parse logs with custom Log Config.
- [Syslog](./syslog-pipeline.md): the solution collects syslog logs through UDP or TCP protocol.

After creating a log analytics pipeline, you can add more log sources to the log analytics pipeline. For more information, see [add a new log source](./create-log-source.md#add-a-new-log-source).

!!! Important "Important"

    If you are using Centralized Logging with OpenSearch to create an application log pipeline for the first time, you are recommended to learn the [concepts](#concepts) and [supported log formats and log sources](#supported-log-formats-and-log-sources).

## Supported Log Formats and Log Sources
{%
include-markdown "include-supported-app-logs.md"
%}

## Concepts

The following introduce concepts that help you to understand how the application log ingestion works.

### Application Log Analytics Pipeline
To collect application logs, a data pipeline is needed. The pipeline not only buffers the data in transmit but also cleans or pre-processes data. For example, transforming IP to Geo location. Currently, Kinesis Data Stream is used as data buffering for EC2 log source.

### Log Ingestion
A log ingestion configures the Log Source, Log Config and the Application Log Analytics Pipeline for the log agent used by Centralized Logging with OpenSearch.
After that, Centralized Logging with OpenSearch will start collecting certain type of logs from the log source and sending them to Amazon OpenSearch.

### Log Agent
A log agent is a program that reads logs from one location and sends them to another location (for example, OpenSearch).
Currently, Centralized Logging with OpenSearch only supports [Fluent Bit 1.9][fluent-bit] log agent which is installed automatically. The Fluent Bit agent has a dependency of [OpenSSL 1.1][open-ssl]. To learn how to install OpenSSL on Linux instances, refer to [OpenSSL installation](../resources/open-ssl.md). To find the supported platforms by Fluent Bit, refer to this [link][supported-platforms].

### Log Buffer
Log Buffer is a buffer layer between the Log Agent and OpenSearch clusters. The agent uploads logs into the buffer
layer before being processed and delivered into the OpenSearch clusters. A buffer layer is a way to protect OpenSearch
clusters from overwhelming. This solution provides the following types of buffer layers.

- **Amazon S3**. Use this option if you can bear minutes-level latency for log ingestion. The log agent periodically uploads logs to an Amazon S3 bucket. The frequency of data delivery to
Amazon S3 is determined by *Buffer size* (default value is 50 MiB) and *Buffer interval* (default value is 60 seconds) value
that you configured when creating the application log analytics pipelines. The condition satisfied first triggers data delivery to Amazon S3.

- **Amazon Kinesis Data Streams**. Use this option if you need real-time log ingestion. The log agent uploads logs to Amazon Kinesis Data Stream in seconds. The frequency
of data delivery to Kinesis Data Streams is determined by *Buffer size* (10 MiB) and *Buffer interval* (5 seconds). The
condition satisfied first triggers data delivery to Kinesis Data Streams.

Log Buffer is optional when creating an application log analytics pipeline. For all types of application logs, this
solution allows you to ingest logs without any buffer layers. However, we only recommend this option when you have
small log volume, and you are confident that the logs will not exceed the thresholds at the OpenSearch side.

### Log Source
A Log Source refers to a location where you want Centralized Logging with OpenSearch to collect application logs from. Supported log sources includes:

* [Amazon EC2 Instance Group](#instance-group)
* [Amazon EKS Cluster](#eks-cluster)
* [Amazon S3](#amazon-s3)
* [Syslog](#syslog)

#### Instance Group
An instance group is a collection of EC2 instances from which you want to collect application logs.
Centralized Logging with OpenSearch can help you install the log agent in each instance within a group. You can select arbitrary instances through the
user interface, or choose an [EC2 Auto Scaling Group][asg].

#### EKS Cluster
The EKS Cluster in Centralized Logging with OpenSearch refers to the Amazon EKS from which you want to collect pod logs. Centralized Logging with OpenSearch
will guide you to deploy the log agent as a DaemonSet or Sidecar in the EKS Cluster.

#### Amazon S3
Centralized Logging with OpenSearch supports collectings logs stored in an Amazon S3 bucket.

#### Syslog
Centralized Logging with OpenSearch supports collecting syslog logs through UDP or TCP protocol.

### Log Config
A Log Config is a configuration that defines the format of logs (that is, what fields each log line includes, and the data type of each field), based on which the Log Analytics Pipeline parses the logs before ingesting them into log storage. Log Config also allows you to define filters of the logs based on the fields in the logs.


[fluent-bit]: https://docs.fluentbit.io/manual/
[open-ssl]: https://www.openssl.org/source/
[supported-platforms]: https://docs.fluentbit.io/manual/installation/supported-platforms
[asg]: https://aws.amazon.com/ec2/autoscaling/
