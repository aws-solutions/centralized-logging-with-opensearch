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

### Steps

1. Sign in to the Log Hub Console.
2. In the left sidebar, under **Log Source**, choose **Instance Group**.
3. Click the **Create an instance group** button.
4. In the **Settings** section, specify a group name.
5. In the **Instances** section, select the instance from which you want to collect logs. You can add up to 5 tags to filter instances.
6. Verify that all the selected instances "Pending Status" is **Online**.
7. (Optional) If the selected instances "Pending Status" are empty, click the **Install log agent** button and wait for "Pending Status" to become **Online**.
8. Choose **Create**.

!!! warning "Known issue"
    Use the Log Hub console to install Fluent Bit agent on Ubuntu instances in **Beijing (cn-north-1) and Ningxia (cn-northwest-1)** Region will cause installation error. The Fluent Bit assets cannot
    be downloaded successfully. You need to install the Fluent Bit agent by yourself.

## Import an EKS cluster as the log source

The [EKS Cluster][eks] in Log Hub refers to the Amazon Elastic Kubernetes Service (Amazon EKS) from which you want to collect pod logs. Log Hub will guide you to deploy the logging agent as a [DaemonSet][daemonset] or [Sidecar][sidecar] in the EKS Cluster.

!!! important "Important"

    Log Hub does not support sending logs in one EKS cluster to more than one Amazon OpenSearch domain at same time.

1. Sign in to the Log Hub Console.
2. In the left sidebar, under **Log Source**, choose **EKS Cluster**.
3. Click the **Import a Cluster** button.
4. Choose the **EKS Cluster** where Log Hub collects logs from.
5. Select **DaemonSet** or **Sidecar** as logging agent's deployment pattern. 
6. Choose **Next**.
7. Specify the **Amazon OpenSearch** where Log Hub sends the logs to.
8. Choose **Next**.
9. Add tags if needed.
10. Choose **Create**.

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