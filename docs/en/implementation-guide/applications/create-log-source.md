You need to create a log source first before collecting application logs. Log Hub supports the following log sources:

* EC2 instance group
* EKS cluster
* Amazon S3

For more information, see [concepts](./index.md).

## Create an EC2 instance group as the log source

An instance group means a group of EC2 Linux instances which host the same application. It is a way to associate a [Log Config](./index.md#log-config) with a group of EC2 instances. Log Hub uses [Systems Manager Agent(SSM Agent)][ssm-agent]{target="_blank"} to install/configure Fluent Bit agent, and sends log data to [Kinesis Data Streams][kds]{target="_blank"}. 

### Prerequisites

Make sure the instances meet the following requirements:

- SSM agent is installed on instances. Refer to [install SSM agent on EC2 instances for Linux](https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-manual-agent-install.html) for more details.
- The `AmazonSSMManagedInstanceCore` policy is being associated with the instances.
- The [OpenSSL 1.1][open-ssl] or later is installed. Refer to [OpenSSL Installation](../resources/open-ssl.md) for more details.
- The instances have network access to AWS Systems Manager.
- The instances have network access to Amazon Kinesis Data Streams.
- The operating system of the instances are supported by Fluent Bit. Refer to [Supported Platform][supported-platforms].

### Steps

1. Sign in to the Log Hub Console.
2. In the left sidebar, under **Log Source**, choose **Instance Group**.
3. Click the **Create an instance group** button.
4. In the **Settings** section, specify a group name.
5. In the **Instances** section, select the instance from which you want to collect logs. You can add up to 5 tags to filter instances.
6. Verify that all the selected instances "Pending Status" is **Online**.
7. (Optional) If the selected instances "Pending Status" are empty, click the **Install log agent** button and wait for "Pending Status" to become **Online**.
8. (Optional) If you want to ingest logs from another account, select a [linked account](../link-account/index.md) in the **Account Settings** section to create an instance group log source from another account.
9. Choose **Create**.

!!! warning "Known issue"
    Use the Log Hub console to install Fluent Bit agent on Ubuntu instances in **Beijing (cn-north-1) and Ningxia (cn-northwest-1)** Region will cause installation error. The Fluent Bit assets cannot
    be downloaded successfully. You need to install the Fluent Bit agent by yourself.

## Import an EKS cluster as the log source

The [EKS Cluster][eks] in Log Hub refers to the Amazon Elastic Kubernetes Service (Amazon EKS) from which you want to collect pod logs. Log Hub will guide you to deploy the logging agent as a [DaemonSet][daemonset] or [Sidecar][sidecar] in the EKS Cluster.

!!! important "Important"

    * Log Hub does not support sending logs in one EKS cluster to more than one Amazon OpenSearch domain at same time.
    * VPC peering connection between the log source EKS and the log destination OpenSearch is required if they are in different VPCs.

!!! important "Important"

    Please make sure your EKS cluster's VPC is connected to AOS cluster' VPC so that log can be ingested. Refer to [VPC Connectivity][vpc-connectivity] for more details regarding approaches to connect VPCs.

1. Sign in to the Log Hub Console.
2. In the left sidebar, under **Log Source**, choose **EKS Cluster**.
3. Click the **Import a Cluster** button.
4. Choose the **EKS Cluster** where Log Hub collects logs from. 
(Optional) If you want to ingest logs from another account, select a [linked account](../link-account/index.md) from the **Account** dropdown to import an EKS log source from another account.
5. Select **DaemonSet** or **Sidecar** as logging agent's deployment pattern. 
6. Choose **Next**.
7. Specify the **Amazon OpenSearch** where Log Hub sends the logs to.
8. Follow the guidance to establish a VPC peering connection between EKS's VPC and OpenSearch's VPC.
    - [Create and accept VPC peering connections](https://docs.aws.amazon.com/vpc/latest/peering/create-vpc-peering-connection.html)
    - [Update your route tables for a VPC peering connection](https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-routing.html)
    - [Update your security groups to reference peer VPC groups](https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-security-groups.html)
9. Choose **Next**.
10. Add tags if needed.
11. Choose **Create**.

## Amazon S3 as the log source
!!! note "Note"

    The Amazon S3 bucket must be in the same region as your Log Hub region.

An [Amazon S3 bucket][bucket] in Log Hub refers to a bucket where your application log are stored. You do not need to create a specific log source from Log Hub Console.



[kds]: https://aws.amazon.com/kinesis/data-streams/
[ssm-agent]: https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-agent.html
[open-ssl]: https://www.openssl.org/source/
[eks]: https://docs.aws.amazon.com/eks/latest/userguide/what-is-eks.html
[daemonset]: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
[sidecar]: https://kubernetes.io/docs/concepts/workloads/pods/#workload-resources-for-managing-pods
[bucket]: https://docs.aws.amazon.com/AmazonS3/latest/userguide//UsingBucket.html
[supported-platforms]: https://docs.fluentbit.io/manual/installation/supported-platforms
[vpc-connectivity]: https://docs.aws.amazon.com/whitepapers/latest/building-scalable-secure-multi-vpc-network-infrastructure/vpc-to-vpc-connectivity.html