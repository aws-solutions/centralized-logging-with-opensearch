# Overview

### APIs

#### EKS Cluster as log source APIs

This document is about API design of EKS cluster as log source component.

##### list EKSCluster Names

**Type:** Query

**Description:** Display cluster names for all regions

**Resolver:** Lambda

**Parameters:**

| Name      | Type    | Required | Default | Description                                 |
| --------- | ------- | -------- | ------- | ------------------------------------------- |
| nextToken | String  | No       |         | The token for pagination                    |
| isListAll | Boolean | No       | false   | Whether to show EKS clusters in all regions |

**Simple Request & Response:**

Request:

```
query example{
  listEKSClusterNames(nextToken: "", isListAll: false) {
    clusters
    nextToken
  }
}
```

Response:

```
{
  "data": {
    "listEKSClusterNames": {
      "clusters": [
        "eks-demo",
        "loghub"
      ],
      "nextToken": null
    }
  }
}
```

##### list imported EKS Clusters

**Type:** Query

**Description:** List imported EKS cluster

**Resolver:** Lambda

**Parameters:**

| Name  | Type | Required | Default | Description                |
| ----- | ---- | -------- | ------- | -------------------------- |
| count | Int  | No       | 10      | page number, start from 1  |
| page  | Int  | No       | 1       | number of records per page |

**Simple Request & Response:**

Request:

```
query example{
  listImportedEKSClusters(count: 10, page: 1) {
    eksClusterLogSourceList {
      accountId
      vpcId
      subnetIds
      region
      oidcIssuer
      logAgentRoleArn
      id
      endpoint
      eksClusterSGId
      eksClusterName
      eksClusterArn
      deploymentKind
      cri
      createdDt
      tags {
        key
        value
      }
      aosDomain {
        version
        id
        engine
        endpoint
        domainName
      }
    }
  }
}

```

Response:

```
{
  "data": {
    "listImportedEKSClusters": {
      "eksClusterLogSourceList": [
        {
          "accountId": null,
          "vpcId": "vpc-f4d05e8c",
          "subnetIds": [
            "subnet-96816bcb",
            "subnet-3dabc916",
            "subnet-9b948ce2",
            "subnet-a4cecbef"
          ],
          "region": null,
          "oidcIssuer": "https://oidc.eks.us-west-2.amazonaws.com/id/20E13C86999BBFC25EC76C826CFFF4FB",
          "logAgentRoleArn": "arn:aws:iam::783732175206:role/LogHub-EKS-LogAgent-Role-a2a5b0643c4c472abd3dacfdbf9e1463",
          "id": "1d431ccd7caa4c90af0d86193bf78f9a",
          "endpoint": "https://20E13C86999BBFC25EC76C826CFFF4FB.yl4.us-west-2.eks.amazonaws.com",
          "eksClusterSGId": "sg-02b491dce426c1995",
          "eksClusterName": "eks-demo",
          "eksClusterArn": "arn:aws:eks:us-west-2:783732175206:cluster/eks-demo",
          "deploymentKind": "DaemonSet",
          "cri": null,
          "createdDt": "2022-04-03T16:34:02Z",
          "tags": [],
          "aosDomain": {
            "version": "1.0",
            "id": "a80137115e9ad59cf2a7137fe0e38197",
            "engine": "OpenSearch",
            "endpoint": "vpc-workshop-os-migdv4qrxbqdrp6mbfknyyagk4.us-west-2.es.amazonaws.com",
            "domainName": "workshop-os"
          }
        }
      ]
    }
  }
}
```

#####

**Type:** Query

**Description:** Display DaemonSet configuration by the EKS Cluster log source Id

**Resolver:** Lambda

**Parameters:**

| Name         | Type   | Required | Default | Description                                |
| ------------ | ------ | -------- | ------- | ------------------------------------------ |
| eksClusterId | String | Yes      |         | log source id for the imported EKS Cluster |

**Simple Request & Response:**

Request:

```
query example{
  getEKSDaemonSetConfig(
	  eksClusterId: "1d431ccd7caa4c90af0d86193bf78f9a"
	  )
}
```

Response:

```
{
  "data": {
    "getEKSDaemonSetConfig": ""
  }
}
```

#####

**Type:** Query

**Description:** Display deployment configuration by the EKS Cluster log source Id

**Resolver:** Lambda

**Parameters:**

