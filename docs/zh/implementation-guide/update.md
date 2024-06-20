# 升级
**升级时间**：大约 20 分钟

!!! warning "警告"

    以下升级文档仅支持日志通 (Centralized Logging with OpenSearch) 版本 2.x 及更高版本。

    如果您使用的是较旧的版本，如 v1.x 或任何版本的 Log Hub ，请参阅 [GitHub 上的讨论][github-discussion]{target='\_blank'}。

## 升级概述

使用以下步骤在 AWS 上升级此解决方案。

* [步骤 1. 更新 CloudFormation 堆栈](#1)
* [步骤 2. 刷新网页控制台](#2)

## 步骤 1. 更新 CloudFormation 堆栈

1. 登录 [AWS CloudFormation 控制台](https://console.aws.amazon.com/cloudformation/){target='_blank'}。

2. 选择解决方案的主堆栈, 点击**更新**按钮。

3. 选择**替换当前模板**，根据您最初部署的类型在 **Amazon S3 URL** 中输入模板链接.

    **_Cognito 用户池_**

   | 类型                     | 链接                                                                                                             |
   | ------------------------ | ---------------------------------------------------------------------------------------------------------------- |
   | 使用新 VPC 进行启动       | `https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CentralizedLogging.template`                |
   | 使用现有 VPC 进行启动     | `https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CentralizedLoggingFromExistingVPC.template` |

   **_OpenID Connect (OIDC)_**

   | 类型                             | 链接                                                                                                                    |
   | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
   | 在 AWS 区域中使用新 VPC 进行启动 | `https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CentralizedLoggingWithOIDC.template`                |
   | 在 AWS 区域中使用现有 VPC 进行启动 | `https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CentralizedLoggingFromExistingVPCWithOIDC.template` |
   | 在 AWS 中国区域中使用新 VPC 进行启动 | `https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CentralizedLoggingWithOIDC.template`                |
   | 在 AWS 中国区域中使用现有 VPC 进行启动 | `https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/CentralizedLoggingFromExistingVPCWithOIDC.template` |


4. 在 **参数** 部分，查看模板的参数并根据需要进行修改。

5. 选择**下一步**。

6. 在 **配置堆栈选项** 页面上，选择 **下一步**。

7. 在 **审核** 页面上，查看并确认设置。选中确认模板创建 AWS Identity and Access Management (IAM) 资源的复选框。

8. 选择 **更新堆栈** 更新堆栈。

您可以在 AWS CloudFormation 控制台的 **状态** 列中查看堆栈的状态。您应该会在大约 15 分钟内收到 **UPDATE_COMPLETE** 状态。

## 步骤 2. 刷新网页控制台

现在您已完成所有升级步骤。 请点击浏览器中的**刷新**按钮。

[github-discussion]: https://github.com/aws-solutions/centralized-logging-with-opensearch/discussions
