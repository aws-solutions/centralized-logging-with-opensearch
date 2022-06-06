# Domain Management Process Design


## Overview

This document is about the Process Design for **Domain Management** component. To learn more information about the component, refer to [Component Design](../component-design)


## Domain Management Process

### Import Domain

This operation is to import an existing AOS domain into Log Hub solution to ingest logs to.

The process to import domain is described in below diagram:

![](../../images/design-diagram/import-domain.png)

**Design consideration:**

1. Store AOS information in DynamoDB.

    When a domain is imported, basic domain information is stored in Cluster table in DynamoDB. 

    Consider only information that can not/might not be changed, such as endpoint, vpc etc. Other information such as EBS volume, Node information can be resized hence is derived via OpenSearch SDK on demand.

    Solution specified information such as processing layer vpc, tags is also stored in Cluster table.

    The domain metrics such as free storage are also not stored in Cluster table, as they are changing all the time.

1. Domain ID design

    Considering that we will support cross account and cross region log ingestion in future, the unique domain ID (partition key in DynamoDB table) must support this.

    In this solution, we use MD5 of the domain ARN as the domain ID (Assumption is that it's unlikely that two different domain ARNs can have the same MD5 string)


1. Exception handling

    When a domain is deleting or creating, or a domain is with public network, the import must fail with expection.

    When importing a domain that is already imported, the import should fail. To avoid such case happening, from frontend, when customer choose from a drop down list of OpenSearch domains, imported domains are excluded from the list.

    When a domain is already imported and then deleted. the list should not fail.


**References:**

- [Import Domain API](./api-design.md#import-domain)
- [Cluster Table](./data-model-design.md#cluster-table)


### Remove Domain

This operation is to remove an imported AOS domain from Log Hub rather than deleting the AOS domain.

The process to remove domain is described in below diagram:

![remove-domain](../../images/design-diagram/delete-domain.png)

**Design consideration:**

1. Delete process

    Deleting an imported domain only removes the item from Cluster table in DynamoDB. The backend OpenSearch domain will not be affected.

    Also deleting domain will not impact any existing log ingestion pipelines.

    There is no need to implement soft delete for this process. Customer can easily re-import the domain as needed.


**References:**

- [Remove Domain API](./api-design.md#remove-domain)
- [Cluster Table](./data-model-design.md#cluster-table)

### List Imported Domains

This operation is to support listing of all the imported domain along with key metrics (Cluster Health, Free Storage Space, Searchable documents).

The process to import domain is described in below diagram:

![list-domain](../../images/design-diagram/list-domain.png)

**Design consideration:**

1. Where to get AOS metrics

    There are two ways of getting AOS domain metrics such as free storage space, domain health etc. One is to use AOS REST API such as `GET _cluster/health`, the other is to query in CloudWatch metrics.

    In this design, CloudWatch metrics are chosen to get domain metrics for two reasons:

    a) The API backend Lambda doesn't need to have VPC access.

    b) The CloudWatch metric data is same as what is shown in the AWS Management console.

1. Not all calls need metrics

    Getting metrics from CloudWatch takes time and bring extra costs. But not all the listing scenerios requires metrics, For example, when customer is choosing an imported domain as a destionation from a list.

    So an option to choose whether to include metrics is provided. 

**References:**

- [List Imported Domains API](./api-design.md#list-imported-domains)
- [Cluster Table](./data-model-design.md#cluster-table)

### Get Domain Details

This operation is to provide more details about an imported AOS domain, including nodes, volumes, networks etc.

The process to Get domain details is described in below diagram:

![get-domain-details](../../images/design-diagram/get-domain.png)

**Design consideration:**

Same as List Imported Domain

**References:**

- [Get Domain Details API](./api-design.md#get-domain-details)
- [Cluster Table](./data-model-design.md#cluster-table)


### Proxy for AOS

This operation is to provide a proxy to access OpenSearch dashboards which is within VPC.

The process to Create/Delete Proxy for AOS Domain is described in below diagram:

![proxy-process](../../images/design-diagram/proxy-process.png)

**Design consideration:**

1. Step Functions Design

    Use an independent CloudFormation stack to provision resources (such as EC2, ELB etc.) for proxy stacks. Create a reusable Child step function flow for orchestrating the deployment/delete of the sub-stack. When create/delete proxy is triggerred, a parent flow will trigger the child flow to run, and once child flow is completed, the parent flow will be informed will the result and update the status in Cluster table.

1. Store Proxy information in DynamoDB.

    Store the related parameter key-values of proxy stack in cluster table in DynamoDB. When the proxy is created, the stack id is stored in the table as the stack id is required in order to delete the proxy stack.
    

**References:**

- [Create Proxy for AOS API](./api-design.md#create-proxy-for-opensearch)
- [Delete Proxy for AOS API](./api-design.md#delete-proxy-for-opensearch)
- [Cluster Table](./data-model-design.md#cluster-table)


### Alarm for AOS

This operation is to quicly create recommended CloudAlarms to monitor AOS. An email notification will be triggered for alarm.

The process to Create/Delete Alarm for AOS Domain is described in below diagram:

![alarm-process](../../images/design-diagram/alarm-process.png)

**Design consideration:**

1. Step Functions Design

    Use an independent CloudFormation stack to provision resources (such as CloudWatch alarms, SNS topic etc.) for alarm stacks. Create a reusable Child step function flow for orchestrating the deployment/delete of the sub-stack. When create/delete alarm is triggerred, a parent flow will trigger the child flow to run, and once child flow is completed, the parent flow will be informed will the result and update the status in Cluster table.

1. Store Proxy information in DynamoDB.

    Store the related parameter key-values of proxy stack in cluster table in DynamoDB. When the alarm is created, the stack id is stored in the table as the stack id is required in order to delete the alarm stack.
    

**References:**

- [Create Alarm for AOS API](./api-design.md#create-alarm-for-opensearch)
- [Delete Alarm for AOS API](./api-design.md#delete-alarm-for-opensearch)
- [Cluster Table](./data-model-design.md#cluster-table)

