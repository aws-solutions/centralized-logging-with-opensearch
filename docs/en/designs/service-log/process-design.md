# Service Log Pipeline Process Design

## Overview

This document is about the Process Design for **Service Log Pipeline** component. To learn more information about the component, refer to [Component Design](../component-design)


## Service Log Pipeline Process

At a high level, an end to end log analytics pipeline consists the 4 following stages.

  1. Collect 
  2. Buffer
  3. Process
  4. Visualize

Different services are used in different stages.

![Service Pipeline](../../images/design-diagram/service-pipeline-process.png)


### Collect

Customers can enable the service logs from AWS Management Console or API calls. The log is stored in different destinations.

The main services in this stage are:

- Amazon S3
- CloudWatch Log Group

!!! info "Info"

    Log Hub Solution also supports automatically enable the logs for some services, such as S3 Access Logs. Check [API Design](../domain-management/api-design.md#put-resource-logging-bucket)

### Buffer

The buffering layers involves different services based on various cases.

- Amazon SQS
    
    For service logs that is stored in Amazon S3, SQS is used as the buffering layer to receive S3 Events.

- Kinesis Data Stream (KDS)

    KDS can be used to subscribe the log streams from CloudWatch Logs. Also, CloudFront real-time logs can only be sent to KDS.

- Kinesis Data Firehose (KDF)

    KDF can be used as a bufferring layer and sink the logs to destination such as S3 buckets or directly to OpenSearch. 


### Process

This stage uses **AWS Lambda** as the core service.

The general purpose of a Log Processor is to parse the raw logs, filter and enrich the log info before ingest that to OpenSearch.

The process includes below four steps:

1. **Decompress**: This is only required if the source log file is compressed.
2. **Parse**: This is to parse the raw log records such as using regex.
3. **Filter**: This is to filter on the logs based on certain conditions.
4. **Enrich**: This is to enrich the original log messages with extra information, such as IP to Location.

!!! info "Warning"

    Currently, Filter and Enrich are not yet supported.


The processed logs can then be ingested into AOS. There are several actions to be taken in OpenSearch for Log Ingestion.

- **Create Index Template**

    Index templates let you initialize new indices with predefined mappings and settings. For example, if you continuously index log data, you can define an index template so that all of these indices have the same number of shards and replicas.

    This is very important as once the data is loaded into OpenSearch, the mapping and the number of shards can't be changed.

    Use below OpenSearch REST API to create index template
    ```
    PUT _index_template/<index-template-name>
    ```

    !!! info "Info"

        This is just an **one time** action that is executed during the start of the CloudFormation deployment.

- **Create Index State Management (ISM) Policy**

    ISM lets you automate periodic, administrative operations by triggering them based on changes in the index age, index size, or number of documents. Using the ISM, you can define policies that automatically handle index transition (such as hot to warm, warm to cold) or deletions to fit your use case.

    Below OpenSearch REST API is used to check if index template exists
    ```
    # for OpenSearch
    PUT _opendistro/_ism/policies/{policy_id}

    # for Elasticsearch
    PUT _plugins/_ism/policies/{policy_id}
    ```

    !!! info "Info"

        This is just an one time action that is executed during the start of the CloudFormation deployment.


- **Check if index template exists**

    It's a good practice to have a check whether index template already exists or not before loading data into OpenSearch.  Otherwise, the logs could be loaded as dirty data and it took more time to delete and reprocess the logs.

    Below OpenSearch REST API is used to check if index template exists
    ```
    HEAD _index_template/<index-template-name>
    ```

    !!! info "Info"

        This action is executed everytime before loading data.


- **Bulk Load**

    Once the index template is created, and the data is ready to load, normally the log is loaded in batches via the Bulk load API.

    The default batch size is `10000` records. Too many records in one single batch can result in `513 Payload too large` error.


    Below OpenSearch REST API is used to load data in batches
    ```
    PUT <index-name>/_bulk
    ```


### Visualize

Once the log data is ingested into OpenSearch, customer can then analyze and visulize the logs in OpenSearch Dashboards.

This solution is shipped with simple dashboards for each services.

- Import pre-built dashboards

    Below OpenSearch Dashboards REST API is used to import pre-built dashboards.
    ```
    # for OpenSearch
    POST _dashboards/api/saved_objects/_import?createNewCopies=true

    # for OpenSearch
    POST _plugin/kibana/api/saved_objects/_import?createNewCopies=true
    ```

- Dashboard Design

    The dashboard should contains valuable data insights. 

    Take CloudFront Log as an example, the dashboards contains information such as:

    - PV/UV count
    - Cache Hit/Miss Rate
    - Bandwidth
    - Health Status (2xx, 3xx, 4xx, 5xx)
    - Top Request URIs
    - Top Client IPs

## Pipeline Orchestration Process

Customer can manage Service Log pipeline from Log Hub Web Console.  Below is the high-level process that is used to orchestrate service log pipeline flow.

### Create Service Pipeline

The process to create service log pipeline is described in below diagram:

![create-svc-pipe](../../images/design-diagram/create-svc.png)

The UML diagram is shown in below:

![Create Service Log Pipeline UML](../../images/design-diagram/create-svc-pipe-uml.png)


1. Create Service Pipeline API call is sent to Appsync
2. Appsync invoke Lambda (pipeline handler) as resolver
3. Lambda generate a UUID and create a new item in DynamoDB
4. Lambda trigger Pipeline Step function to flow
5. Pipeline Step Function execute CfnFlow step function as a Child Step
6. CfnFlow use CloudFormation createStack api to start deployment of sub stack template
7. CfnFlow use CloudFormation describe api to query the status of the sub stack
8. CfnFlow check the status and repeat step 7 until the status is completed
9. CfnFlow notify the result to parent Pipeline Step function flow
10. Pipeline Step Function update the status to DynamoDB



**References:**

- [Create Service Pipeline API](./api-design.md#create-service-pipeline)
- [Service Pipeline Table](./data-model-design.md#service-pipeline-table)

### Delete Service Pipeline

The process to delete service log pipeline is described in below diagram:

![delete-svc-pipe](../../images/design-diagram/delete-svc.png)

The UML diagram is shown in below:

![Delete Service Log Pipeline UML](../../images/design-diagram/delete-svc-pipe-uml.png)


1. Delete Service Pipeline API call is sent to Appsync
2. GraphQL invoke Lambda (pipeline handler) as resolver
3. Lambda query item in DynamoDB to get sub stack ID
4. Lambda update item in DynamoDB with status ‘DELETING’
5. Lambda trigger Pipeline Step function to flow
6. Pipeline Step Function execute CfnFlow step function as a Child Step
7. CfnFlow use CloudFormation deleteStack api to start deletion of sub stack template
8. CfnFlow use CloudFormation describe api to query the status of the sub stack
9. CfnFlow check the status and repeat step 8 until the status is completed
10. CfnFlow notify the result to parent Pipeline Step function flow
11. Pipeline Step Function update the status to DynamoDB


**References:**

- [Delete Service Pipeline API](./api-design.md#delete-service-pipeline)
- [Service Pipeline Table](./data-model-design.md#service-pipeline-table)

