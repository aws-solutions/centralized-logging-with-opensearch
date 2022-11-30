# 日志源

在收集应用程序日志之前，您需要先创建日志源。 Log Hub 支持以下日志源：

* EC2 实例组
* EKS 集群
* Amazon S3

有关详细信息，请参阅 [概念](./index.md#concepts)。

## Amazon EC2 实例组

实例组是指托管相同应用程序的一组 EC2 Linux 实例。这是一种将 [Log Config](./index.md#log-config) 与一组 EC2 实例相关联的方法。 Log Hub 使用 [Systems Manager Agent(SSM Agent)][ssm-agent]{target="_blank"} 安装和配置 Fluent Bit 代理，并将日志数据发送到 [Kinesis Data Streams][kds]{target="_blank “}。

### 前提条件

确保实例满足以下要求：

- SSM Agent 安装在实例上。详情请参阅 [在 Linux 的 EC2 实例上安装 SSM Agent](https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-manual-agent-install.html)
- `AmazonSSMManagedInstanceCore` 策略与实例相关联。
- 已安装 [OpenSSL 1.1][open-ssl] 或更高版本。详情请参阅 [OpenSSL 安装](../resources/open-ssl.md)。
- 实例可以通过网络访问 AWS Systems Manager。
- 如果选择 Amazon Kinesis Data Streams 作为 [Log Buffer](./index.md#log-buffer), 实例可以通过网络访问 Amazon Kinesis Data Streams。
- 如果选择 Amazon S3 作为 [Log Buffer](./index.md#log-buffer), 实例可以通过网络访问 Amazon S3。
- 实例的操作系统支持使用 Fluent Bit。详情请参阅 [Supported Platform][supported-platforms]。


### (选项 1) 选择实例创建实例组

1. 登录 Log Hub 控制台。
2. 在左侧边栏中的 **日志源** 下，选择 **实例组**。
3. 单击**创建实例组**按钮。
4. 在 **设置** 部分，指定组名。
5. 在 **配置** 部分，选择 **实例** 选项，您最多可以添加 5 个标签来过滤实例。
6. 验证所有选中的实例**状态**都是**在线**。
7. （可选步骤）如果选中的实例“状态”为空，点击**安装日志代理**按钮，等待**状态**变为**在线**。
8. （可选步骤）如果需要跨账户摄取日志，在 **账户设置** 部分，选择一个[链接的 AWS 账户](../link-account/index.md)，就可以创建一个跨账户的实例组。
9. 选择**创建**。

!!! warning "已知问题"
    在 **北京 (cn-north-1)和宁夏 (cn-northwest-1)** 区域的 Ubuntu 实例上使用 Log Hub 控制台安装 Fluent Bit 代理会导致安装错误。 Fluent Bit 安装包不能
    下载成功。 您需要自己安装 Fluent Bit 代理。

### (选项 2) 选择 Auto Scaling 组创建实例组
当使用 Amazon EC2 Auto Scaling 组创建实例组时，将会生成一个shell 脚本， 您需要添加到 [EC2 User Data][ec2-user-data]。

1. 登录 Log Hub 控制台。
2. 在左侧边栏中的 **日志源** 下，选择 **实例组**。
3. 单击**创建实例组**按钮。
4. 在 **设置** 部分，指定组名。
5. 在 **配置** 部分，选择 **Auto Scaling 组** 选项。
6. 在 **Auto Scaling 组** 部分, 选择要从中收集日志的Auto Scaling组.
7. 可选步骤）如果需要跨账户摄取日志，在 **账户设置** 部分，选择一个[链接的 AWS 账户](../link-account/index.md)，就可以创建一个跨账户的实例组。
8. 选择**创建**。 

使用 Instance Group 创建 Log Ingestion 后，您可以在详细信息页面中找到生成的 Shell Script。
复制 shell 脚本并更新 Auto Scaling 组的 [启动配置](https://docs.aws.amazon.com/autoscaling/ec2/userguide/launch-configurations.html) 或 [启动模板](https //docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-launch-templates.html）。
如果需要，shell 脚本将自动安装 Fluent Bit、SSM 代理，并下载 Fluent Bit 配置。一旦您更新了启动配置或启动模板，您需要启动 [instance refresh] [instance-refresh] 来更新 Auto Scaling 组中的实例。
新启动的实例会将日志提取到 OpenSearch 集群或 [Log Buffer](./index.md#log-buffer) 层。

## Amazon EKS 集群

Log Hub 中的 [EKS Cluster][eks] 是指您要从中收集 pod 日志的 Amazon Elastic Kubernetes Service (Amazon EKS)。 Log Hub 将指导您将日志记录代理部署为 EKS 集群中的 [DaemonSet][daemonset] 或 [Sidecar][sidecar]。

!!! important "重要"

    * Log Hub 不支持将一个 EKS 集群中的日志同时发送到多个 Amazon OpenSearch 域。
    * 如果作为日志源的 EKS 和 发送目的地的 OpenSearch 不在同一个 VPC 中，必须要建立 VPC 对等连接。

1. 登录 Log Hub 控制台。
2. 在左侧边栏中的 **日志源** 下，选择 **EKS Cluster**。
3. 单击**导入集群**按钮。
4. 选择 Log Hub 从中收集日志的 **EKS 集群**。（可选步骤）如果需要跨账户摄取日志，在 **账户** 部分，选择一个[链接的 AWS 账户](../link-account/index.md)，就可以导入一个其他账户的 EKS 集群。
5. 选择 **DaemonSet** 或 **Sidecar** 作为日志代理的部署模式。
6. 选择**下一步**。
7. 指定 Log Hub 将日志发送到的 **Amazon OpenSearch**。
8. 按照以下步骤建立 EKS 和 OpenSearch 之间的 VPC 对等连接。
    - [创建并接受 VPC 对等连接](https://docs.aws.amazon.com/vpc/latest/peering/create-vpc-peering-connection.html)
    - [为 VPC 对等连接更新路由表](https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-routing.html)
    - [更新您的安全组以引用对等 VPC 组](https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-security-groups.html)
9. 选择**下一步**。
10. 如果需要，添加标签。
11. 选择**创建**。


## Syslog 
!!! important "重要"

    请确保您的 Syslog 生成器/发送者的子网连接到 Log Hub 的**两个**私有子网，以便可以提取日志。 有关连接 VPC 的方法的更多详细信息，请参阅 [VPC Connectivity][vpc-connectivity]。

[Syslog][syslog]是指Linux实例、路由器或网络设备产生的日志，您可以使用自定义端口号的 UDP 或 TCP 协议在Log Hub中收集syslog。

[kds]: https://aws.amazon.com/kinesis/data-streams/
[ssm-agent]: https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-agent.html
[open-ssl]: https://www.openssl.org/source/
[eks]: https://docs.aws.amazon.com/eks/latest/userguide/what-is-eks.html
[daemonset]: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
[sidecar]: https://kubernetes.io/docs/concepts/workloads/pods/#workload-resources-for-managing-pods
[bucket]: https://docs.aws.amazon.com/AmazonS3/latest/userguide//UsingBucket.html
[syslog]: https://en.wikipedia.org/wiki/Syslog
[supported-platforms]: https://docs.fluentbit.io/manual/installation/supported-platforms
[vpc-connectivity]: https://docs.aws.amazon.com/whitepapers/latest/building-scalable-secure-multi-vpc-network-infrastructure/vpc-to-vpc-connectivity.html
[ec2-user-data]: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html#user-data-shell-scripts
[instance-refresh]: https://docs.aws.amazon.com/autoscaling/ec2/userguide/asg-instance-refresh.html