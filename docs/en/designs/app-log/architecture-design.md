# Application Log Analytics Design

## Overview

Application Log Analytics, as one module of Log Hub solution, is used to collect logs for Application, process and ingest into Amazon OpenSearch Service (AOS). This document is to describe this module is designed.

Currently, this solution supports JSON format, Nginx Format, Apache Format, Spring Boot Logs, Single-line text, Multi-line text.

!!! info "Info"

    For more information about solution overall design, refer to [Architecture Design](../solution/high-level-design.md).

### High Level Design

![Application log Pipeline ](../../images/architecture/app-log-architecture.png)

**Model Layer** -The proxy of the back-end service encapsulates the model required by the view layer and defines the output content by the caller.

**Resources** - Here we specifically refer to the Amazon Web Services created and invoked through APIs in the solution, such as EC2 instances that need to transmit log data, Systems Manager used by Fluent Bit installed, Amazon Kinesis Data Streams, Amazon Lambda, Amazon OpenSearch Service used for log storage and data analysis and presentation.

**Log Config Service** - To used to describe log configuration information, including log location, log type, search engine field type, etc.

**Instance Group Service** - An instance Group is a collection of instances. Currently, only instances in the same region as Log Hub are supported. This service is responsible for the logical classification of instances, the installation of Fluent Bit on the instance, and the status detection of Fluent Bit. For the installation of Fluent Bit, the system is processed through multi-threading.

**Application Log Pipeline Service** - Responsible for asynchronous creation of data buffers, data buffer automatic scaling service, and log processor instance.

**Application Log Ingestion Service** - Responsible for generating configuration files, distributing configuration through SSM, and scheduling Fluent Bit for data transmission, and creating OpenSearch templates according to the log field data types defined by Log config to ensure that the data written to OpenSearch conforms to the preset data types.

**Kinesis Data Streams Auto Scaling Service** Amazon Kinesis Data Streams is automatically scaled by using Amazon CloudWatch and AWS Lambda if the user turns on autoscaling for the data buffer.
