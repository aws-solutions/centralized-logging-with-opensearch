# Introduction

Pretend you are working as an operation engineer in a e-commercial company X, your manager asks you to build a centralized logging system, and at the same time, enable the Business Intelligence team to perform some basic data analyze functionalities through this system, like showing the top 10 popular products, etc.

It sounds annoying, right? Because building a centralized logging system is always a time-consuming and complicated job for operation teams. Not to mention the effort to maintain high availability and low operational cost.

**Now, Log Hub can help!**

It's an AWS Solution that makes log analytics easy on AWS.

This workshop will help you quickly understand and get hands on Log Hub solution. It will help you go through the whole process and take a glance at how much the dev-ops effort can be saved by using this solution.

What you need to do during this workshop:

* Deploy the Log Hub solution and a dummy website in your AWS account (using CloudFormation) to simulate the environment of an e-commercial website.

* Ingest both AWS Service logs and application logs (EKS pod logs as optional) to take a peek at possible ways of utilization.

* Use OpenSearch Dashboards to monitor logs and extract business values from those out-of-box dashboards.

For detailed architecture design of Log Hub, please refer to this diagram:

[![arch]][arch]

[arch]: ../images/architecture/arch.svg