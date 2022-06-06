# Service Log Pipeline Data Model Design


## Overview

This component uses Amazon DynamoDB as the backend NoSQL database. This document is about the Data Model Design for **Service Log Pipeline** component. To learn more information about the component, refer to [Component Design](../component-design)



## Service Pipeline Table


Service pipeline table stores information about the service log pipelines managed by this solution.

The data attributes are listed as below:

| Attribute name |	Type | Example | Description | Comments |
| -- | -- | -- | -- | -- |
| id | String | 06e3e64d-0958-43b1-b426-fe52ac55738f | Unique ID of a Pipeline | Partition key |
| stackName | String | LogHub-Pipe-06e3e | Service Pipeline CloudFormation Stack Name |  |
| stackId | String | arn:aws:cloudformation:us-east-1:123456789012:stack/LogHub-Pipe-06e3e/a3d66790-6300-11ec-9ef5-0a829481a42d | Service Pipeline CloudFormation Stack ID |  |
| source | String | test-bucket | Source of the Log |  |
| target | String | dev | OpenSearch domain |  |
| status | String | ACTIVE | Status of the pipeline |  |
| error | String |  | Error message of the pipeline |  |
| type | String | S3 | AWS service type |  |
| parameters | List | [{...}] | Parameter key-value pairs to deploy the pipeline |  |
| createdDt | String | 2021-12-22T08:24:53Z | Creation date of the pipeline |  |
| tags | List |  [{...}]  | Custom tags |  |
