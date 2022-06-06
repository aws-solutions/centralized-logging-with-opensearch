# Domain Management Component Design

## Overview

Log Hub solution uses Amazon OpenSearch service (AOS) as the underlying engine to store and analyze logs. This component consists a list of operations on top of AOS domains.

This document is to describe this component is designed.

!!! info "Info"

    For more information about solution overall design, refer to [High Level Design](../solution/high-level-design.md).

## Component Design

### High-Level Architecture

This component contains two sub components.

- **Proxy for AOS**

    As OpenSearch Dashboards is within VPC and has no public accesses. Customer can choose to deploy a proxy stack to access the OpenSearch Dashboards from internet with a custom domain.

    Below is the high level architecture diagram:

    ![Proxy Stack Architecture](../../images/architecture/proxy.svg)

    The process is described as below:

    1. Customer accesses custom domain for the proxy, the domain needs to be resolved via DNS service (for example, using Route 53 on AWS)

    2. The DNS service routes the traffic to internet-facing Application Load Balancer (ALB)

    3. The ALB distributes web traffic to backend Nginx server running on Amazon EC2 within Auto Scaling Group. 

    4. The Nginx server redirects the requests to OpenSearch Dashboards.

    5. (optional) VPC peering is required if the VPC for the proxy is not the same one as the OpenSearch service.


    !!! info "Info"

        This stack can be deployed independently without the UI, check more details about the [CloudFormation Design](#cloudformation-design)



- **Alarm for AOS**

    There are a list of [recommended CloudWatch alarms](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/cloudwatch-alarms.html) to be set up for Amazon OpenSearch Service. For example, to sent an email if the cluster health status is red for longer than one minute. Customer can choose to deploy an Alarm stack with one click to set up alarms in AWS.

    Below is the high level architecture diagram:

    ![Proxy Stack Architecture](../../images/architecture/alarm.svg)

    
    !!! info "Info"

        This stack can be deployed indepentdantly without the UI, check more details about the [CloudFormation Design](#cloudformation-design)

    The process is described as below:

    1. CloudWatch Alarm to monitor Amazon OpenSearch service and send state change event to Amazon EventBridge

    2. Amazon EventBridge rule to trigger and send information to Amazon SNS as target

    3. Amazon SNS uses Email as subscription and notifies Administrators



### Process Design

This components includes a list of processes for domain management.

For details about how the processes are designed, please refer to [**Process Design**](./process-design.md)


### API Design

This solution uses GraphQL APIs built on AWS Appsync service.

For details about how the backend APIs are designed, please refer to [**API Design**](./api-design.md)


### Data Model Design

This component uses Amazon DynamoDB as the backend NoSQL database to store the information about AOS domains.

To learn more information about how the data model is designed, please refer to [**Data Model Design**](./data-model-design.md)



### CloudFormation Design

- **Proxy for AOS CloudFormation Design**

The parameters in the CloudFormation template are listed as below:

| Parameter  | Default          | Description                                                  |
| ---------- | ---------------- | ------------------------------------------------------------ |
| VPCId | `<Requires input>` | The VPC to deploy the Nginx proxy resources, for example, `vpc-bef13dc7`. |
| PublicSubnetIds | `<Requires input>` | The public subnets where ELB are deployed. You need to select at least two public subnets, for example, `subnet-12345abc, subnet-54321cba`. |
| ELBSecurityGroupId | `<Requires input>` | The Security group being associated with the ELB, for example, `sg-123456`. |
| ELBDomain | `<Requires input>` | The custom domain name of the ELB, for example, `dashboard.example.com`. |
| ELBDomainCertificateArn | `<Requires input>` | The SSL certificate ARN associated with the ELBDomain. The certificate must be created from [Amazon Certificate Manager (ACM)][acm]. |
| PrivateSubnetIds | `<Requires input>` | The private subnets where Nginx instances are deployed. You need to select at least two private subnets, for example, `subnet-12345abc, subnet-54321cba`. |
| NginxSecurityGroupId | `<Requires input>` | The Security group associated with the Nginx instances. The security group must allow access from ELB security group. |
| KeyName | `<Requires input>` | The PEM key name of the Nginx instances. |
| EngineType | OpenSearch | The engine type of the OpenSearch. Select OpenSearch or Elasticsearch. |
| Endpoint | `<Requires input>` | The OpenSearch endpoint, for example, `vpc-your_opensearch_domain_name-xcvgw6uu2o6zafsiefxubwuohe.us-east-1.es.amazonaws.com`. |
| CognitoEndpoint | `<Optional>` | The Cognito User Pool endpoint URL of the OpenSearch domain, for example, `mydomain.auth.us-east-1.amazoncognito.com`. Leave empty if your OpenSearch domain is not authenticated through Cognito User Pool. |




- **Alarm for AOS CloudFormation Design**

The parameters in the CloudFormation template are listed as below:


| Parameter  | Default          | Description                                                  |
| ---------- | ---------------- | ------------------------------------------------------------ |
| Endpoint | `<Requires input>` | The endpoint of the OpenSearch domain, for example, `vpc-your_opensearch_domain_name-xcvgw6uu2o6zafsiefxubwuohe.us-east-1.es.amazonaws.com`. |
| DomainName | `<Requires input>` | The name of the OpenSearch domain. |
| Email | `<Requires input>` | The notification email address. Alarms will be sent to this email address via SNS. |
| ClusterStatusRed | `Yes` | Whether to enable alarm when at least one primary shard and its replicas are not allocated to a node. |
| ClusterStatusYellow | `Yes` | Whether to enable alarm when at least one replica shard is not allocated to a node. |
| FreeStorageSpace | `10` | Whether to enable alarm when a node in your cluster is down to the free storage space you typed in GiB. We recommend setting it to 25% of the storage space for each node. `0` means the alarm is disabled.  |
| ClusterIndexWritesBlocked | `Yes` | Whether to enable alarm when your cluster is blocking write requests. |
| UnreachableNodeNumber | `3` | Nodes minimum is < x for 1 day, 1 consecutive time. `0` means the alarm is disabled. |
| AutomatedSnapshotFailure | `Yes` | Whether to enable alarm when automated snapshot failed. AutomatedSnapshotFailure maximum is >= 1 for 1 minute, 1 consecutive time. |
| CPUUtilization | `Yes` | Whether to enable alarm when sustained high usage of CPU occurred. CPUUtilization or WarmCPUUtilization maximum is >= 80% for 15 minutes, 3 consecutive times. |
| JVMMemoryPressure | `Yes` | Whether to enable alarm when JVM RAM usage peak occurred. JVMMemoryPressure or WarmJVMMemoryPressure maximum is >= 80% for 5 minutes, 3 consecutive times. |
| MasterCPUUtilization | `Yes` | Whether to enable alarm when sustained high usage of CPU occurred in master nodes. MasterCPUUtilization maximum is >= 50% for 15 minutes, 3 consecutive times. |
| MasterJVMMemoryPressure | `Yes` | Whether to enable alarm when JVM RAM usage peak occurred in master nodes. MasterJVMMemoryPressure maximum is >= 80% for 15 minutes, 1 consecutive time. |
| KMSKeyError | `Yes` | Whether to enable alarm when KMS encryption key is disabled. KMSKeyError is >= 1 for 1 minute, 1 consecutive time. |
| KMSKeyInaccessible | `Yes` | Whether to enable alarm when KMS encryption key has been deleted or has revoked its grants to OpenSearch Service. KMSKeyInaccessible is >= 1 for 1 minute, 1 consecutive time. |