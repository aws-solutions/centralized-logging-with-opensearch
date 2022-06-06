# Domain Management API Design

## Overview

This document is about the API Design for **Domain Management** component. To learn more information about the component, refer to [Component Design](../component-design)

## Domain APIs

Domain APIs are a list of operations on top of Amazon OpenSearch Service (AOS). 

The following operations are available in the solution's Domain APIs.


### List Domain Names

**Type:** Query

**Description:**  List all existing Amazon OpenSearch domains in a region

**Resolver:** Lambda

**Parameters:**

|Name	|Type	|Required	|Default	|Description	|
|---	|---	|---	|---	|---	|
|region	|String	|No	|current region	|To support cross region listing (in the same account)	|


**Simple Request & Response:**

Request with region 

```
query example{
  listDomainNames(region: "us-west-2") {
    domainNames
  }
}
```


Request without region

```
query example {
  listDomainNames {
    domainNames
  }
}
```


Response:


```
{
  "data": {
    "listDomainNames": {
      "domainNames": [
        "dev",
        "test"
      ]
    }
  }
}
```



### Import Domain


**Type:** Mutation

**Description:**  Import an Exisiting Amazon OpenSearch Domain,  store general info from DynamoDB table.

**Resolver:** Lambda

**Parameters:**

|Name	|Type	|Required	|Default	|Description	|
|---	|---	|---	|---	|---	|
|domainName	|String	|Yes	|	|Amazon OpenSearch Domain Name	|
|region	|String	|No	|current region	|To support cross region Amazon OpenSearch import	|
|vpc	|K-V	|Yes	|	|Log processing vpc	|
|tags	|K-V	|No	|	|Custom tags for the imported domain	|

**Simple Request & Response:**

Request:

```
mutation example{
  importDomain(
    domainName: "dev", 
    tags: {key: "project", value: "Loghub"},
    vpc: {
        securityGroupId: "sg-1", 
        vpcId: "vpc-1", 
        privateSubnetIds: "subnet-a,subnet-b", 
        publicSubnetIds: "subnet-c,subnet-d"
    },
    region: "us-west-2"
  )
}
```


Response:

```
{
  "data": {
    "importDomain": "OK"
  }
}
```



Exceptions:

* Domain is already imported
* Elasticsearch Domain Not Found
* Public network type is not supported, only Amazon OpenSearch domain within VPC can be imported
* The domain to be imported must be active
* Unknown exception, please check Lambda log for more details

```
{
  "data": {
    "importDomain": null
  },
  "errors": [
    {
      "path": [
        "importDomain"
      ],
      "data": null,
      "errorType": "Lambda:Unhandled",
      "errorInfo": null,
      "locations": [
        {
          "line": 8,
          "column": 3,
          "sourceName": null
        }
      ],
      "message": "Domain is already imported"
    }
  ]
}
```


### Remove Domain


**Type:** Mutation

**Description:**  Remove an Amazon OpenSearch Domain record from DynamoDB table. This will not remove the backend AOS domain.

**Resolver:** Lambda

**Parameters:**

|Name	|Type	|Required	|Default	|Description	|
|---	|---	|---	|---	|---	|
|id	|String	|Yes	|	|Amazon OpenSearch Domain Arn (key in DynamoDB)	|

**Simple Request & Response:**

Request:

```
mutation example {
  removeDomain(id: "439239da8014f9a419c92b1b0c72a5fc")
}
```


Response:

```
{
  "data": {
    "removeDomain": "OK"
  }
}
```


Exceptions:

* Unknown exception, please check Lambda log for more details

```
{
  "data": {
    "removeDomain": null
  },
  "errors": [
    {
      "path": [
        "removeDomain"
      ],
      "data": null,
      "errorType": "Lambda:Unhandled",
      "errorInfo": null,
      "locations": [
        {
          "line": 32,
          "column": 3,
          "sourceName": null
        }
      ],
      "message": "Unknown exception, please check Lambda log for more details"
    }
  ]
}
```




### List Imported Domains

**Type:** Query

**Description:**  List all existing Amazon OpenSearch domains in a region

**Resolver:** Lambda


**Parameters:**

