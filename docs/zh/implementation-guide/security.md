# 安全

当您在 AWS 基础设施上构建系统时，安全责任由您和 AWS 共同承担。因为 AWS 运营、管理和控制包括主机在内的组件
操作系统、虚拟化层以及服务运行所在设施的物理安全性， 这个[共享模型](https://aws.amazon.com/compliance/shared-responsibility-model/)将
减轻您的运营负担。 有关 AWS 安全性的更多信息，请参阅 [AWS 云安全性](http://aws.amazon.com/security/)。

## IAM 角色

AWS Identity and Access Management (IAM) 角色允许客户分配精细的访问策略和权限
到 AWS 云上的服务和用户。此解决方案创建授予解决方案的 AWS Lambda 函数的 IAM 角色，
AWS AppSync 和 Amazon Cognito 访问以创建区域资源。

## 安全组
此解决方案中创建的安全组旨在控制和隔离解决方案之间的网络流量成分。我们建议您查看安全组并在部署后根据需要进一步限制访问。

## Amazon CloudFront

此解决方案将部署托管在 Amazon Simple Storage Service (Amazon S3) 存储桶中的 Web 控制台。为了帮助减少
延迟并提高安全性，该解决方案包括具有原始访问身份的 Amazon CloudFront 分配，
这是一个 CloudFront 用户，提供对解决方案的网站存储桶内容的公共访问。 有关更多信息，请参阅
[使用源访问身份限制对 Amazon S3 内容的访问](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3 .html)。