# 跨账号日志摄取

Log Hub 解决方案支持从同一区域的另一个 AWS 账户提取 AWS 服务日志和应用程序日志。
为此，您需要在成员账户中启动 CloudFormation 堆栈，并与主账户关联。

## 概念

- **主账户**: 您部署 Log Hub 控制台的帐户是主帐户。 OpenSearch 集群也必须在同一个帐户中。
- **成员账户**: 您拥有 AWS 服务或应用程序并希望从中提取日志的账户。

## 关联一个成员账户

### 步骤 1. 在成员账户中部署 CloudFormation 堆栈

1. 登录 Log Hub 控制台。
2. 在导航窗格中的 **资源** 下，选择 **跨账号摄取**。
3. 点击**链接一个帐户**按钮。 您可以在成员账户中找到部署 CloudFormation 堆栈的步骤。
4. 进入成员账户的 CloudFormation 控制台。
5. 单击 **创建堆栈** 按钮并选择 **使用新资源 (标准)**。
6. 在 **创建堆栈** 页面中，在 **Amazon S3 URL** 中输入 CloudFormation URL。 您可以在 Log Hub 控制台的 **链接一个账户** 页面上找到 URL。
7. 按照步骤创建 CloudFormation 堆栈。
8. 等待配置 CloudFormation 堆栈。

### Step 2. 关联成员账户

1. 进入 Log Hub 控制台。
2. 在导航面板的 **资源** 下，选择 **跨账户摄取**。
3. 在 **步骤 2** 中，使用上一步的 CloudFormation 输出填写参数。

    | 参数                                     | CloudFormation 输出     | 描述 |
    |----------------------------------------|-----------------------|---------------------- |
    | 帐户名称                                   | N/A                   | A friendly name of the member account.                                                                                |
    | 账户 ID                                   | N/A                   | The 12 digits AWS account ID.                                                                                         |
    | 跨账户角色 ARN                | CrossAccountRoleARN   | Log Hub will assume this role to operate resources in the member account.                                             |
    | FluentBit 代理安装文档  | AgentInstallDocument  | Log Hub will assume this SSM Document to install Fluent Bit agent on EC2 instances in the member account.             |
    | FluentBit 代理配置文档 | AgentConfigDocument   | Log Hub will assume this SSM Document to deliver Fluent Bit configuration to EC2 instances.                           |
    | 跨账户 S3 存储桶                | CrossAccountS3Bucket  | You can use the Log Hub console to enable some AWS Service logs and output to Amazon S3. The logs will be stored in this account. |
    | 跨账户堆栈 ID                 | CrossAccountStackId   | The CloudFormation stack ID in the member account.                                                                    |
    | 跨账户 KMS 密钥                  | CrossAccountKMSKeyARN | Log Hub will use the KMS key to encrypt SQS.                                                                          |

4. 点击**链接**按钮。

## 如何工作?

Log Hub 需要在成员账户中预置一些 AWS 资源来收集日志。 Log Hub 将采用 IAM 在成员账户中配置的角色以列出或创建资源。 成员堆栈中的 CloudFormation 堆栈具有最少的权限。
跨账户提取架构图请参考 [架构](../architecture.md)部分了解更多详情。