|Name	|Type	|Required	|Default	|Description	|
|---	|---	|---	|---	|---	|
|metrics	|Boolean	|No	|FALSE	|To decide wheather need to query domain metrix (additional request)	|

**Simple Request & Response:**

Request: 

```
query example {
  listImportedDomains(metrics: true) {
    domainName
    endpoint
    id
    metrics {
      freeStorageSpace
      health
      searchableDocs
    }
    version
    engine
  }
}
```



Response:


```
{
  "data": {
    "listImportedDomains": [
      {
        "id": "439239da8014f9a419c92b1b0c72a5fc",
        "domainName": "dev",
        "endpoint": "vpc-dev-3ze2yoxxxxxxxxx.us-west-2.es.amazonaws.com",
        "metrics": {
          "freeStorageSpace": 16058.91,
          "health": "GREEN",
          "searchableDocs": 13159
        },
        "version": "1.0",
        "engine": "OpenSearch"
      }
    ]
  }
}
```



### Get Domain Details


**Type:** Query

**Description:**  Get details of an imported domain.

**Resolver:** Lambda


**Parameters:**

|Name	|Type	|Required	|Default	|Description	|
|---	|---	|---	|---	|---	|
|id	|String	|Yes	|	|Amazon OpenSearch Domain Arn (key in DynamoDB)	|
|metrics	|Boolean	|No	|FALSE	|Whether to include metrics	|

**Simple Request & Response:**


Request:

```
query example {
  getDomainDetails(id: "439239da8014f9a419c92b1b0c72a5fc") {
    domainName
    endpoint
    id
    nodes {
      coldEnabled
      dedicatedMasterCount
      dedicatedMasterEnabled
      dedicatedMasterType
      instanceCount
      instanceType
      warmCount
      warmEnabled
      warmType
      zoneAwarenessEnabled
    }
    tags {
      key
      value
    }
    storageType
    volume {
      size
      type
    }
    vpc {
      privateSubnetIds
      publicSubnetIds
      securityGroupId
      vpcId
    }
    metrics {
      freeStorageSpace
      health
      searchableDocs
    }
    engine
    version
    proxyALB
    proxyError
    proxyInput {
      certificateArn
      cognitoEndpoint
      customEndpoint
      keyName
      vpc {
        privateSubnetIds
        publicSubnetIds
        securityGroupId
        vpcId
      }
    }
    proxyStatus
    alarmError
    alarmInput {
      email
      phone
      alarms {
        type
        value
      }
    }
    alarmStatus
    cognito {
      domain
      enabled
      identityPoolId
      userPoolId
      roleArn
    }
    accountId
    domainArn
    region
  }
}
```


Response:

```
{
  "data": {
    "getDomainDetails": {
      "id": "439239da8014f9a419c92b1b0c72a5fc",
      "domainName": "dev",
      "endpoint": "vpc-dev-3ze2yoxxxxxxxxx.us-west-2.es.amazonaws.com",
      "engine": "OpenSearch",
      "version": "1.0"
      "vpc": {
        "privateSubnetIds": "subnet-1234",
        "publicSubnetIds": "subnet-6789",
        "securityGroupId": "sg-1",
        "vpcId": "vpc-1"
      },
      "cognito": {
        "domain": "",
        "enabled": false,
        "identityPoolId": "N/A",
        "userPoolId": "N/A",
        "roleArn": "N/A"
      }
      "nodes": {
        "coldEnabled": false,
        "dedicatedMasterCount": 0,
        "dedicatedMasterEnabled": false,
        "dedicatedMasterType": "N/A",
        "instanceCount": 1,
        "instanceType": "r6g.large.elasticsearch",
        "warmCount": 0,
        "warmEnabled": false,
        "warmType": "N/A",
        "zoneAwarenessEnabled": false
      },
      "tags": [
        {
          "key": "project",
          "value": "Loghub"
        }
      ],
      "storageType": "EBS",
      "volume": {
        "size": 100,
        "type": "gp2"
      }
      "esVpc": {
        "availabilityZones": [
          "us-west-2b"
        ],
        "securityGroupIds": [
          "sg-07cdfb011fba47e27"
        ],
        "subnetIds": [
          "subnet-0f88a069"
        ],
        "vpcId": "vpc-538e702a"
      },  
      "metrics": {
        "freeStorageSpace": 1,
        "health": "GREEN",
        "searchableDocs": 1
      },
      "alarmError": "",
      "alarmInput": {
        "email": "test@example.com",
        "phone": null,
        "alarms": [
          {
            "type": "CLUSTER_RED",
            "value": "true"
          }
        ]
      },
      "alarmStatus": "ENABLED",
      "proxyStatus": "ENABLED",
      "proxyALB": "LogHu-LoadB-xxx.us-west-2.elb.amazonaws.com",
      "proxyError": ""
      "proxyInput": {
        "certificateArn": "arn:aws:es:us-west-2:123456789012:domain/mycert",
        "cognitoEndpoint": "",
        "customEndpoint": "www.example.com",
        "keyName": "my-key",
        "vpc": {
          "publicSubnetIds": "subnet-1234,subnet-1235",
          "privateSubnetIds": "subnet-5678,subnet-5679",
          "securityGroupId": "sg-1234",
          "vpcId": "vpc-1234"
        }
      }
    }
  }
}
```


