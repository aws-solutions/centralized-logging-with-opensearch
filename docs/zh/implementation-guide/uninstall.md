# 卸载解决方案

!!! Warning "警告"
    如果在删除日志管道之前删除日志通主堆栈，您将遇到 IAM 角色丢失错误。 日志通控制台启动额外的 CloudFormation 堆栈以摄取日志。 如果要卸解决方案，我们建议您先删除日志管道（包括 AWS 服务日志管道和应用程序日志管道）。

## 步骤 1. 删除应用日志管道

!!! important "重要"
    请在删除应用日志管道前，删除该日志管道内所有的日志摄取。

1. 登陆日志通 控制台，在左侧边栏中，选择 **应用日志**。
2. 选择一条应用日志管道，查看详情。
3. 在**摄取**选项卡中, 删除该日志管道中所有的日志摄取。
4. 卸载/停用 Fluent Bit 代理。
    - EC2 (可选): 从 EC2 实例组中删除日志提取后。 Fluent Bit 将自动停止发送日志，您可以选择在您的实例中停止 Fluent Bit。 以下是停止 Fluent Bit 代理的命令。
          ```commandline
             sudo service fluent-bit stop
             sudo systemctl disable fluent-bit.service
          ```
    - EKS DaemonSet (必需): 如果您选择使用 DaemonSet 部署 Fluent Bit 代理，则需要删除您的 Fluent Bit 代理。 否则，代理将继续将日志发送到日志通 管道。
          ```commandline
             kubectl delete -f ~/fluent-bit-logging.yaml
          ```
    - EKS SideCar（必需）: 请在您的 `.yaml` 文件中删除 Fluent Bit，并重启您的应用.
5. 删除该应用日志管道。
6. 对于所有的日志管道，请重复第2步至第5步来删除所有的日志管道。


## 步骤 2. 删除 AWS 服务日志管道

1. 登录日志通 控制台, 在左侧边栏中，选择 **AWS 服务日志**。
2. 请逐一删除您创建的 AWS 服务日志管道。

## 步骤 3. 清除导入的 Amazon OpenSearch Service 域

1. [删除访问代理](domains/proxy.md#_4)。
2. [删除日志通 创建的告警](domains/alarms.md#_3)。
3. 删除日志通 的 VPC 和 Amazon OpenSearch Service 域的 VPC 建立的对等链接。
    - 前往 [AWS VPC 控制台](https://console.aws.amazon.com/vpc/)。
    - 在左侧边栏中点击 **对等连接**。
    - 找到并删除日志通 的 VPC 和 Amazon OpenSearch Service 域的 VPC 建立的对等链接。如果您在导入 OpenSearch 域时没有使用“自动”模式，您可能没有对等连接。
4. （可选步骤）删除导入的 Amazon OpenSearch Service 域。 (从日志通 中删除 Amazon OpenSearch Service 域不会影响到 AWS 账户中的 Amazon OpenSearch Service 域。)

## 步骤 4. 删除解决方案堆栈 

1. 访问 [CloudFormation 控制台](https://console.aws.amazon.com/cloudfromation/)。
2. 找到解决方案的堆栈。
3. (可选) 删除解决方案创建的 S3 桶。

    !!! important "重要"
         包含 **LoggingBucket** 字段的 S3 桶是日志通 创建的日志桶. 您可能已经在摄取 AWS 服务日志时启用了一些服务日志，并将日志收集到该 S3 桶中。 删除该 S3 桶可能会导致一些服务日志发送失败。

    - 找到日志通解决方案的 CloudFormation 堆栈，点击 **资源** 选项卡。
    - 在搜索栏中输入 `AWS::S3::Bucket`。这样能显示所有解决方案创建的 S3 桶, S3 桶的名字可以在 **Physical ID** 这一栏中看到。
    - 登陆 AWS 管理控制台，并前往 S3 服务。通过 S3 桶的名字找到对应的 S3 桶。 **清空**并**删除**该 S3 桶.

4. 删除解决方案的堆栈。