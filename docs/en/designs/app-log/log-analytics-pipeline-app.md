# Application Log

A Log Pipeline includes the process of receiving, cleaning, enhancing, and writing data to AOS. Typically, a log pipeline only accepts logs in one format.
A log analytics pipeline corresponds to an index pattern in AOS (e.g. `log-hub-nginx-log-index`)。

## System Architecture design

![](../../images/log%20analytics%20pipeline%20-%20application.png)

## Concept

### Log Config

Log Config contains

- Config Name: The name of the log configuration, the name must be unique, and can only contains lower case letters and -.

- Log Path: Specify the log file locations. If you have multiple locations, please write all the locations and split using ' , '. e.g./var/log/app1/_.log,/var/log/app2/_.log. All files in the specified folder that match the file name will be monitored. The file name can be a full name or wildcard pattern matching is supported.

- Log Type: the Log Hub has built-in plugins to parse log data from log agents. Currently supported log types are as follows:

  - JSON, Nginx Log, Apache Log, Spring Boot Log

  - Additionally, we also point to custom parsing via regular expressions

- Log Format: the log format configuration in Nginx, Spring Boot, Apache configuration files. Such as Nginx, if you want to know more, you can refer to [configuring logging in Nginx](https://docs.nginx.com/nginx/admin-guide/monitoring/logging/)

### Log Group

A Log Group is a collection of one or more Log Configs applied to a group of EC2 instances. The following figure can better understand the concepts of Log Group and Log Config.
![](../../images/log%20analytics%20pipeline%20-%20application%20-%20log%20group%20concept.png)

According to the configuration shown in the figure above, the configuration files of FluentBit in Instance A, B, and C are all different.

- Instance A: Collect Nginx type log a and JSON format log b.
- Instance B: Collect all four types of logs.
- Instance C: Collect Apache type logs c and JSON format logs d.

## FAQ

Q. Why not use Firehose to collect and write to AOS?

Because the minimum buffer interval of Firehose is 60s, it is difficult to meet the scene of real-time class analysis. Please refer to [Amazon Kinesis Data Firehose Quota](https://docs.aws.amazon.com/firehose/latest/dev/limits.html).