Exceptions:

* Cannot find domain in the imported list
* Unknown exception, please check Lambda log for more details



### Get Domain VPC

**Type:** Query

**Description:**  Get VPC info of an Amazon OpenSearch domain in a region

**Resolver:** Lambda


**Parameters:**

|Name	|Type	|Required	|Default	|Description	|
|---	|---	|---	|---	|---	|
|region	|String	|No	|current region	|To support cross region listing (in the same account)	|
|domainName	|String	|Yes	|	|Domain Name	|

**Simple Request & Response:**

Request with region 

```
query example {
  getDomainVpc(domainName: "dev", region: "eu-west-1") {
    availabilityZones
    securityGroupIds
    subnetIds
    vpcId
  }
}
```


Request without region

```
query example {
  getDomainVpc(domainName: "dev") {
    availabilityZones
    securityGroupIds
    subnetIds
    vpcId
  }
}
```


Response:


```
{
  "data": {
    "getDomainVpc": {
      "availabilityZones": [
        "eu-west-1a"
      ],
      "securityGroupIds": [
        "sg-07cdfb011fba47e27"
      ],
      "subnetIds": [
        "subnet-0f88a069"
      ],
      "vpcId": "vpc-538e702a"
    }
  }
}
```



### Create Proxy For OpenSearch

**Type:** Mutation

**Description:**  Create a Nginx Proxy for Amazon OpenSearch in vpc

**Resolver:** Lambda

**Parameters:**

|Name	|Type	|Required	|Default	|Description	|
|---	|---	|---	|---	|---	|
|customEndpoint	|String	|Yes	|	|Custom Domain to access Kibana	|
|cognitoEndpoint	|String	|No	|	|Cognito Domain for Amazon OpenSearch, blank if Amazon OpenSearch doesn't have cognito enabled	|
|id	|String	|Yes	|	|Amazon OpenSearch Domain Arn	|
|keyName	|String	|Yes?	|	|EC2 (nginx) key name	|
|vpc	|K-V	|Yes	|	|VPC for EC2 (nginx)	|
|certificateArn	|String	|Yes	|	|ACM certificate Arn for ELB	|

**Simple Request & Response:**

Request:

```
mutation example {
  createProxyForOpenSearch(
    nginx: {
        vpc: {
            securityGroupId: "sg-1234", 
            privateSubnetIds: "subnet-1234,subnet-1235",
            publicSubnetIds: "subnet-5678,subnet-5679", 
            vpcId: "vpc-1234"
        }, 
        certificateArn: "arn:aws:es:us-west-2:123456789012:domain/mycert", 
        keyName: "my-key",
        cognitoEndpoint: "hello.auth.us-west-2.amazoncognito.com", 
        customEndpoint: "www.example.com",
    }, 
    
    id: "439239da8014f9a419c92b1b0c72a5fc"
  )
}
```


Response:

```
{
  "data": {
    "createNginxProxyForOpenSearch": "OK"
  }
}
```


Exceptions:

* Unknown exception, please check Lambda log for more details



### Delete Proxy For OpenSearch


**Type:** Mutation

**Description:**  Remove an Amazon OpenSearch Nginx Proxy Stack

**Resolver:** Lambda

**Parameters:**

