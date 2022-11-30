# Application Log Analytics Pipelines

Log Hub supports ingesting application logs from EC2 instances, EKS clusters, and Syslog.

- For EC2 instances, Log Hub will automatically install [log agent](#log-agent) ([Fluent Bit 1.9][fluent-bit]), collect application logs on EC2 instances and then send logs into Amazon OpenSearch.
- For EKS clusters, Log Hub will generate all-in-one configuration file for customers to deploy the [log agent](#log-agent) ([Fluent Bit 1.9][fluent-bit]) as a DaemonSet or Sidecar. After log agent is deployed, Log Hub will start collecting pod logs and send to Amazon OpenSearch.
- For Syslog, Log Hub will collect syslog logs through UDP or TCP protocol.

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

- [Create a log source](./create-log-source.md) (not applicable for S3 bucket and Syslog)
- [Create an application log pipeline](./create-applog-pipeline.md)
  
## Concepts

The following introduce concepts that help you to understand how the application log ingestion works.

### Application Log Analytics Pipeline
To collect application logs, a data pipeline is needed. The pipeline not only buffers the data in transmit but also cleans or pre-processes data. For example, transforming IP to Geo location. Currently, Kinesis Data Stream is used as data buffering for EC2 log source.

### Log Ingestion
A log ingestion configures the Log Source, Log Type and the Application Log Analytics Pipeline for the log agent used by Log Hub.
After that, Log Hub will start collecting certain type of logs from the log source and sending them to Amazon OpenSearch.

### Log Agent
A log agent is a program that reads logs from one location and sends them to another location (for example, OpenSearch). 
Currently, Log Hub only supports [Fluent Bit 1.9][fluent-bit] log agent which is installed automatically. The Fluent Bit agent has a dependency of [OpenSSL 1.1][open-ssl]. To learn how to install OpenSSL on Linux instances, refer to [OpenSSL installation](../resources/open-ssl.md). Please find the supported platforms by Fluent Bit in this [link][supported-platforms].

### Log Buffer
Log Buffer is a buffer layer between the Log Agent and OpenSearch clusters. The agent uploads logs into the buffer
layer, and then be processed and delivered into the OpenSearch clusters. A buffer layer is a way to protect OpenSearch
clusters from overwhelming. This solution provides the following types of buffer layers.

- **Amazon S3**. The log agent periodically uploads logs to an Amazon S3 bucket. The frequency of data delivery to 
Amazon S3 is determined by *Buffer size* (default value is 50 MiB) and *Buffer interval* (default value is 60 seconds) value 
that you configured when creating the application log analytics pipelines. The condition satisfied first triggers data delivery to Amazon S3. 
Use this option if you can bear minutes-level latency for log ingestion.

- **Amazon Kinesis Data Streams**. The log agent uploads logs to Amazon Kinesis Data Stream in seconds. The frequency 
of data delivery to Kinesis Data Streams is determined by *Buffer size* (10 MiB) and *Buffer interval* (5 seconds). The 
condition satisfied first triggers data delivery to Kinesis Data Streams. Use this option if you need real-time log ingestion.


Log Buffer is optional when creating an application log analytics pipeline. For all types of application logs, this 
solution also provides a way to ingest logs without any buffer layers. However, we only recommend this option when you have
small log volume, and you are confident that will not encounter thresholds at the OpenSearch side.

### Log Source
A Log Source refers to a location where you want Log Hub to collect application logs from. Supported log sources includes:

* [Instance Group](#instances-group)
* [EKS Cluster](#eks-cluster)
* [Syslog](#syslog)

#### Instance Group
An instance group is a collection of EC2 instances from which you want to collect application logs. 
Log Hub can help you install the log agent in each instance within a group. You can select arbitrary instances through the
user interface, or choose an [EC2 Auto Scaling Group][asg].
#### EKS Cluster
The EKS Cluster in Log Hub refers to the Amazon EKS from which you want to collect pod logs. Log Hub 
will guide you to deploy the log agent as a DaemonSet or Sidecar in the EKS Cluster.
#### Syslog
Log Hub supports collecting syslog logs through UDP or TCP protocol.

### Log Config
A Log Config is a configuration that is telling Log Hub where the logs had been stored on Log Source, which types of logs you want to collect, what fields a line of log contains, and types of each field. 


[fluent-bit]: https://docs.fluentbit.io/manual/
[open-ssl]: https://www.openssl.org/source/
[supported-platforms]: https://docs.fluentbit.io/manual/installation/supported-platforms
[asg]: https://aws.amazon.com/ec2/autoscaling/
