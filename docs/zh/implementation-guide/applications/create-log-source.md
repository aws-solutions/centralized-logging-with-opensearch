在收集应用程序日志之前，您需要先创建日志源。 日志通支持以下日志源：

* [Amazon EC2 实例组](#amazon-ec2-instance-group)
* [Amazon EKS 集群](#amazon-eks-cluster)
* [Amazon S3](#amazon-s3)
* [Syslog](#syslog)

有关详细信息，请参阅 [概念](./index.md#concepts)。

## Amazon EC2 实例组

一个实例组代表了一组 EC2 Linux 实例，这使得解决方案能够快速地将 [Log Config](./index.md#log-config) 与多个 EC2 实例关联。日志通 使用 [Systems Manager Agent(SSM Agent)][ssm-agent]{target="_blank"} 来安装/配置 Fluent Bit agent，并将日志数据发送到 [Kinesis Data Streams][kds]{target="_blank"}。

### 前提条件

Make sure the instances meet the following requirements:

- SSM Agent 安装在实例上。详情请参阅 [在 Linux 的 EC2 实例上安装 SSM Agent](https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-manual-agent-install.html)
- `AmazonSSMManagedInstanceCore` 策略与实例相关联。
- 已安装 [OpenSSL 1.1][open-ssl] 或更高版本。详情请参阅 [OpenSSL 安装](../resources/open-ssl.md)。
- 实例可以通过网络访问 AWS Systems Manager。
- 如果选择 Amazon Kinesis Data Streams 作为 [Log Buffer](./index.md#log-buffer), 实例可以通过网络访问 Amazon Kinesis Data Streams。
- 如果选择 Amazon S3 作为 [Log Buffer](./index.md#log-buffer), 实例可以通过网络访问 Amazon S3。
- 实例的操作系统支持使用 Fluent Bit。详情请参阅 [Supported Platform][supported-platforms]。

### (选项 1) 选择实例创建实例组

1. 登录日志通控制台。
2. 在左侧边栏中的 **日志源** 下，选择 **实例组**。
3. 单击**创建实例组**按钮。
4. 在 **设置** 部分，指定组名。
5. 在 **配置** 部分，选择 **实例** 选项，您最多可以添加 5 个标签来过滤实例。
6. 验证所有选中的实例**状态**都是**在线**。
7. （可选步骤）如果选中的实例“状态”为空，点击**安装日志代理**按钮，等待**状态**变为**在线**。
8. （可选步骤）如果需要跨账户摄取日志，在 **账户设置** 部分，选择一个[链接的 AWS 账户](../link-account/index.md)，就可以创建一个跨账户的实例组。
9. 选择**创建**。

!!! important "重要"
    在 **由光环新网运营的亚马逊云科技中国（北京）区域 (cn-north-1)和由西云数据运营的亚马逊云科技中国（宁夏）区域 (cn-northwest-1)** 区域的 Ubuntu 实例上使用日志通 控制台安装 Fluent Bit 代理会导致安装错误。 Fluent Bit 安装包不能
    下载成功。 您需要自己安装 Fluent Bit 代理。

### (选项 2) 选择 Auto Scaling 组创建实例组
当使用 Amazon EC2 Auto Scaling 组创建实例组时，将会生成一个shell 脚本， 您需要添加到 [EC2 User Data][ec2-user-data]。

1. 登录日志通控制台。
2. 在左侧边栏中的 **日志源** 下，选择 **实例组**。
3. 单击**创建实例组**按钮。
4. 在 **设置** 部分，指定组名。
5. 在 **配置** 部分，选择 **Auto Scaling 组** 选项。
6. 在 **Auto Scaling 组** 部分, 选择要从中收集日志的Auto Scaling组。
7. （可选步骤）如果需要跨账户摄取日志，在 **账户设置** 部分，选择一个[链接的 AWS 账户](../link-account/index.md)，就可以创建一个跨账户的实例组。
8. 选择**创建**。 使用 Instance Group 创建 Log Ingestion 后，您可以在详细信息页面中找到生成的 Shell Script。
9. 复制 shell 脚本并更新 Auto Scaling 组的 [启动配置](https://docs.aws.amazon.com/autoscaling/ec2/userguide/launch-configurations.html) 或 [启动模板](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-launch-templates.html)。如果需要，shell 脚本将自动安装 Fluent Bit、SSM 代理，并下载 Fluent Bit 配置。
10. 一旦您更新了启动配置或启动模板，您需要启动 [instance refresh] [instance-refresh] 来更新 Auto Scaling 组中的实例。
新启动的实例会将日志提取到 OpenSearch 集群或 [Log Buffer](./index.md#日志缓冲区log-buffer) 层。

## Amazon EKS cluster

日志通中的 [EKS Cluster][eks] 是指您要从中收集 pod 日志的 Amazon Elastic Kubernetes Service (Amazon EKS)。日志通将指导您将日志记录代理部署为 EKS 集群中的 [DaemonSet][daemonset] 或 [Sidecar][sidecar]。

!!! important "重要"

    * 日志通不支持将一个 EKS 集群中的日志同时发送到多个 Amazon OpenSearch 域。
    * 确保 EKS 集群的 VPC 已连接到 Amazon OpenSearch Service 集群的 VPC，以进行日志摄取。有关连接 VPC 的方法的详细信息，请参考 [VPC Connectivity][vpc-connectivity]。 

1. 登录日志通控制台。
2. 在左侧边栏中的 **日志源** 下，选择 **EKS Cluster**。
3. 单击**导入集群**按钮。
4. 选择日志通 从中收集日志的 **EKS 集群**。（可选步骤）如果需要跨账户摄取日志，在 **账户** 部分，选择一个[链接的 AWS 账户](../link-account/index.md)，就可以导入一个其他账户的 EKS 集群。
5. 选择 **DaemonSet** 或 **Sidecar** 作为日志代理的部署模式。
6. 选择**下一步**。
7. 指定日志通 将日志发送到的 **Amazon OpenSearch**。
8. 按照以下步骤建立 EKS 和 OpenSearch 之间的 VPC 对等连接。
    - [创建并接受 VPC 对等连接](https://docs.aws.amazon.com/vpc/latest/peering/create-vpc-peering-connection.html)
    - [为 VPC 对等连接更新路由表](https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-routing.html)
    - [更新您的安全组以引用对等 VPC 组](https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-security-groups.html)
9. 选择**下一步**。
10. 如果需要，添加标签。
11. 选择**创建**。

## Amazon S3

[S3][s3] 在日志通中指的是您想要从中收集存储在您桶中的应用日志的 Amazon S3。您可以选择 **持续加载** 或 **一次性加载** 来创建您的导入任务。

!!! important "重要"

    * 持续加载 表示当新文件传送到指定的 S3 位置时，导入作业将运行。
    * 一次性加载 表示导入工作将在创建时运行，并且只会运行一次以加载指定位置中的所有文件。


## Syslog

!!! important "重要"

    请确保您的 Syslog 生成器/发送者的子网连接到日志通 的**两个**私有子网，以便可以提取日志。 有关连接 VPC 的方法的更多详细信息，请参阅 [VPC Connectivity][vpc-connectivity]。

您可以使用自定义端口号的 UDP 或 TCP 协议在日志通中收集syslog。Syslog 是指Linux实例、路由器或网络设备产生的日志。了解更多信息，请参阅 Wikipedia 的 [Syslog][syslog]。


## 添加新的日志源

日志分析管道创建后，就有一个日志源。 您可以按照以下步骤选择将更多日志源添加到日志管道中：

1. 登录到日志通控制台。

2. 左侧边栏中， 在 **Log Analytics Pipelines**, 选择 **Application Log**。
   
3. 通过单击其来选择日志管道的 **ID**。

4. 选择 **Create a source**。

5. 按照 [Amazon EC2 instance group](#amazon-ec2-instance-group), [Amazon EKS cluster](#amazon-eks-cluster), [Amazon S3](#amazon-s3), or [Syslog](#syslog) 的操作指南，根据您的需要创建日志源。 



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