# Application Log Analytics Pipelines

Log Hub supports ingesting application logs from EC2 instances, EKS clusters and S3 bucket.

- For EC2 instances, Log Hub will automatically install [logging agent](#logging-agent) ([Fluent Bit 1.9][fluent-bit]), collect application logs on EC2 instances and then send logs into Amazon OpenSearch.
- For EKS clusters, Log Hub will generate all-in-one configuration file for customers to deploy the [logging agent](#logging-agent) ([Fluent Bit 1.9][fluent-bit]) as a DaemonSet or Sidecar. After logging agent is deployed, Log Hub will start collecting pod logs and send to Amazon OpenSearch.
- For S3 buckets, Log hub will collect application logs stored in S3 buckets directly.

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

Before creating log ingestion, you need to:

- [Create a log source](./create-log-source.md) (not applicable for S3 bucket)
- [Create an application log pipeline](./create-applog-pipeline.md)
  
## Concepts

The following introduce concepts that help you to understand how the application log ingestion works.

### Application Log Analytics Pipeline

To collect application logs, a data pipeline is needed. The pipeline not only buffers the data in transmit but also cleans or pre-processes data. For example, transforming IP to Geo location. Currently, Kinesis Data Stream is used as data buffering for EC2 log source.

### Log Ingestion
A log ingestion configures the Log Source, Log Type and the Application Log Analytics Pipeline for the Logging Agent used by Log Hub.
After that, Log Hub will start collecting certain type of logs from the log source and sending them to Amazon OpenSearch.

### Logging Agent
A logging agent is a program that reads logs from one location and sends them to another location (for example, OpenSearch). 
Currently, Log Hub only supports [Fluent Bit 1.9][fluent-bit] logging agent which is installed automatically. The Fluent Bit agent has a dependency of [OpenSSL 1.1][open-ssl]. To learn how to install OpenSSL on Linux instances, refer to [OpenSSL installation](../resources/open-ssl.md). Please find the supported platforms by Fluent Bit in this [link][supported-platforms].

### Log Source
A Log Source refers to an Amazon Service where you want Log Hub to collect application logs from.

Supported log sources are:

* [Instance Group](#instances-group)
* [EKS Cluster](#eks-cluster) 
* [S3 Bucket](#s3-bucket)

#### Instances Group

An instance group is a collection of EC2 instances from which you want to collect application logs. Log Hub will help you install the logging agent in each instance within a group.

#### EKS Cluster

The EKS Cluster in Log Hub refers to the Amazon EKS from which you want to collect pod logs. Log Hub will guide you to deploy the logging agent as a DaemonSet or Sidecar in the EKS Cluster.

#### S3 Bucket

Log Hub supports collecting ongoing logs stored on an Amazon S3 bucket, if your system is currently sending application logs to a S3 bucket.

### Log Config

A Log Config is a configuration that is telling Log Hub where the logs had been stored on Log Source, which types of logs you want to collect, what fields a line of log contains, and types of each field. 


[fluent-bit]: https://docs.fluentbit.io/manual/
[open-ssl]: https://www.openssl.org/source/
[supported-platforms]: https://docs.fluentbit.io/manual/installation/supported-platforms
