# 升级 Log Hub
**部署时间**: 大约 20 分钟

## 升级概述

使用以下步骤在 AWS 上升级此解决方案。

* [步骤 1. 更新 CloudFormation 堆栈](#1)
* [步骤 2. 触发 Lambda 以更新网页配置](#2-lambda)
* [步骤 3. 在 CloudFront 创建失效](#3-cloudfront)
* [步骤 4. 刷新网页控制台](#4)

## 步骤 1. 更新 CloudFormation 堆栈

1. 登录 [AWS CloudFormation 控制台](https://console.aws.amazon.com/cloudformation/){target='_blank'}。

2. 选择解决方案的主堆栈, 点击**更新**按钮。

3. 选择**替换当前模板**，根据您最初部署的类型在 **Amazon S3 URL** 中输入模板链接.

    | 类型                                            | 链接                                                         |
    | ----------------------------------------------| -------------------------------------------- |
    | 使用 Cognito User Pool, 并创建新 VPC      | `https://aws-gcr-solutions.s3.amazonaws.com/log-hub/latest/LogHub.template` |
    | 使用 Cognito User Pool, 并使用已有的 VPC | `https://aws-gcr-solutions.s3.amazonaws.com/log-hub/latest/LogHubFromExistingVPC.template` |
    | 使用 OpenID Connect, 并创建新 VPC    | `https://aws-gcr-solutions.s3.amazonaws.com/log-hub/latest/LogHubWithOIDC.template` |
    | 使用 OpenID Connect, 并使用已有的 VPC    | `https://aws-gcr-solutions.s3.amazonaws.com/log-hub/latest/LogHubFromExistingVPCWithOIDC.template` |

4. 在 **参数** 部分，查看模板的参数并根据需要进行修改。

6. 选择**下一步**。

7. 在 **配置堆栈选项** 页面上，选择 **下一步**。

8. 在 **审核** 页面上，查看并确认设置。选中确认模板创建 AWS Identity and Access Management (IAM) 资源的复选框。

9. 选择 **更新堆栈** 更新堆栈。

您可以在 AWS CloudFormation 控制台的 **状态** 列中查看堆栈的状态。您应该会在大约 15 分钟内收到 **UPDATE_COMPLETE** 状态。

## 步骤 2. 在 CloudFront 创建 CDN 刷新

CloudFront 已在其边缘节点缓存旧版本的 Log Hub 控制台。 我们需要在 CloudFront 控制台上创建一个失效以
强制删除缓存。 您必须在生成控制台配置文件后执行此操作。

1. 登录 [AWS CloudFront 控制台](https://console.aws.amazon.com/cloudfront/){target='_blank'}.

2. 选择并点击 Log Hub 的分配。 其说明类似于 `SolutionName - Web Console Distribution (RegionName)`。

3. 在**失效**界面，点击**创建失效**，并以 `/*` 路径创建一个实效。

## 步骤 3. 刷新网页控制台

现在您已完成所有升级步骤。 请点击浏览器中的**刷新**按钮。 您可以在 Log Hub 控制台右下角查看新版本号。

## Upgrade Notice

### EC2 中的应用日志
Log Hub 在 v1.1.0 之后更新了 IAM 策略。 如果您已创建 [应用程序日志管道](applications/create-applog-pipeline.md)
在 Log Hub V1.0.X 中，如果您想在 v1.1.0 或更高版本中创建新的应用程序日志摄取，您将收到一个升级通知弹窗：

![app-pipeline-upgrade-v1.0](../images/app-log/app-pipline-upgrade-v1.0.png)

单击 **升级** 按钮将您的应用程序日志管道升级到当前版本， 此升级不会影响您在 Log Hub V1.0.X 中创建的现有日志提取。 但是，请确保您在 [创建新的摄取](applications/nginx.md#step-2-create-an-application-log-ingestion) 之前已将 IAM 策略更新到 EC2 实例配置文件。

### EKS 中的应用日志
Log Hub 在 v1.1.0 之后更新了从 EKS 中摄取应用日志的[架构](./architecture.md#eks).
在 v1.1.0 之后, 在默认情况下，Log Hub 会将 EKS 中的应用日志直接写入到 OpenSearch 中。 此升级不会影响您在 Log Hub V1.0.X 中创建的现有日志提取 

比如, 您已经在 Log Hub v1.0.x 中创建了 EKS 的应用日志摄取，并且在 Log Hub v1.1.0 中创建了新的 EKS 应用日志摄取。
那么对于 v1.0.x 中创建的日志摄取将仍然通过 Kinesis Data Stream 把日志摄入 OpenSearch，对于 v1.1.0 中创建的日志摄取将直接发送到 OpenSearch。