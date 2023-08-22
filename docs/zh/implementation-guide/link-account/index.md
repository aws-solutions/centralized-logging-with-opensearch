# 跨账户日志摄取

日志通支持从同一区域的另一个 AWS 账户提取 AWS 服务日志和应用程序日志。
为此，您需要在成员账户中启动 CloudFormation 堆栈，并与主账户关联。

## 概念

- **主账户**: 您部署日志通控制台的帐户是主帐户。 OpenSearch 集群也必须在同一个帐户中。
- **成员账户**: 您拥有 AWS 服务或应用程序并希望从中提取日志的账户。

成员账户中的 CloudFormation 堆栈具有最少的权限。日志通需要在成员账户中预置一些 AWS 资源来收集日志，并将采用 IAM 在成员账户中配置的角色以列出或创建资源。
请参考 [架构](../architecture.md)部分了解更多详情。

## 关联一个成员账户

### 步骤 1. 在成员账户中部署 CloudFormation 堆栈

1. 登录日志通控制台。
2. 在导航窗格中的 **资源** 下，选择 **跨账号摄取**。
3. 点击**链接一个帐户**按钮。 您可以在成员账户中找到部署 CloudFormation 堆栈的步骤。

    !!! note "注意"

        您需要拷贝 template URL，以备后面使用。

4. 进入成员账户的 CloudFormation 控制台。
5. 单击 **创建堆栈** 按钮并选择 **使用新资源 (标准)**。
6. 在 **创建堆栈** 页面中，在 **Amazon S3 URL** 中输入 CloudFormation URL。 您可以在日志通控制台的 **成员账户** 页面上找到 URL。
7. 按照步骤创建 CloudFormation 堆栈，并等待配置 CloudFormation 堆栈完成。
8. 点击进入 **输出** 页签，查看将用于**步骤 2**的相关参数。

### 步骤 2. 关联成员账户

1. 进入日志通控制台。
2. （可选）在导航面板的 **资源** 下，选择 **跨账户摄取**。
3. 在 **步骤 2** 中，使用上一步的 CloudFormation 输出填写参数。

    | 参数                                     | CloudFormation 输出                      | 描述           |
    |-----------------------------------------|----------------------------------------|--------------|
    | Account Name                            | N/A                                    | 成员账号的名称。  |
    | Account ID                              | N/A                                    | 12位 AWS 数字账号。 |
    | Cross Account Role ARN                  | CrossAccountRoleARN                    |日志通 将通过消费这个角色来操作关联账号中的资源。|
    | FluentBit Agent Installation Document   | AgentInstallDocument                   |日志通 将使用此 SSM 文档在成员账户中的 EC2 实例上安装 Fluent Bit 代理。 |
    | FluentBit Agent Configuration Document  | AgentConfigDocument                    |日志通 将使用此 SSM 文档将 Fluent Bit 配置下发给 EC2 实例。 |
    | Cross Account S3 Bucket                 | CrossAccountS3Bucket                   | 您可以使用日志通 控制台启用一些 AWS 服务日志并将它们输出到 Amazon S3。 日志将存储在此帐户中。 |
    | Cross Account Stack ID                  | CrossAccountStackId                    | 成员账户中的 CloudFormation 堆栈 ID。|
    | Cross Account KMS Key                   | CrossAccountKMSKeyARN                  |日志通 将使用密钥管理服务 (KMS) 密钥来加密简单队列服务 (SQS)。 |

4. 点击**链接**按钮。

