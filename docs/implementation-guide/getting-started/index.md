After [deploying the solution](../deployment.md), you can read this tutorial to learn how to use the solution to build an end-to-end analytics pipeline for Amazon CloudTrail logs on top of an Amazon OpenSearch Service (AOS) domain. For more comprehensive information, 
see [Creating log analytics pipelines](../pipelines/aws-services/index.md) and other topics within this guide. 

## Prerequisites (Global Regions)
* A domain. You can access the Domain Name System (DNS) resolver of the domain and create DNS records.
* An SSL certificate in Amazon Certificate Manager (ACM). The SSL must be associated with the given domain.
* An AOS domain using VPC. You can create an AOS domain using VPC by following [Amazon OpenSearch Service Developer Guide][dg] or use the solution [Centralized Logging][cl].

## Prerequisites (China Regions with OIDC)
* A domain. You can access the Domain Name System (DNS) resolver of the domain and create DNS records.
* OpenID Connector (OIDC) is need, since Cognito User Pool currently is not supported in China region. We recommend [Keycloak](https://github.com/aws-samples/keycloak-on-aws) as a substitute authenticator identity provider.
* Acquiring a ICP (Internet Content Provider) license for your domain name. No ICP license will result in domain unaccessiablity.
* An SSL certificate in Amazon Certificate Manager (ACM). The SSL must be associated with the given domain.
* An AOS domain using VPC. You can create an AOS domain using VPC by following [Amazon OpenSearch Service Developer Guide][dg] or use the solution [Centralized Logging][cl].

## Prerequisites (China Regions with Keycloak)
* A domain. You can access the Domain Name System (DNS) resolver of the domain and create DNS records.
* [**Keycloak on AWS**](https://github.com/aws-samples/keycloak-on-aws){target=_blank}
* Acquiring a ICP (Internet Content Provider) license for your domain name. No ICP license will result in domain unaccessiablity.
* An SSL certificate in Amazon Certificate Manager (ACM). The SSL must be associated with the given domain.
* An AOS domain using VPC. You can create an AOS domain using VPC by following [Amazon OpenSearch Service Developer Guide][dg] or use the solution [Centralized Logging][cl].

## Steps
You can complete the following steps by using the Amazon CloudFormation console and Log Hub console.

1. [Import AOS domain](./2.import-domain-manual.md). Import an existing AOS domain into the solution.
2. [Create Access Proxy](./3.create-proxy.md). Create a public access proxy which allows customers to access AOS built-in dashboard from anywhere.
3. [Ingest CloudTrail Logs](./4.build-cloudtrail-pipeline.md). Ingest CloudTrail logs into the specified AOS domain.
4. [View Dashboard](./5.view-dashboard.md). View the dashboard of CloudTrail logs.

[dg]: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/createupdatedomains.html 
[cl]: https://aws.amazon.com/solutions/implementations/centralized-logging/
