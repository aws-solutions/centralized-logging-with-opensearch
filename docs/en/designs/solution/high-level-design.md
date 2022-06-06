# Log Hub Solution High Level Design

## Overview

Log Hub is a solution that enables customer to easliy and quickly build end-to-end log analytics pipelines on top of Amazon OpenSearch Service (AOS). A log pipeline includes a series of log processing steps, including collecting logs from source, processing and sending them to OpenSearch as destination for further analysis.

This solution provides a web management console from which customer can easliy manage log analytics pipelines and gain valuable data insights for both AWS service logs and application logs with out of the box visualization dashboards without worring about the underling technical complexity. 

The purpose of this document is to descibe how Log Hub solution is technical designed from high level perspective.

## Requirements

### Functional Requirements

This solution is designed with below functional requirements:

- A centralized web console for customer to manage all the tasks to reduce operational complexities.
- Supports both AWS service logs and application logs
- Supports automatically creating visualization dashboards
- Supports log lifecycle management
- Supports cross accounts/cross regions log management
- Supports both China and Global regions


### Non-Functional Requirements

The design must meet below non-functional requirements:

- **Security**: Authentication and Authorization is required to protect unexpected access.

- **Scalability**: The design must be able to support different scales of logs.

- **Stability**: The design must support auto-retries for recoverable errors.

- **Cost Effective**: Use serverless architecture design whenever possible, and support log life-cycle management to reduce the overall costs.


### Assumptions

The design is based on below assumptions:

- Customers who use this solution must be with administrator access on AWS to be able to perform related functions, as this solution will provision different resources such as Lambda, DynamoDB, etc in the AWS account.

- Customers must understand their business requirments for log analysis, such as the volume of the logs, the days to retain logs etc.


## High-Level Architecture

Below is the high level architecture diagram:

[![arch]][arch]

This solution deploys the following infrastructure in your AWS Cloud account:

1. [Amazon CloudFront](https://aws.amazon.com/cloudfront) to distribute the frontend web UI assets hosted in [Amazon S3](https://aws.amazon.com/s3/) bucket.

1. [AWS AppSync](https://aws.amazon.com/appsync) to provide the backend GraphQL APIs.

1. [Amazon Cognito user pool](https://aws.amazon.com/cognito) to provide authentication and authorization for frontend and backend.

1. [Amazon DynamoDB](https://aws.amazon.com/dynamodb) as backend database to store the solution related information.

1. [AWS Lambda](https://aws.amazon.com/lambda) to interact with other AWS Services to execute core logic including managing log pipelines or managing log agents and get the information updated in DynamoDB tables.

1. [AWS Step Functions](https://aws.amazon.com/step-functions) to orchestrate on-demand [AWS CloudFormation](https://aws.amazon.com/cloudformation) deployment of a set of predefined stacks for log pipeline management. The log pipeline stacks deploys separate AWS resources and are used to collect and process logs and ingest them into [Amazon OpenSearch Service](https://aws.amazon.com/opensearch-service) for further analysis and visualiztion.

1. [AWS Systems Manager](https://aws.amazon.com/systems-manager) and [Amazon EventBridge](https://aws.amazon.com/eventbridge) to manage log agent for collecting logs from Application Servers, such as installing log agents (fluentbit) to Application servers and monitoring the health status of the agents.



## Component Definition

This solution consists of below main components:

- **Domain Management**

    This solution uses Amazon OpenSearch Service as the underlying engine to store and analyze logs. This **Domain Management** component consists a list of operations on top of existing AOS domains, such as importing an existing AOS domain for log ingestion, providing a proxy for access the AOS dashboards which is within VPC, etc.

    !!! info "Info"

        To learn more about how this component is designed, please refer to [Domain Management Component Design](../domain-management/component-design.md)

    !!! warning "Warning"

        Provision of AOS domain is not in scope of this component. Customer needs to create AOS domain before using this component.

- **Service Log Pipeline**

    This solution supports out of the box log analysis for many AWS service logs, such as Amazon S3 access logs, ELB access logs, etc.  This **Service Log Pipeline** component is designed to reduce the complexisities of building log analytics pipelines for different AWS services with different formats. Customer can collect and process AWS service logs without writing any codes, as well as gain data insights using out of the box visualization dashboards.
    

    !!! info "Info"

        To learn more about how this component is designed, please refer to [Service Log Pipeline Component Design](../service-log/component-design.md)


- **Application Log Pipeline**

    This solution supports out of the box log analysis for application logs, such as Nginx/Apache logs or general application logs via regex parser. This **Application Log Pipeline** component uses [Fluent Bit](https://fluentbit.io/) as the underlying log agent to collect logs from the application servers, and allow customers to easily install log agent and monitor the healthy of the agent via System Manager.


[arch]: ../../images/architecture/arch.png
