# 概览

在部署解决方案之前，建议您先查看本指南中有关架构图和区域支持等信息，然后按照下面的说明配置解决方案并将其部署到您的账户中。

## 前提条件

检查所有的[考虑因素](../plan-deployment/considerations.md)，并确保您要部署解决方案的目标区域满足以下条件：

- 如果您启动时选择创建新的VPC，至少能有1个新的 VPC 空缺。
- 如果您启动时选择创建新的VPC，至少需要2个弹性 IP (EIP) 地址空缺。
- 至少能创建4个 S3 存储桶。

## 在 AWS 海外区域部署
日志通提供了两种方式来验证和登录日志通控制台。 Cognito 用户池在一些 AWS 区域
缺失（例如：香港）。 在这些区域，您需要按照说明使用 OpenID Connect 的方式启动解决方案。
有关受支持区域的更多信息，请参阅 [可部署区域](../plan-deployment/considerations.md)。

* [使用 Cognito User Pool 启动](./with-cognito.md)
* [使用 OpenID Connect 启动](./with-oidc.md)

## 在 AWS 中国区域部署
AWS 中国区域没有 Cognito User Pool，请按照以下说明在中国区域部署解决方案。

* [使用 OpenID Connect 启动](./with-oidc.md)
