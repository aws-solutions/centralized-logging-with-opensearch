# Help Panel
Help panel is a place to offer more information to customers. The Sketch file will not provide help panel information. We consolidate all help panel information in this PRD. The following is an example of Help Panel and its description.

## Example
![](../../images/PRD/doc-help-panel.png)

| Section    | Content                                                      | Notes |
| ---------- | ------------------------------------------------------------ | ----- |
| Title      | Help panel title                                             |       |
| Body       | This is a paragraph with some bold text and also some italic text.<br /><br />**h4 section header**<br />Code can be formatted as lines of code or blocks of code.<br />```<this is a block of code>```<br /><br />**h4 section header**<br />Code can be formated as lines of code or blocks of code.<br />```<This is a block of code>```<br /> |       |
| Learn more | [First link to the documentation](https://aws.amazon.com)<br />[Second link to the documentation](https://aws.amazon.com) |       |

## Domain detail

### Access Proxy
| Section    | Content                                                      | Notes |
| ---------- | ------------------------------------------------------------ | ----- |
| Title      | Access Proxy                                                 |       |
| Body       | Access Proxy creates a Nginx based proxy (behind [Application Load Balancer](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html)) which allows you to access the OpenSearch Dashboards through Internet.<br /><br />**Prerequisites**<br />1. Domain name<br />2. The domain associated **SSL certificate** in [Amazon Certificate Manager (ACM)](https://aws.amazon.com/certificate-manager/)<br />3. A EC2 public key |       |
| Learn more | [Create a Access Proxy](https://log-hub.docs.solutions.gcr.aws.dev/implementation-guide/domains/proxy/) |       |

### Alarms

| Section    | Content                                                      | Notes |
| ---------- | ------------------------------------------------------------ | ----- |
| Title      | Alarms                                                       |       |
| Body       | Amazon OpenSearch provides a set of [recommended CloudWatch alarms](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/cloudwatch-alarms.html), Log Hub can help customers to create the alarms automatically, and sent notification to your email (or SMS) via SNS.<br /> |       |
| Learn more | [Create OpenSearch Alarms](https://log-hub.docs.solutions.gcr.aws.dev/implementation-guide/domains/alarms/)<br /> |       |

### Log Processing

| Section    | Content                                                      | Notes |
| ---------- | ------------------------------------------------------------ | ----- |
| Title      | Log Processing                                               |       |
| Body       | Log Hub will provision Lambda (or other compute resource) to process logs using these networking configurations. You can specify the log processing networking layer when import OpenSearch domains.<br /> <br />**Note**<br />The log processing layer has access to the OpenSearch domain. |       |
| Learn more | [Import OpenSearch domain](https://log-hub.docs.solutions.gcr.aws.dev/implementation-guide/domains/import/#import-opensearch-domain) |       |

## Import Domain

### Networking creation - Creation method

| Section    | Content                                                      | Notes |
| ---------- | ------------------------------------------------------------ | ----- |
| Title      | Creation method                                              |       |
| Body       | When import OpenSearch domains, you need to specify the networking configuration associated with the Log Processing Layer. Log Hub will automatically place Lambda (or other compute resource) in this layer. The Log Processing Layer must have access to the OpenSearch domain.<br /> <br />**Automatic**<br />Log Hub will detect if there is a need to create a VPC [Peering Connection](https://docs.aws.amazon.com/vpc/latest/peering/create-vpc-peering-connection.html). If needed, Log Hub will automatically create a VPC Peering Connection, update route table, and update the security group of OpenSearch domain.<br /><br />**Manual**<br />Manually specify the Log Processing Layer networking information. You may need to create VPC Peering Connection, update route table and security group of OpenSearch domain. |       |
| Learn more | [Import OpenSearch domain](https://log-hub.docs.solutions.gcr.aws.dev/implementation-guide/domains/import/#import-opensearch-domain) |       |

### Log processing network

| Section    | Content                                                      | Notes |
| ---------- | ------------------------------------------------------------ | ----- |
| Title      | Log processing network                                       |       |
| Body       | When import OpenSearch domains, you need to specify the networking configuration associated with the Log Processing Layer. Log Hub will automatically place Lambda (or other compute resource) in this layer. The Log Processing Layer must have access to the OpenSearch domain.<br /> <br />**S3 Service access**<br />By default, Log Hub will output error logs to Amazon S3. Please guarantee the log processing layer has network access to S3. You can do it by place the log processing layer in public subnets, use [AWS PrivateLink for Amazon S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/privatelink-interface-endpoints.html#types-of-vpc-endpoints-for-s3) or via [NAT Gateways](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html).<br /><br />**CloudWatch Logs access**<br />Many AWS services output service logs to [CloudWatch Logs](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/WhatIsCloudWatchLogs.html). If you use Log Hub to ingest service logs. Please guarantee the log processing layer has network access to CloudWatch Logs.<br /> **Kinesis Data Streams access**<br />Application logs are sent to Kinesis Data Streams in Log Hub. Please guarantee the log processing layer has networking access to Kinesis Data Streams.<br /> |       |
| Learn more |                                                              |       |

## Service Log ingestion

### Creation method

| Section    | Content                                                      | Notes |
| ---------- | ------------------------------------------------------------ | ----- |
| Title      | Log enabling                                                 |       |
| Body       | Log Hub can automatically detect the log location, or you can specify the log location manually. <br /><br />**Automatic**<br />Log Hub will automatically detect the log location of the selected AWS service. If needed, it will enable the service log and save to a centralized log bucket.<br /><br />**Manual**<br />Manually input the AWS service source and its log location . Log Hub will read logs from the location you specified.<br /> |       |
| Learn more |                                                              |       |

### Sample dashboard

| Section    | Content                                                      | Notes |
| ---------- | ------------------------------------------------------------ | ----- |
| Title      | Sample dashboard                                             |       |
| Body       | Log Hub will insert a preconfigured dashboard into the OpenSearch domain if **Yes** being selected. The dashboard name will be consist with your index name.<br /> |       |
| Learn more |                                                              |       |

### Log lifecycle

| Section    | Content                                                      | Notes |
| ---------- | ------------------------------------------------------------ | ----- |
| Title      | Log lifecycle                                                |       |
| Body       | Log Hub will insert an [Index State Management (ISM)](https://opensearch.org/docs/latest/im-plugin/ism/index/) into the OpenSearch domain. The life cycle will periodically move your indices in OpenSearch to save cost. |       |
| Learn more | [Index State Management](https://opensearch.org/docs/latest/im-plugin/ism/index/) |       |

## Log Config

### Log Path

| Section    | Content                                                      | Notes |
| ---------- | ------------------------------------------------------------ | ----- |
| Title      | Log Path                                                     |       |
| Body       | Specify the log file locations. If you have mutliple locations, please write all the locations and split using ','.  e.g. `/var/log/app1/*.log,/var/log/app2/*.log`. |       |
| Learn more |                                                              |       |

### Nginx Log Format

| Section    | Content                                                      | Notes |
| ---------- | ------------------------------------------------------------ | ----- |
| Title      | Nginx Log Format                                             |       |
| Body       | Nginx capture detailed information about errors and request in log files. You can find the log format configuration in Nginx configuration file, such as the `/etc/nginx/nginx.conf` file.  The log format directive starts with `log_format`. |       |
| Learn more | [Configuring Logging in Nginx](https://docs.nginx.com/nginx/admin-guide/monitoring/logging/) |       |

### Apache Log Format

| Section    | Content                                                      | Notes |
| ---------- | ------------------------------------------------------------ | ----- |
| Title      | Apache HTTP Server Log Format                                |       |
| Body       | Apache HTTP Server capture detailed information about errors and request in log files. You can find the log format configuration in Apache HTTP Server configuration file, such as the `/etc/httpd/conf/httpd.conf` file.  The log format directive starts with `LogFormat`. |       |
| Learn more | [Apache HTTP Server Log Files](https://httpd.apache.org/docs/2.4/logs.html) |       |

### Regular Expression

| Section    | Content                                                      | Notes |
| ---------- | ------------------------------------------------------------ | ----- |
| Title      | RegEx Log Format                                             |       |
| Body       | Log Hub uses custom Ruby Regular Expression to parse logs.  It supports both single-line log format and mutliple input format. Write the regular expression in [Rubular](https://rubular.com/) to validate first and input the value here. |       |
| Learn more | [Regular Expression](https://en.wikipedia.org/wiki/Regular_expression)<br />[Rubular: A Rudy-based reular expression editor](https://rubular.com/)<br />[Regular Expression in Fluent Bit](https://docs.fluentbit.io/manual/pipeline/parsers/regular-expression) |       |

## Application Pipeline

### Creation Method

| Section    | Content                                                      | Notes |
| ---------- | ------------------------------------------------------------ | ----- |
| Title      | Instance Group Creation                                      |       |
| Body       | Create a new instance group, or choose an existing Instance Group created before. |       |
| Learn more | [Instance Group](https://log-hub.docs.solutions.gcr.aws.dev/implementation-guide/pipelines/applications/instance-group) |       |