|Name	|Type	|Required	|Default	|Description	|
|---	|---	|---	|---	|---	|
|id	|String	|Yes	|	|Amazon OpenSearch Domain Arn (key in DynamoDB)	|


Request:

```
mutation example {
  deleteProxyForOpenSearch(id: "439239da8014f9a419c92b1b0c72a5fc")
}
```


Response:

```
{
  "data": {
    "deleteProxyForOpenSearch": "OK"
  }
}
```


Exceptions:

* Unknown exception, please check Lambda log for more details




### Create Alarm For OpenSearch

**Type:** Mutation

**Description:**  Create an Alarm for opensearch domain

**Resolver:** Lambda

**Parameters:**

|Name	|Type	|Required	|Default	|Description	|
|---	|---	|---	|---	|---	|
|id	|String	|Yes	|	|Amazon OpenSearch Domain Arn	|
|email	|String	|Yes?	|	|Email to receive notification	|
|alarms	|List	|Yes	|	|List of k-v for alarm parameters	|
|phone	|String	|No	|	|Phone number to receive notification	|

**Simple Request & Response:**

Request:

```
mutation example {
  createAlarmForOpenSearch(
    id: "439239da8014f9a419c92b1b0c72a5fc", 
    input: {
        email: "test@example.com", 
        alarms: [
            {Type: CLUSTER_RED, value: "true"},
            {Type: FREE_STORAGE_SPACE, value: "20"}
            ...
    })
}
```


Response:

```
{
  "data": {
    "createAlarmForOpenSearch": "OK"
  }
}
```


Exceptions:

* Unknown exception, please check Lambda log for more details




### Delete Alarm For OpenSearch


**Type:** Mutation

**Description:**  Remove an Alarm Stack

**Resolver:** Lambda

**Parameters:**

|Name	|Type	|Required	|Default	|Description	|
|---	|---	|---	|---	|---	|
|id	|String	|Yes	|	|Amazon OpenSearch Domain Arn (key in DynamoDB)	|

**Simple Request & Response:**

Request:

```
mutation example {
  deleteAlarmForOpenSearch(id: "439239da8014f9a419c92b1b0c72a5fc")
}
```


Response:

```
{
  "data": {
    "deleteAlarmForOpenSearch": "OK"
  }
}
```


Exceptions:

* Unknown exception, please check Lambda log for more details



## Resource APIs

Resource APIs are a list of helper functions for AWS Resources that are used in the solution, such as listing VPCs etc.


### List Resources

**Type:** Query

**Description:**  List AWS Resources (Services) in current region

**Resolver:** Lambda


**Parameters:**

|Name	|Type	|Required	|Default	|Description	|
|---	|---	|---	|---	|---	|
|type	|String	|Yes	|	|Available List: S3Bucket, VPC, Subnet, SecurityGroup, Certificate, KeyName, Trail	|
|parentId	|String	|No	|	|To filter by parent Id if any, if not provided, all are returned	|

**Simple Request & Response:**


Request for list S3Bucket

```
query example {
  listResources(Type:S3Bucket) {
    id
    name
    parentId
  }
}
```



Response:


```
{
  "data": {
    "listResources": [
      {
        "id": "bucketa",
        "name": "bucketa",
        "parentId": null
      },
      {
        "id": "bucketb",
        "name": "bucketb",
        "parentId": null
      }
    ]
  }
}
     
```


Request for list VPC Id

```
query example {
  listResources(Type:VPC) {
    id
    name
    parentId
  }
}
```



Response:


```
{
  "data": {
    "listResources": [
      {
        "id": "vpc-040e5096a29a457db",
        "name": "test-vpc",
        "parentId": null
      },
      {
        "id": "vpc-538e702a",
        "name": "default-vpc",
        "parentId": null
      },
      {
        "id": "vpc-1112456",
        "name": "-",
        "parentId": null
      }
    ]
  }
}
     
```



Request for list Subnet Id

```
query example {
  listResources(Type:Subnet, parentId: "vpc-088c09a3e0b797406") {
    id
    description
    name
    parentId
  }
}
```



Response:


