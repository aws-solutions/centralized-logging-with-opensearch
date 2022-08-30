# 日志源

在收集应用程序日志之前，您需要先创建日志源。 Log Hub 支持以下日志源：

* EC2 实例组
* EKS 集群
* Amazon S3

有关详细信息，请参阅 [概念](./index.md)。

## 创建一个 EC2 实例组作为日志源

实例组是指托管相同应用程序的一组 EC2 Linux 实例。这是一种将 [Log Config](./index.md#log-config) 与一组 EC2 实例相关联的方法。 Log Hub 使用 [Systems Manager Agent(SSM Agent)][ssm-agent]{target="_blank"} 安装和配置 Fluent Bit 代理，并将日志数据发送到 [Kinesis Data Streams][kds]{target="_blank “}。

### 前提条件

确保实例满足以下要求：

- SSM Agent 安装在实例上。详情请参阅 [在 Linux 的 EC2 实例上安装 SSM Agent](https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-manual-agent-install.html)
- `AmazonSSMManagedInstanceCore` 策略与实例相关联。
- 已安装 [OpenSSL 1.1][open-ssl] 或更高版本。详情请参阅 [OpenSSL 安装](../resources/open-ssl.md)。
- 实例可以通过网络访问 AWS Systems Manager。
- 实例可以通过网络访问 Amazon Kinesis Data Streams。

### 步骤

1. 登录 Log Hub 控制台。
2. 在左侧边栏中的 **日志源** 下，选择 **实例组**。
3. 单击**创建实例组**按钮。
4. 在 **设置** 部分，指定组名。
5. 在 **实例** 部分中，选择要从中收集日志的实例。 您最多可以添加 5 个标签来过滤实例。
6. 验证所有选中的实例**状态**都是**在线**。
7. （可选步骤）如果选中的实例“状态”为空，点击**安装日志代理**按钮，等待**状态**变为**在线**。
8. （可选步骤）如果需要跨账户摄取日志，在 **账户设置** 部分，选择一个[链接的 AWS 账户](../link-account/index.md)，就可以创建一个跨账户的实例组。
9. 选择**创建**。

!!! warning "已知问题"
    在 **北京 (cn-north-1)和宁夏 (cn-northwest-1)** 区域的 Ubuntu 实例上使用 Log Hub 控制台安装 Fluent Bit 代理会导致安装错误。 Fluent Bit 安装包不能
    下载成功。 您需要自己安装 Fluent Bit 代理。

## 导入 EKS 集群作为日志源

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

## 使用 Amazon S3 作为日志源
!!! note

    Amazon S3 存储桶必须与您的 Log Hub 区域位于同一区域。

Log Hub 中的 [Amazon S3 bucket][bucket] 是指存储您的应用程序日志的存储桶。 您无需从 Log Hub 控制台创建特定的日志源。


[kds]: https://aws.amazon.com/kinesis/data-streams/
[ssm-agent]: https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-agent.html
[open-ssl]: https://www.openssl.org/source/
[eks]: https://docs.aws.amazon.com/eks/latest/userguide/what-is-eks.html
[daemonset]: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
[sidecar]: https://kubernetes.io/docs/concepts/workloads/pods/#workload-resources-for-managing-pods
[bucket]: https://docs.aws.amazon.com/AmazonS3/latest/userguide//UsingBucket.html