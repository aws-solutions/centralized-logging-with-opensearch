# 使用 Cognito User Pool

**部署时间**：大约 15 分钟

## 部署概述

使用以下步骤在 AWS 上部署此解决方案。

[步骤 1. 启动堆栈](#1)

[步骤 2. 登录控制台](#2)

## 步骤 1. 启动堆栈

此自动化 AWS CloudFormation 模板在 AWS 中部署日志通解决方案。

1. 登录 AWS 管理控制台并使用下面的按钮启动 `Centralized Logging with OpenSearch` AWS CloudFormation 模板。

    |                           | Launch in AWS Console                                        |
    | ------------------------- | ------------------------------------------------------------ |
    | 从新的 VPC 中部署           | [![启动堆栈](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CentralizedLogging.template){target=_blank} |
    | 从现有的 VPC 中部署         | [![启动堆栈](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CentralizedLoggingFromExistingVPC.template){target=_blank} |

2. 登录控制台后，模板在默认区域启动。要在不同的 AWS 区域中启动日志通 解决方案，请使用控制台导航栏中的区域选择器。

3. 在 **创建堆栈** 页面上，验证正确的模板 URL 显示在 **Amazon S3 URL** 文本框中，然后选择 **下一步**。

4. 在 **指定堆栈详细信息** 页面上，为您的解决方案堆栈分配一个名称。有关命名字符限制的信息，请参阅 *AWS Identity and Access Management 用户指南*中的 [IAM 和 STS 限制](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_iam-limits.html){target='_blank'}。

5. 在 **参数** 部分，查看模板的参数并根据需要进行修改

      - 如果从新的 VPC 中部署, 此解决方案使用以下默认值:

    |参数 |默认值 |说明 |
    | ---------- | ---------------- | ------------------------------------------------- ---------- |
    |Admin User Email | `<需要输入>` |指定管理员的电子邮件。此电子邮件地址用于接收访问日志通 控制台的临时密码。启动解决方案后，您可以直接在配置的 Cognito User Pool 中创建更多用户。 |

      - 如果从现有的 VPC 中部署, 此解决方案使用以下默认值:

    |参数 |默认值 |说明 |
    | ---------- | ---------------- | ------------------------------------------------- ---------- |
    |Admin User Email | `<需要输入>` |指定管理员的电子邮件。此电子邮件地址用于接收访问日志通 控制台的临时密码。启动解决方案后，您可以直接在配置的 Cognito User Pool 中创建更多用户。 |
    | VPC ID | `<需要输入>` | 选择现有的VPC。 |
    | Public Subnet IDs | `<需要输入>` | 从现有的 VPC 中选择2个公有子网。子网必须有指向 [Internet Gateway][IGW] 的路由。 |
    | Private Subnet IDs | `<需要输入>` | 从现有的 VPC 中选择2个私有子网。子网必须有指向 [NAT Gateway][NAT] 的路由。|

6. 选择**下一步**。

7. 在 **配置堆栈选项** 页面上，选择 **下一步**。

8. 在 **审核** 页面上，查看并确认设置。选中确认模板创建 AWS Identity and Access Management (IAM) 资源的复选框。

9. 选择 **创建堆栈** 部署堆栈。

您可以在 AWS CloudFormation 控制台的 **状态** 列中查看堆栈的状态。您应该会在大约 15 分钟内收到 **CREATE_COMPLETE** 状态。

## 步骤 2. 登录控制台

成功创建堆栈后，此解决方案会生成一个 CloudFront 域名，让您可以访问日志通 网页控制台。
同时，自动生成的临时密码（不包括密码结尾处的`.`）将发送到您的电子邮件地址。

1. 登录 [AWS CloudFormation 控制台](https://console.aws.amazon.com/cloudformation/){target='_blank'}。

2. 在 **堆栈** 页面上，选择解决方案的堆栈。

3. 选择 **输出** 选项卡并记录域名。

4. 使用网页浏览器打开 **WebConsoleUrl**，然后导航到登录页面。

5. 输入**电子邮件**和临时密码。

    a. 设置新的帐户密码。

    b. （可选）验证用于恢复帐户的电子邮件地址。

6. 验证完成后，系统打开日志通 网页控制台。

**后续操作**：登录日志通控制台之后，您可以 [导入 Amazon OpenSearch Service 域](../domains/import.md) 并构建日志分析管道。



[NAT]: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html
[IGW]: https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html