| Name         | Type   | Required | Default | Description                                |
| ------------ | ------ | -------- | ------- | ------------------------------------------ |
| eksClusterId | String | Yes      |         | log source id for the imported EKS Cluster |
| ingestionId  | String | Yes      |         | the Id for application log ingestion       |

**Simple Request & Response:**

Request:

```
query example{
  getEKSDeploymentConfig(
	  eksClusterId: "1d431ccd7caa4c90af0d86193bf78f9a",
	  ingestionId: "2d43abe07caa4c90af0d8619323064"
	  )
}
```

Response:

```
{
  "data": {
    "getEKSDeploymentConfig": ""
  }
}
```

##### Import a EKS Cluster as application log source

**Type:** Mutation

**Description:** Create a record in DynamoDB

**Resolver:** Lambda

**Parameters:**

| Name           | Type   | Required | Default | Description                                                |
| -------------- | ------ | -------- | ------- | ---------------------------------------------------------- |
| aosDomainId    | String | Yes      |         | The imported AOS domain id.                                |
| deploymentKind | String | Yes      |         | The deployment type fo the log agent, DaemonSet or SideCar |
| eksClusterName | enum   | Yes      |         | The imported EKS cluster name.                             |
| accountId      | enum   | No       |         | The account id corresponding to the imported EKS cluster.  |
| cri            | String | No       |         | K8s container runtime.                                     |
| region         | String | No       |         | The region name corresponding to the imported EKS cluster. |
| tags           | K-V    | No       |         | Tag the EKS Cluster log source.                            |

**Simple Request & Response:**

```
query example{
  importEKSCluster(
	  aosDomainId: "7d43abe07ebb4c90af0d8619328054",
	  deploymentKind: "DaemonSet",
	  eksClusterName: "eks-demo-cluster",
	  accountId: "20599832",
	  cri: "containerd",
	  region: "us-west-2",
	  tags: {
		  key: "evn",
		  value: "Testing"
		}
	)
}
```

Response:

```
{
  "data": {
    "importEKSCluster": "OK"
  }
}
```

##### Create a EKS cluster pod Log ingestion

**Type:** Mutation

**Description:** Create a record in DynamoDB.

**Resolver:** Lambda

**Parameters:**

| Name         | Type   | Required | Default | Description                                     |
| ------------ | ------ | -------- | ------- | ----------------------------------------------- |
| eksClusterId | String | Yes      |         | EKS cluster log source Unique ID                |
| confId       | String | Yes      |         | Log Config Unique ID                            |
| aosParas     | K-V    | Yes      |         | Selected Amazonn OpenSearch related parameters. |
| kdsParas     | K-V    | Yes      |         | Created Kinesis Data Stream related parameters. |
| tags         | K-V    | No       |         | Custom tags for the ingestion                   |

**Simple Request & Response:**

Request:

```
mutation example{
  createEKSClusterPodLogIngestion(
	  aosParas: {
		  opensearchArn: "arn:aws:es:us-west-2:783732175206:domain/workshop-os",
		  domainName: "workshop-os",
		  opensearchEndpoint: "vpc-workshop-os-migdv4qrxbqdrp6mbfknyyagk4.us-west-2.es.amazonaws.com",
		  indexPrefix: "nginx-log",
		  warmLogTransition: 0,
		  coldLogTransition: 0,
		  logRetention: 0,
		  engine: "OpenSearch",
		  vpc: {
			  vpcId: "vpc-0c111322ef4a52f41",
			  securityGroupId: "sg-0ae9e8d70d31b40d0",
			  privateSubnetIds: "subnet-069c0ff066cca88cf,subnet-05839e25db2e70d8f",
			  publicSubnetIds: ""
		  },
		  engine: "OpenSearch",
		  opensearchArn: "arn:aws:es:us-west-2:783732175206:domain/workshop-os",
		  opensearchEndpoint: "vpc-workshop-os-migdv4qrxbqdrp6mbfknyyagk4.us-west-2.es.amazonaws.com"
	  },
	  kdsParas: {
		  enableAutoScaling: true,
		  maxShardNumber: 10
		  startShardNumber: 2
		},
	  confId: "deebad45-c4ad-4346-9b4e-b56f635b5c31",
	  eksClusterId: "1d431ccd7caa4c90af0d86193bf78f9a",
	  tags: {
		  key: "env",
		  value: "testing"
  	  }
	)
}
```

Response:

```
{
  "data": {
    "createEKSClusterPodLogIngestion":"1bcaedaa-1f94-4d3d-9b50-9592a0fc6d32"
  }
}
```
