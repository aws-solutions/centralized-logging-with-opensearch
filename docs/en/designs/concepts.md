# Concepts

We created a couple of concepts to keep us at the same page. The following session will explain the definition of each
concept.

## Solution Components

![](../images/product-high-level-arch.png)

* **Search Engine**. The Search Engine is a bottom layer to index the log information and provide CRUD (Create, Read, Update,
  Delete) capability to the other applications. In this system, the _Search Engine_ represents Amazon Elasticsearch (AES)
  cluster by default.

* **Log Visual**. It is a piece of software used to build up visuals, metrics and dashboard. In this system, the _Log Visual_
  represents the Kibana associated with the AES cluster.

* **Log Visual Template**. A Log Visual Template is a standard configuration of commonly used applications (or AWS native
  service) in Log Visual. For example, a standard dashboard template for Nginx, Apache, MySQL, or CloudFront.

* **Log Buffer**. A middle layer between Log Agent and AES. We introduce this layer to protect the engine layer from
  being overwhelmed.

* **Log Jobs**. A Layer between Log Buffer Layer and Search Engine. In this layer, the users can perform some data cleanup
  using some additional compute resource. For example, Lambda, Glue.

* **Log Store**. A storage media to keep log data. 

* **Instance Agent**. An Instance Agent is a piece of software installed on EC2 instances (or on-premise instances) which can be
  used to collect log and report to Amazon Elasticsearch (AES), Log Buffer or Log Storage.

* **Container Agent**. A daemon agent which being used on ECS/EKS cluster to collect log and report to Search Engine,
  Cache Layer or Storage Layer.

* **Mobile SDK**. An SDK embedded in the mobile (iOS, Android, Web) client. Customers can use this SDK to authenticate against
  AWS and send log, click stream to AWS.

* **Configuration Center**. It is a portal deployed in the customer's AWS account protected by Cognito User Pool or
  OpenID Connect Provider. Customers can manage/import Search Engine, install/configure log agents, backup data and others.

* **Log Format Config**. A log format template is a configuration file for log agent to know the format of the
  log, the location of the log file, the destination of the log, the local log processor, and others.

* **Log Collector for Services**. A component used to extract logs from AWS native services and send to
  Log Buffer or Log Engine. For example, _Log Collector for Lambda_ is a component used to extract data from CloudWatch
  Logs and upload to AES or Kinesis. _Log Collector for CloudFront_ is a component extract logs from S3 and upload to AES
  or Kinesis. _Log Collector for Lambda@Edge_ can extract logs from CloudWatch Logs in different regions and upload.

* **Log Monitor**. A component to create alarm and send notifications. In this system, we use the Kibana built-in feature
  together with SNS. We also extend SNS notification target to support WeChat Enterprise account and DingTalk.

* **Multi-tenant**. A fine-grained access control to log data.

* **Workload Simulator**. A typical workload architect with application running on AWS. For example, a 3-tier web 
  application. This is used for customers to get sample experience of this solution.
  
* **Traffic Generator**. A piece of software used to generate web traffic, this will cause the simulated workload 
  to generate logs.

## Accounts

* **Main Account**. The main AWS account which contains the underlying infrastructure like Search Engine, Log Buffer, 
  Log Jobs, Log Storage, Configuration Center and others. All logs are sent to this account for further analysis and 
  storage.
  
* **Sub Account**. The other AWS accounts where your application are deployed and need to be sent to the centralized logging 
  platform.
  
## Solution Assets

* **Deliverables**. Amazon CloudFormation templates or AWS CDK package used to create a solution component or a combination 
  of solution components. The rest assets like Lambda code will be hosted in public S3 buckets owned by Solutions Builder team.
  
* **Implementation Guide**. A user manual gives guidance to the customers how to use the solution. It includes a step-by-step 
  Getting Started guide.
  
* **Workshop Portal**. A portal hosting the associated solution workshop. The workshop content can be used for the field 
  team to organize an offline customer facing workshop.
  

