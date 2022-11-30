# EKS Log API Design


## EKS Log Source APIs

This document is about API design of EKS cluster as log source component.

### list EKS cluster names

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

### Import an EKS cluster

**Type:** Mutation

**Description:** Import an EKS cluster used as log source in solution

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


### list imported EKS clusters

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
query example {
    listImportedEKSClusters (page: 1, count: 10) {
        eksClusterLogSourceList {
            id
            aosDomain {
                id
                domainName
                engine
                version
                endpoint
                metrics {
                    searchableDocs
                    freeStorageSpace
                    health
                }
            }
            eksClusterName
            eksClusterArn
            cri
            vpcId
            eksClusterSGId
            subnetIds
            oidcIssuer
            endpoint
            createdDt
            accountId
            region
            logAgentRoleArn
            deploymentKind
            tags {
                key
                value
            }
        }
        total
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
                    "id": "e83aa65ef40e4a8b883dff33af483e36",
                    "aosDomain": {
                        "id": "439239da8014f9a419c92b1b0c72a5fc",
                        "domainName": "dev",
                        "engine": "OpenSearch",
                        "version": "1.0",
                        "endpoint": "vpc-dev-xxx.eu-west-1.es.amazonaws.com",
                        "metrics": null
                    },
                    "eksClusterName": "test",
                    "eksClusterArn": "arn:aws:eks:eu-west-1:123456789012:cluster/test",
                    "cri": "docker",
                    "vpcId": "vpc-0123",
                    "eksClusterSGId": "sg-1234",
                    "subnetIds": [
                        "subnet-1234",
                        "subnet-5678",
                        ...
                    ],
                    "oidcIssuer": "https://oidc.eks.eu-west-1.amazonaws.com/id/ABC",
                    "endpoint": "https://ABC.sk1.eu-west-1.eks.amazonaws.com",
                    "createdDt": "2022-10-29T07:52:48Z",
                    "accountId": "123456789012",
                    "region": "eu-west-1",
                    "logAgentRoleArn": "arn:aws:iam::123456789012:role/LogHub-EKS-LogAgent-Role-3623ec2044264a2189416bcaaa7ee948",
                    "deploymentKind": "DaemonSet",
                    "tags": []
                },
                ...
            ],
            "total": 2
        }
    }
}
```


### Get imported EKS cluster details

**Type:** Query

**Description:** Display details of an imported eks cluster

**Resolver:** Lambda

**Parameters:**

| Name         | Type   | Required | Default | Description                                |
| ------------ | ------ | -------- | ------- | ------------------------------------------ |
| eksClusterId | String | Yes      |         | log source id for the imported EKS Cluster |

**Simple Request & Response:**

Request:

```
query example {
    getEKSClusterDetails (eksClusterId: "e83aa65ef40e4a8b883dff33af483e36") {
        id
        aosDomain {
            id
            domainName
            engine
            version
            endpoint
            metrics {
                searchableDocs
                freeStorageSpace
                health
            }
        }
        eksClusterName
        eksClusterArn
        cri
        vpcId
        eksClusterSGId
        subnetIds
        oidcIssuer
        endpoint
        createdDt
        accountId
        region
        logAgentRoleArn
        deploymentKind
        tags {
            key
            value
        }
    }
}
```

Response:

```
{
    "data": {
        "getEKSClusterDetails": {
            "id": "e83aa65ef40e4a8b883dff33af483e36",
            "aosDomain": {
                "id": "439239da8014f9a419c92b1b0c72a5fc",
                "domainName": "dev",
                "engine": "OpenSearch",
                "version": "1.0",
                "endpoint": "vpc-dev-xxx.eu-west-1.es.amazonaws.com",
                "metrics": null
            },
            "eksClusterName": "test",
            "eksClusterArn": "arn:aws:eks:eu-west-1:123456789012:cluster/test",
            "cri": "docker",
            "vpcId": "vpc-0123",
            "eksClusterSGId": "sg-1234",
            "subnetIds": [
                "subnet-1234",
                "subnet-5678",
                ...
            ],
            "oidcIssuer": "https://oidc.eks.eu-west-1.amazonaws.com/id/ABC",
            "endpoint": "https://ABC.sk1.eu-west-1.eks.amazonaws.com",
            "createdDt": "2022-10-29T07:52:48Z",
            "accountId": "123456789012",
            "region": "eu-west-1",
            "logAgentRoleArn": "arn:aws:iam::123456789012:role/LogHub-EKS-LogAgent-Role-3623ec2044264a2189416bcaaa7ee948",
            "deploymentKind": "DaemonSet",
            "tags": []
        }
    }
}
```

## EKS Log Deployment APIs

### Deploy as DaemonSet

**Type:** Query

**Description:** Display kubernetes deployment details in yaml for DaemonSet

**Resolver:** Lambda

**Parameters:**

| Name         | Type   | Required | Default | Description                                |
| ------------ | ------ | -------- | ------- | ------------------------------------------ |
| eksClusterId | String | Yes      |         | log source id for the imported EKS Cluster |

**Simple Request & Response:**

Request:

```
query example  {
    getEKSDaemonSetConf (eksClusterId: "a")
}
```

Response:

```
{
    "data": {
        "getEKSDaemonSetConf": "..."
    }
}
```



### Deploy as Side Car

**Type:** Query

**Description:** Display kubernetes deployment details in yaml for Side Car

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
    "getEKSDeploymentConfig": "..."
  }
}
```