```
{
  "data": {
    "listResources": [
      {
        "id": "subnet-00a5510951c6b4bad",
        "description": "eu-west-1a",
        "name": "LogHub/LogHubVPC/DefaultVPC/publicSubnet1",
        "parentId": "vpc-088c09a3e0b797406"
      },
      {
        "id": "subnet-066f81646e30f0e48",
        "description": "eu-west-1b",
        "name": "LogHub/LogHubVPC/DefaultVPC/publicSubnet2",
        "parentId": "vpc-088c09a3e0b797406"
      },
      {
        "id": "subnet-06c232cfb88789980",
        "description": "eu-west-1a",
        "name": "LogHub/LogHubVPC/DefaultVPC/privateSubnet1",
        "parentId": "vpc-088c09a3e0b797406"
      },
      {
        "id": "subnet-04324df4484d33cfb",
        "description": "eu-west-1b",
        "name": "LogHub/LogHubVPC/DefaultVPC/privateSubnet2",
        "parentId": "vpc-088c09a3e0b797406"
      },
      {
        "id": "subnet-065c2b45471b08568",
        "description": "eu-west-1b",
        "name": "LogHub/LogHubVPC/DefaultVPC/isolatedSubnet2",
        "parentId": "vpc-088c09a3e0b797406"
      },
      {
        "id": "subnet-0934357dfce96eba3",
        "description": "eu-west-1a",
        "name": "LogHub/LogHubVPC/DefaultVPC/isolatedSubnet1",
        "parentId": "vpc-088c09a3e0b797406"
      }
    ]
  }
} 
```




Request for list lambda functions

```
query example {
  listResources(Type:Lambda) {
    description
    id
    name
  }
}
```



Response:


```
{
  "data": {
    "listResources": [
      {
        "description": "Log Hub - Helper function to handle CloudFormation deployment",
        "id": "LogHub-LogHubCfnFlowCfnHelperD9302B91-VZNJXLqIZjVu",
        "name": "LogHub-LogHubCfnFlowCfnHelperD9302B91-VZNJXLqIZjVu-$LATEST"
      },
      ...
    ]
  }
}

```


Request for list RDS instances

```
query example {
  listResources(Type:RDS) {
    description
    id
    name
  }
}
```



Response:


```
{
  "data": {
    "listResources": [
      {
        "description": "/aws/rds/instance/database-1",
        "id": "database-1",
        "name": "database-1 (mysql)"
      },
      {
        "description": "/aws/rds/cluster/demodb",
        "id": "demodb-instance-1",
        "name": "demodb-instance-1 (aurora-mysql)"
      }
    ]
  }
}
```



### Put Resource Logging Bucket

**Type:** Mutation

**Description:**  Put Logging bucket for resource in current region

**Resolver:** Lambda


**Parameters:**

|Name	|Type	|Required	|Default	|Description	|
|---	|---	|---	|---	|---	|
|type	|String	|Yes	|	|Available List: S3Bucket, CloudFront	|
|resourceName	|String	|Yes	|	|The resource name or ID	|

**Simple Request & Response:**


Request

```
query example {
  putResourceLoggingBucket(resourceName: "test-bucket", Type: S3Bucket) {
    bucket
    prefix
    enabled
  }
}
```



Response:


```
{
  "data": {
    "putResourceLoggingBucket": {
      "bucket": "loghub-loghubloggingbucket0fa53b76-mkvj68ix2ufo",
      "prefix": "s3/test-bucket/",
      "enabled": true
    }
  }
} 
```





### Get Resource Logging Bucket

**Type:** Query

**Description:**  Get Logging bucket for resource in current region

**Resolver:** Lambda


**Parameters:**

|Name	|Type	|Required	|Default	|Description	|
|---	|---	|---	|---	|---	|
|type	|String	|Yes	|	|Available List: S3Bucket, Trail	|
|resourceName	|String	|Yes	|	|The resource name or ID	|

**Simple Request & Response:**

Request

```
query example {
  getResourceLoggingBucket(Type: Trail, resourceName: "testtrail") {
    bucket
    prefix
    enabled
  }
}
```



Response:


```
{
  "data": {
    "getResourceLoggingBucket": {
      "bucket": "aws-cloudtrail-logs-123456789012-222dcf7b",
      "prefix": "AWSLogs/123456789012/CloudTrail/",
      "enabled: true
    }
  }
}
     
```
