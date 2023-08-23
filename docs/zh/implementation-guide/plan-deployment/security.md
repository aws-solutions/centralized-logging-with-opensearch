# 安全

在构建基于AWS基础设施的系统时，安全责任由您和AWS共同承担。这个[共享责任模型](https://aws.amazon.com/compliance/shared-responsibility-model/)
减轻了您的运维负担，因为AWS负责操作、管理和控制组件，包括主机操作系统、虚拟化层以及服务所在设施的物理安全。
有关AWS安全性的更多信息，请参阅[AWS云安全](http://aws.amazon.com/security/)。

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

## Amazon EC2

这个解决方案创建了一个基于[Nginx的代理](../getting-started/2.create-proxy.md)，它将允许您访问在VPC环境中预配的OpenSearch。Nginx是使用EC2实例托管的。我们建议您使用[AWS Systems Manager Patch Manager](https://docs.aws.amazon.com/systems-manager/latest/userguide/patch-manager.html)定期对这些实例进行打补丁。Patch Manager是AWS Systems Manager的一个功能，它自动处理管理节点的更新补丁过程。您可以选择仅显示缺少的补丁报告（扫描操作），或自动安装所有缺少的补丁（扫描和安装操作）。



