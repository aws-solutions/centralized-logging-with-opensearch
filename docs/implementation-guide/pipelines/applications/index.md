# Build Application Log Analytics Pipelines

Log Hub also supports collecting application logs from EC2 instances or EKS clusters(comming soon).

For EC2 instances:
Log Hub will automatically install logging agent(Fluent-bit 1.8), collecting application logs on EC2 instances an then send that logs into Amazon OpenSearch. All configuration will be done easily through the Log Hub UI.

## Concepts

### Application Log Analytics Pipeline

To begin collecting application logs, a data pipeline is needed to not only buffering the data in transmit but also cleaning or pre-processing data. Such as, IP to Geo location transform. Currently, Kinesis Data Stream is used as data buffering 

### Log Ingestion

A log ingestion is a configuration for the pipeline that is telling Log Hub collecting what kinds of logs on which EC2 instances group. 

### Logging Agent

A logging agent is a program that reads logs from one location and sends them to another location(like, OpenSearch). Currently, Log Hub only supports Fluent-bit 1.8 logging agent and the installation process is automatically.

!!! Note "Notice"

    Please check [Fluent-bit installation guide](./fluent-bit-install-guide.md) for more information.

### Instances Group

An instance group is a collection of EC2 instances from which you want to collect application logs. Log Hub will help you install the logging agent in each instance within a group.

### Log Config

A log config is a configuration that is telling Log Hub where are the logs been stored on EC2 instances, what kind types of logs you want to collect, what fields does a line of log contains and what types of each field.

Below are the currently supported log types:

#### Log Type
 
1. JSON
2. Apache HTTP Server
3. Nginx
4. Single-line Text
5. Multi-line Text


## Further Reading

- [Collect Apache HTTP server logs](./apache.md)
- [Collect Nginx logs](./nginx.md)
- [Collect Single-line logs](./single-line-text.md)
- [Collect Multiline-line logs](./multi-line-text.md)
- [Collect JSON logs](./json.md)

