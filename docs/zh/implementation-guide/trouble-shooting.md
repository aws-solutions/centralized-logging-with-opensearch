# 故障排查

以下介绍在使用 Log Hub 时可能遇到的错误或问题，以及解决方法。

## Error: Failed to assume service-linked role `arn:x:x:x:/AWSServiceRoleForAppSync`

出现此错误的原因是该账户从未使用过 [AWS AppSync](https://aws.amazon.com/appsync/) 服务。您可以再次部署解决方案的 CloudFormation 模板。当您遇到错误时，AWS 已经自动创建了角色。

您也可以前往 [AWS CloudShell](https://aws.amazon.com/cloudshell/) 或本地终端并运行以下 AWS CLI 命令以链接 AppSync 角色：

```
aws iam create-service-linked-role --aws-service-name appsync.amazonaws.com
```

## Error: Unable to add backend role

Log Hub 仅支持启用了[细粒度访问控制](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/fgac.html) 的 AOS 域。

您需要转到 AOS 控制台，并编辑 AOS 域的**访问策略**。

## Error：User xxx is not authorized to perform sts:AssumeRole on resource

![](../images/faq/assume-role-latency.png)

如果出现了次错误，请先确保您在[跨账户日志摄取设置](./link-account/index.md)中正确填写了所有信息。然后请等待大约1分钟左右后再重试。

Log Hub 使用了 [AssumeRole](https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html) 来列出或创建您成员账户中的 AWS 资源。 
这些 IAM 角色是在您[设置跨账户日志摄取](./link-account/index.md)时被创建的，他们需要几秒钟或者几分钟的时间才能生效。


## Error: PutRecords API responded with error='InvalidSignatureException'

Fluent-bit agent 报错 PutRecords API responded with error='InvalidSignatureException', message='The request signature we calculated does not match the signature you provided. Check your AWS Secret Access Key and signing method. Consult the service documentation for details.'

请重启 fluent-bit agent. 比如在 Amazon Linux2 的 EC2 中, 运行一下命令:
```commandline
sudo service fluent-bit restart
```

## Error: PutRecords API responded with error='AccessDeniedException'

Fluent-bit agent 在 EKS 集群中向 Kinesis 发送日志时汇报了 "AccessDeniedException" 错误。验证是否正确设置 IAM 角色信任关系。

使用 Log Hub 控制台:

1. 打开 Log Hub 控制台。
2. 在左侧边栏中的**日志源**下，选择**EKS 集群**。
3. 选择要检查的EKS集群
4. 点击**IAM 角色 ARN**， 这会在 AWS 控制台中打开 IAM 角色。
5. 选择**信任关系**选项卡以验证 OIDC 提供方, 服务账户命名空间以及条件是否设置正确。

您可以前往 Amazon EKS [IAM role configuration](https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts-technical-overview.html#iam-role-configuration) 获得更多信息

## 我的 CloudFormation 堆栈在更新堆栈时被卡在删除 `AWS::Lambda::Function` 资源上。如何解决这个问题？
![](../images/faq/cloudformation-stuck.png)
Lambda函数驻留在一个VPC中，你需要等待相关的ENI资源被删除。

## 重启 EC2 实例后，代理状态为离线，如何让它在实例重启时自动启动？

这种情况通常发生在你已经安装了日志代理，但是在你创建任何日志摄取之前实例发生重启。如果至少有一个日志摄取，日志代理将自动重新启动。如果你有一个日志摄取，但问题仍然存在，你可以使用 `systemctl status fluent-bit` 来检查实例内部的状态来检查它在实例中的状态。

## 我已经切换 global tenant。但是，我仍然无法在 OpenSearch 中找到仪表盘。

这通常是因为 Log Hub 在创建索引模板和仪表盘时收到了来自 OpenSearch 的 403 错误。可以通过按照下面的步骤手动重新运行 Lambda 函数来解决。

来到 Log Hub 控制台。

1. 打开 Log Hub 控制台，并找到有此问题的 AWS 服务日志管道。
2. 复制 ID 部分的前 5 个字符。例如，你应该从 ID `c169cb23-88f3-4a7e-90d7-4ab4bc18982c` 复制 `c169c`。
3. 转到 AWS控制台 > Lambda。粘贴在函数过滤器中。这将过滤所有为这个 AWS 服务日志摄取创建的 lambda 函数。
4. 点击名称包含 "OpenSearchHelperFn" 的 Lambda 函数。
5. 在**测试**标签中，用任何事件名称创建一个新事件。
6. 点击**测试**按钮来触发 Lambda，并等待 Lambda 函数的完成。
7. 仪表板应该可以在 OpenSearch 中使用。

## CentOS 7 安装日志代理方法

1. 登陆到 CentOS 7 机器中，手动安装 SSM Agent。

    ```bash
    sudo yum install -y http://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/linux_amd64/amazon-ssm-agent.rpm
    sudo systemctl enable amazon-ssm-agent
    sudo systemctl start amazon-ssm-agent
    ```
2. 来到 Log Hub 控制台的**实例组**面板，创建**实例组**，选择 centos 7 机器，点击**安装日志代理**，等待其状态为**离线**。
3. 登陆 centos7 手动安装 fluent-bit 1.9.3。

    ```bash
    export RELEASE_URL=${FLUENT_BIT_PACKAGES_URL:-https://packages.fluentbit.io}
    export RELEASE_KEY=${FLUENT_BIT_PACKAGES_KEY:-https://packages.fluentbit.io/fluentbit.key}

    sudo rpm --import $RELEASE_KEY
    cat << EOF | sudo tee /etc/yum.repos.d/fluent-bit.repo
    [fluent-bit]
    name = Fluent Bit
    baseurl = $RELEASE_URL/centos/VERSION_ARCH_SUBSTR
    gpgcheck=1
    repo_gpgcheck=1
    gpgkey=$RELEASE_KEY
    enabled=1
    EOF
    sudo sed -i 's|VERSION_ARCH_SUBSTR|\$releasever/\$basearch/|g' /etc/yum.repos.d/fluent-bit.repo
    sudo yum install -y fluent-bit-1.9.3-1

    # 修改配置文件
    sudo sed -i 's/ExecStart.*/ExecStart=\/opt\/fluent-bit\/bin\/fluent-bit -c \/opt\/fluent-bit\/etc\/fluent-bit.conf/g' /usr/lib/systemd/system/fluent-bit.service
    sudo systemctl daemon-reload
    sudo systemctl enable fluent-bit
    sudo systemctl start fluent-bit
    ```
4. 回到 Log Hub 控制台的**实例组**面板，等待 CentOS 7 机器状态为**在线**并继续创建实例组。