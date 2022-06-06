# Domain Management Data Model Design

## Overview

This component uses Amazon DynamoDB as the backend NoSQL database. This document is about the Data Model Design for **Domain Management** component. To learn more information about the component, refer to [Component Design](../component-design)


## Cluster Table

Cluster table is used to store basic information on imported AOS domain.

The data attributes are listed as below:

| Attribute name |	Type | Example | Description | Comments |
| -- | -- | -- | -- | -- |
| id | String | 439239da8014f9a419c92b1b0c72a5fc | MD5 of OpenSearch domain ARN | Partition key |
| version | String | 1.0 | OpenSearch Version |  |
| engine | String | OpenSearch | Either OpenSearch or Elasticsearch |  |
| region | String | us-east-1 | AWS region |  |
| endpoint | String | vpc-dev-i5jwvhie5lzhsfvnxapny.us-east-1.es.amazonaws.com | OpenSearch Endpoint |  |
| domainArn | String | arn:aws:es:us-east-1:123456789012:domain/dev | OpenSearch domain ARN |  |
| domainName | String | dev | OpenSearch domain name |  |
| importedDt | String | 2021-12-20T05:37:20.523951 | Date of import |  |
| proxyStatus | String | ENABLED | OpenSearch Proxy stack status |  |
| proxyALB | String | LogHu-LoadB-1T8YLOO675OCN-1782845820.us-east-1.elb.amazonaws.com | ELB url for OpenSearch Proxy stack |  |
| proxyStackId | String | arn:aws:cloudformation:us-east-1:123456789012:stack/LogHub-Proxy-14682/1b492000-615e-11ec-b5e4-1213fdb3e837 | OpenSearch Proxy stack ID |  |
| proxyInput | Map | {...} | Parameters used when deploy a proxy stack for OpenSearch |  |
| proxyError | String |  | Error messages when deploy a proxy stack for OpenSearch |  |
| alarmStatus | String | DISABLED | OpenSearch Alarm stack status |  |
| vpc | Map | {...} | Processing layer VPC when importing domain |  |
| tags | List | [{...}] | Custom Tags |  |
