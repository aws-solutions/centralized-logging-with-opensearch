# Application Log Analytics Pipelines

Centralized Logging with OpenSearch supports ingesting application logs from EC2 instances, EKS clusters, and Syslog.

- For EC2 instances, Centralized Logging with OpenSearch will automatically install [log agent](#log-agent) ([Fluent Bit 1.9][fluent-bit]), collect application logs on EC2 instances and then send logs into Amazon OpenSearch.
- For EKS clusters, Centralized Logging with OpenSearch will generate all-in-one configuration file for customers to deploy the [log agent](#log-agent) ([Fluent Bit 1.9][fluent-bit]) as a DaemonSet or Sidecar. After log agent is deployed, Centralized Logging with OpenSearch will start collecting pod logs and send to Amazon OpenSearch.
- For Syslog, Centralized Logging with OpenSearch will collect syslog logs through UDP or TCP protocol.

## Supported Log Formats and Sources
{%
include-markdown "include-supported-app-logs.md"
%}

In this chapter, you will learn how to create log ingestion for the following log formats:

- [Apache HTTP server logs](./apache.md)
- [Nginx logs](./nginx.md)
- [Single-line Text logs](./single-line-text.md)
- [Multi-line Text logs](./multi-line-text.md)
- [JSON logs](./json.md)
- [Syslog logs](./syslog.md)

Before creating log ingestion, you need to:

- [Create a log source](./create-log-source.md) (not applicable for Syslog)
- [Create an application log pipeline](./create-applog-pipeline.md)

## Concepts

The following introduce concepts that help you to understand how the application log ingestion works.

### Application Log Analytics Pipeline
To collect application logs, a data pipeline is needed. The pipeline not only buffers the data in transmit but also cleans or pre-processes data. For example, transforming IP to Geo location. Currently, Kinesis Data Stream is used as data buffering for EC2 log source.

### Log Ingestion
A log ingestion configures the Log Source, Log Type and the Application Log Analytics Pipeline for the log agent used by Centralized Logging with OpenSearch.
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

* [Instance Group](#instance-group)
* [EKS Cluster](#eks-cluster)
* [Syslog](#syslog)

#### Instance Group
An instance group is a collection of EC2 instances from which you want to collect application logs.
Centralized Logging with OpenSearch can help you install the log agent in each instance within a group. You can select arbitrary instances through the
user interface, or choose an [EC2 Auto Scaling Group][asg].

#### EKS Cluster
The EKS Cluster in Centralized Logging with OpenSearch refers to the Amazon EKS from which you want to collect pod logs. Centralized Logging with OpenSearch
will guide you to deploy the log agent as a DaemonSet or Sidecar in the EKS Cluster.

#### Syslog
Centralized Logging with OpenSearch supports collecting syslog logs through UDP or TCP protocol.

### Log Config
A Log Config is a configuration that is telling Centralized Logging with OpenSearch where the logs had been stored on Log Source, which types of logs you want to collect, what fields a line of log contains, and types of each field.


[fluent-bit]: https://docs.fluentbit.io/manual/
[open-ssl]: https://www.openssl.org/source/
[supported-platforms]: https://docs.fluentbit.io/manual/installation/supported-platforms
[asg]: https://aws.amazon.com/ec2/autoscaling/
