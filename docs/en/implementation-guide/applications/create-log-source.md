You need to create a log source first before collecting application logs. Centralized Logging with OpenSearch supports the following log sources:

* [Amazon EC2 instance group](#amazon-ec2-instance-group)
* [Amazon EKS cluster](#amazon-eks-cluster)
* [Amazon S3](#amazon-s3)
* [Syslog](#syslog)

For more information, see [concepts](./index.md#concepts).

## Amazon EC2 Instance Group

An instance group represents a group of EC2 Linux instances, which enables the solution to associate a [Log Config](./index.md#log-config) with multiple EC2 instances quickly. Centralized Logging with OpenSearch uses [Systems Manager Agent(SSM Agent)][ssm-agent]{target="_blank"} to install/configure Fluent Bit agent, and sends log data to [Kinesis Data Streams][kds]{target="_blank"}.

### Prerequisites

Make sure the instances meet the following requirements:

- SSM agent is installed on instances. Refer to [install SSM agent on EC2 instances for Linux](https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-manual-agent-install.html) for more details.
- The `AmazonSSMManagedInstanceCore` policy is being associated with the instances.
- The [OpenSSL 1.1][open-ssl] or later is installed. Refer to [OpenSSL Installation](../resources/open-ssl.md) for more details.
- The instances have network access to AWS Systems Manager.
- The instances have network access to Amazon Kinesis Data Streams, if you use it as the [Log Buffer](./index.md#log-buffer).
- The instances have network access to Amazon S3, if you use it as the [Log Buffer](./index.md#log-buffer).
- The operating system of the instances are supported by Fluent Bit. Refer to [Supported Platform][supported-platforms].

### (Option 1) Select instances to create an Instance Group

1. Sign in to the Centralized Logging with OpenSearch Console.
2. In the left sidebar, under **Log Source**, choose **Instance Group**.
3. Choose **Create an instance group**.
4. In the **Instance Group Settings** section, specify a group name.
5. Select **Instances**. You can use up to 5 tags to filter the instances.
6. Verify that all the selected instances "Pending Status" is **Online**.
7. (Optional) If the selected instances "Pending Status" are empty, click the **Install log agent** button and wait for "Pending Status" to become **Online**.
8. (Optional) If you want to ingest logs from another account, select a [linked account](../link-account/index.md) in the **Account Settings** section to create an instance group log source from another account.
9. Choose **Create**.

!!! important "Important"
    An installation error may occur if you use the Centralized Logging with OpenSearch console to install Fluent Bit agent on Ubuntu instances in **China (Beijing) Region Operated by Sinnet (cn-north-1)** and **China (Ningxia) Region Operated by NWCD (cn-northwest-1)** Region. This is because the Fluent Bit assets cannot
    be downloaded successfully. You need to install the Fluent Bit agent by yourself.

### (Option 2) Select an Auto Scaling group to create an Instance Group
When creating an Instance Group with Amazon EC2 Auto Scaling group, the solution will generate a shell script which you
should include in the [EC2 User Data][ec2-user-data].

1. Sign in to the Centralized Logging with OpenSearch Console.
2. In the left sidebar, under **Log Source**, choose **Instance Group**.
3. Choose **Create an instance group**.
4. In the **Instance Group Settings** section, specify a group name.
5. Select **Auto Scaling Groups**.
6. Select the autoscaling group from which you want to collect logs.
7. (Optional) If you want to ingest logs from another account, select a [linked account](../link-account/index.md) in the **Account Settings** section to create an instance group log source from another account.
8. Choose **Create**. After you created a Log Ingestion using the Instance Group, you can find the generated Shell Script in the details page.
9. Copy the shell script and update the User Data of the Auto Scaling Group's [launch configurations](https://docs.aws.amazon.com/autoscaling/ec2/userguide/launch-configurations.html) or [launch template](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-launch-templates.html).
The shell script will automatically install Fluent Bit, SSM agent if needed, and download Fluent Bit configurations.
10. Once you have updated the launch configurations or launch template, you need to start an [instance refresh][instance-refresh] to update the instances within the Auto Scaling group.
The newly launched instances will ingest logs to the OpenSearch cluster or the [Log Buffer](./index.md#log-buffer) layer.

## Amazon EKS cluster

The [EKS Cluster][eks] in Centralized Logging with OpenSearch refers to the Amazon Elastic Kubernetes Service (Amazon EKS) from which you want to collect pod logs. Centralized Logging with OpenSearch will guide you to deploy the log agent as a [DaemonSet][daemonset] or [Sidecar][sidecar] in the EKS Cluster.

!!! important "Important"

    * Centralized Logging with OpenSearch does not support sending logs in one EKS cluster to more than one Amazon OpenSearch domain at the same time.
    * Make sure your EKS cluster's VPC is connected to Amazon OpenSearch Service cluster's VPC so that log can be ingested. Refer to [VPC Connectivity][vpc-connectivity] for more details regarding approaches to connect VPCs.

1. Sign in to the Centralized Logging with OpenSearch Console.
2. In the left sidebar, under **Log Source**, choose **EKS Cluster**.
3. Choose **Import a Cluster**.
4. Choose the **EKS Cluster** where Centralized Logging with OpenSearch collects logs from.
5. (Optional) If you want to ingest logs from another account, select a [linked account](../link-account/index.md) from the **Account** dropdown to import an EKS log source from another account.
6. Select **DaemonSet** or **Sidecar** as log agent's deployment pattern.
7. Choose **Next**.
8. Specify the **Amazon OpenSearch** where Centralized Logging with OpenSearch sends the logs to.
9. Follow the guidance to establish a VPC peering connection between EKS's VPC and OpenSearch's VPC.
    - [Create and accept VPC peering connections](https://docs.aws.amazon.com/vpc/latest/peering/create-vpc-peering-connection.html)
    - [Update your route tables for a VPC peering connection](https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-routing.html)
    - [Update your security groups to reference peer VPC groups](https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-security-groups.html)
10. Choose **Next**.
11. Add tags if needed.
12. Choose **Create**.

## Amazon S3

The [S3][s3] in Centralized Logging with OpenSearch refers to the Amazon S3 from which you want to collect application logs stored in your bucket. You can choose **On-going** or **One-time** to create your ingestion job.

!!! important "Important"

    * On-going means that the ingestion job will run when a new file is delivered to the specified S3 location.
    * One-time means that the ingestion job will run at creation and only will run once to load all files in the specified location.

## Syslog

!!! important "Important"

    To ingest logs, make sure your Syslog generator/sender’s subnet is connected to Centralized Logging with OpenSearch’s **two** private subnets. Refer to [VPC Connectivity][vpc-connectivity] for more details about how to connect VPCs.

 You can use UDP or TCP custom port number to collect syslog in Centralized Logging with OpenSearch. Syslog refers to logs generated by Linux instance, routers or network equipment. For more information, see [Syslog][syslog] in Wikipedia.


## Add a new log source

After log analytics pipeline is created, it has one log source. You can choose to add more log sources into the log pipeline by following below steps:

1. Sign in to the Centralized Logging with OpenSearch Console.

2. In the left sidebar, under **Log Analytics Pipelines**, choose **Application Log**.
   
3. Choose the log pipeline by clicking its **ID**。

4. Choose **Create a source**. 

5. Follow the instructions in [Amazon EC2 instance group](#amazon-ec2-instance-group), [Amazon EKS cluster](#amazon-eks-cluster), [Amazon S3](#amazon-s3), or [Syslog](#syslog) to create a log source according to your need. 



[kds]: https://aws.amazon.com/kinesis/data-streams/
[ssm-agent]: https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-agent.html
[open-ssl]: https://www.openssl.org/source/
[eks]: https://docs.aws.amazon.com/eks/latest/userguide/what-is-eks.html
[s3]: https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html
[daemonset]: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
[sidecar]: https://kubernetes.io/docs/concepts/workloads/pods/#workload-resources-for-managing-pods
[syslog]: https://en.wikipedia.org/wiki/Syslog
[bucket]: https://docs.aws.amazon.com/AmazonS3/latest/userguide//UsingBucket.html
[supported-platforms]: https://docs.fluentbit.io/manual/installation/supported-platforms
[vpc-connectivity]: https://docs.aws.amazon.com/whitepapers/latest/building-scalable-secure-multi-vpc-network-infrastructure/vpc-to-vpc-connectivity.html
[ec2-user-data]: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html#user-data-shell-scripts
[instance-refresh]: https://docs.aws.amazon.com/autoscaling/ec2/userguide/asg-instance-refresh.html