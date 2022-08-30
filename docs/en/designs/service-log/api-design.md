# Service Log Pipeline API Design

## Overview

This document is about the API Design for **Service Log Pipeline** component. To learn more information about the component, refer to [Component Design](../component-design)

## Service Pipeline APIs

Service Pipeline APIs are a list of operations to manage end to end Log analytics pipelines for AWS services.

### Create Service Pipeline


**Type:** Mutation

**Description:**  Create a record in DynamoDB, start an execution of Step function,  trigger CloudFormation template to run

**Resolver:** Lambda

**Parameters:**

|Name	|Type	|Required	|Default	|Description	|
|---	|---	|---	|---	|---	|
|type	|String	|Yes	|	|Allowed values: S3AccessLog, CloudTrail, CloudFront	|
|parameters	|K-V	|Yes	|	|Source info (such as S3 bucket, prefix)	|
|tags	|K-V	|No	|	|Tag the pipeline	|


Request:

```
{
  createServicePipeline(
    Type: S3, 
    source: "aws-lambda-12843845950", 
    target: "dev", 
    tags: [{key: "Hello", value: "World"}], 
    parameters: [
    {parameterKey: "engineType", parameterValue: "OpenSearch"},
    {parameterKey: "logBucketName", parameterValue: "loghub-loghubloggingbucket0fa53b76-1cf5iuchzpbz8"},
    {parameterKey: "logBucketPrefix", parameterValue: "AWSLogs/347283850106/s3/aws-lambda-12843845950"},
    {parameterKey: "endpoint", parameterValue: "vpc-dev-ardonphnbg327lwqncuj2vps3q.eu-west-1.es.amazonaws.com"}
    {parameterKey: "domainName", parameterValue: "dev"},
    {parameterKey: "indexPrefix", parameterValue: "aws-lambda-12843845950"},
    {parameterKey: "createDashboard", parameterValue: "Yes"},
    {parameterKey: "vpcId", parameterValue: "vpc-0e172e182aa53806b"},
    {parameterKey: "subnetIds", parameterValue: "subnet-09f0654b6db09eb23,subnet-0b873d0b6e73c2f9c"},
    {parameterKey: "securityGroupId", parameterValue: "sg-0a55e5364049a5b1d"},
    {parameterKey: "backupBucketName", parameterValue: "loghub-loghubloggingbucket0fa53b76-1cf5iuchzpbz8"},
    {parameterKey: "daysToWarm", parameterValue: "0"},
    {parameterKey: "daysToCold", parameterValue: "0"},
    {parameterKey: "daysToRetain", parameterValue: "0"}
    ])
}
```


Response:

```
{
  "data": {
    "createServicePipeline": "24483703-41b6-43ba-aae3-19318bdb1b4e"
  }
}
```



### Delete Service Pipeline


**Type:** Mutation

**Description:**  mask the record in DynamoDB as Inactive, start an execution of Step function,  trigger CloudFormation template to delete

**Resolver:** Lambda

**Parameters:**

|Name	|Type	|Required	|Default	|Description	|
|---	|---	|---	|---	|---	|
|id	|String	|Yes	|	|Pipeline Unique ID in DynamodB	|

**Simple Request & Response:**

Request:

```
mutation example {
  deleteServicePipeline(id: "24483703-41b6-43ba-aae3-19318bdb1b4e")
}
```


Response:

```
{
  "data": {
    "deleteServicePipeline": "OK"
  }
}
```



### List Service Pipelines

**Type:** Query

**Description:**  List all pipelines

**Resolver:** DynamoDB


**Parameters:**

|Name	|Type	|Required	|Default	|Description	|
|---	|---	|---	|---	|---	|
|page	|Int	|No	|1	|page number, start from 1	|
|count	|String	|No	|20	|number of records per page	|

**Simple Request & Response:**

Request

```
query example {
  listServicePipelines(page: 1, count: 20) {
    pipelines {
      createdDt
      id
      source
      status
      target
      type
    }
    total
  }
}
```



Response:


```
{
  "data": {
    "listServicePipelines": {
      "pipelines": [
        {
          "createdDt": "2021-09-16T04:12:06.288536",
          "id": "f2272d96-5cb5-4eed-9d1e-bbe545cfa181",
          "source": "abc-bucket",
          "status": "ACTIVE",
          "target": "dev",
          "type": "S3"
        },
        {
          "createdDt": "2021-09-16T04:12:04.216817",
          "id": "f2b845fa-be44-4b94-9912-e692d2bc270d",
          "source": "bcd-bucket",
          "status": "ERROR",
          "target": "dev",
          "type": "S3"
        },
        ...
      ],
      "total": 166
    }
  }
}
```




### Get Service Pipeline

**Type:** Query

**Description:**  Get service pipeline detail by ID

**Resolver:** DynamoDB


**Parameters:**

|Name	|Type	|Required	|Default	|Description	|
|---	|---	|---	|---	|---	|
|id	|String	|Yes	|	|Unique pipeline ID	|

**Simple Request & Response:**

Request

```
query example {
  getServicePipeline(id: "d3b88a26-38ab-430a-9b20-1dd009586e22") {
    createdDt
    id
    parameters {
      parameterKey
      parameterValue
    }
    status
    tags {
      key
      value
    }
    type
    source
    target
    error
  }
}
```



Response:


```
{
  "data": {
    "getServicePipeline": {
      "createdDt": "21-12-09T07:54:17Z",
      "id": "d3b88a26-38ab-430a-9b20-1dd009586e22",
      "parameters": [
        {
          "parameterKey": "engineType",
          "parameterValue": "OpenSearch"
        },
        {
          "parameterKey": "logBucketName",
          "parameterValue": "loghub-loghubloggingbucket0fa53b76-1cf5iuchzpbz8"
        },
        {
          "parameterKey": "logBucketPrefix",
          "parameterValue": "AWSLogs/347283850106/s3/aws-lambda-12843845950"
        },
        {
          "parameterKey": "endpoint",
          "parameterValue": "vpc-dev-ardonphnbg327lwqncuj2vps3q.eu-west-1.es.amazonaws.com"
        },
        {
          "parameterKey": "domainName",
          "parameterValue": "dev"
        },
        {
          "parameterKey": "indexPrefix",
          "parameterValue": "aws-lambda-12843845950"
        },
        {
          "parameterKey": "createDashboard",
          "parameterValue": "Yes"
        },
        {
          "parameterKey": "vpcId",
          "parameterValue": "vpc-0e172e182aa53806b"
        },
        {
          "parameterKey": "subnetIds",
          "parameterValue": "subnet-09f0654b6db09eb23,subnet-0b873d0b6e73c2f9c"
        },
        {
          "parameterKey": "securityGroupId",
          "parameterValue": "sg-0a55e5364049a5b1d"
        },
        {
          "parameterKey": "backupLogBucketName",
          "parameterValue": "loghub-loghubloggingbucket0fa53b76-1cf5iuchzpbz8"
        },
        {
          "parameterKey": "daysToWarm",
          "parameterValue": "0"
        },
        {
          "parameterKey": "daysToCold",
          "parameterValue": "0"
        },
        {
          "parameterKey": "daysToRetain",
          "parameterValue": "0"
        }
      ],
      "status": "ERROR",
      "tags": [
        {
          "key": "Hello",
          "value": "World"
        }
      ],
      "type": "S3",
      "source": "aws-lambda-12843845950",
      "target": "dev",
      "error": "An error occurred (ValidationError) when calling the CreateStack operation: Parameters: [failedLogBucket] must have values"
    }
  }
}
```

