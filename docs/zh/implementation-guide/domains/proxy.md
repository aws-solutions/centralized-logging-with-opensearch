# 访问代理

默认情况下，无法从 Internet 访问 VPC 内的 Amazon OpenSearch Service 域。日志通创建了一个高可用的 [Nginx cluster][nginx]，它允许您从 Internet 访问 OpenSearch Dashboards。或者，您可以选择[使用 SSH 隧道][ssh]访问 Amazon OpenSearch Service 域。

本节介绍代理堆栈的架构以及以下内容：

1. [创建代理](#_3)
2. [创建关联的DNS记录](#dns)
3. [通过代理访问Amazon OpenSearch Service](#aos)
4. [删除代理](#_4)

## 架构
日志通创建一个 [Auto Scaling Group (ASG)][asg] 和一个 [Application Load Balancer (ALB)][alb]。

![代理堆栈架构](../../images/architecture/proxy.svg)

工作流程如下：

1. 用户访问代理的自定义域，该域需要通过DNS服务解析（例如，使用AWS上的Route 53）。

2. DNS 服务将流量路由到面向 Internet 的 ALB。

3. ALB 将流量分配到 ASG 内 Amazon EC2 上运行的后端 Nginx 服务器。

4. Nginx 服务器将请求重定向到 OpenSearch Dashboards。

5. （可选步骤）如果代理的 VPC 与 OpenSearch 服务不同，则需要 VPC 对等互连。

## 创建代理
您可以使用日志通控制台或通过部署独立的 CloudFormation 堆栈来创建基于 Nginx 的代理。

**前提条件**

- 确保 VPC 中的 Amazon OpenSearch Service **域** 可用。
- 在 [Amazon Certificate Manager (ACM)][acm] 中创建或上传域关联的**SSL 证书**。
- 确保您拥有 EC2 私钥 (.pem) 文件。

### 使用日志通控制台
1. 登录日志通控制台。
2. 在导航窗格中的 **集群**，选择 **OpenSearch 域**。
3. 从表中选择域。
4. 在 **基本配置** 部分，在 **访问代理** 标签处选择 **开启**。

    !!! note "注意"
         启用访问代理后，访问代理的链接将可用。

5. 在**创建访问代理**页面的**公共访问代理**部分，为**公共子网**选择至少 2 个子网。您可以选择 2 个名为`LogHubVPC/DefaultVPC/publicSubnet`的公有子网，它们是由日志通 默认创建的。
6. 在**公共安全组**中选择 ALB 的安全组。您可以选择一个名为 `ProxySecurityGroup` 的安全组，该安全组由日志通 默认创建。
7. 输入**域名**。
8. 选择与域名关联的**Load Balancer SSL Certificate**。
9. 选择**Nginx 实例密钥名称**。
10. 选择**创建**。

### 使用 CloudFormation 堆栈
此自动化 AWS CloudFormation 模板在 AWS 云中部署 *日志通- Nginx 访问代理* 解决方案。

1. 登录 AWS 管理控制台并选择按钮以启动 AWS CloudFormation 模板。

    [![启动堆栈](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/new?templateURL=https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/NginxForOpenSearch.template){target=_blank}

    您也可以[下载模板](https://{{ bucket }}.s3.amazonaws.com/{{ solution }}/{{ version }}/NginxForOpenSearch.template) 开始部署。

2. 要在不同的 AWS 区域中启动堆栈，请使用控制台导航栏中的区域选择器。

3. 在 **创建堆栈** 页面上，验证正确的模板 URL 显示在 **Amazon S3 URL** 文本框中，然后选择 **下一步**。

4. 在 **指定堆栈详细信息** 页面上，为您的堆栈分配一个名称。

5. 在 **参数** 部分，查看模板的参数并根据需要进行修改。此解决方案使用以下默认值。

    |参数 |默认 |说明 |
    | ---------- | ---------------- | -------------------------------------------------- ---------- |
    | VPCId | `<需要输入>` |用于部署 Nginx 代理资源的 VPC，例如 `vpc-bef13dc7`。 |
    | PublicSubnetIds | `<需要输入>` |部署 ELB 的公共子网。您需要至少选择两个公有子网，例如，`subnet-12345abc，subnet-54321cba`。 |
    | PrivateSubnetIds | `<需要输入>` |部署 Nginx 实例的私有子网。您需要至少选择两个私有子网，例如，`subnet-12345abc，subnet-54321cba`。 |
    | KeyName | `<需要输入>` | Nginx 实例的 PEM 密钥名称。 |
    | NginxSecurityGroupId | `<需要输入>` |与 Nginx 实例关联的安全组。安全组必须允许来自 ELB 安全组的访问。 |
    | ProxyInstanceType | t3.large | OpenSearch代理实例的类型。例如t3.micro |
    | ProxyInstanceNumber | 2 | OpenSearch代理实例的数量。例如1到4 |
    | Endpoint | `<需要输入>` | OpenSearch 端点，例如，`vpc-your_opensearch_domain_name-xcvgw6uu2o6zafsiefxubwuohe.us-east-1.es.amazonaws.com`。 |
    | EngineType | OpenSearch | OpenSearch 的引擎类型。选择 OpenSearch 或 Elasticsearch。 |
    | CognitoEndpoint | `<可选>` | OpenSearch 域的 Cognito 用户池端点 URL，例如，`mydomain.auth.us-east-1.amazoncognito.com`。如果您的 OpenSearch 域不是通过 Cognito 用户池认证，请留空。 |
    | ELBSecurityGroupId | `<需要输入>` |与 ELB 关联的安全组，例如，`sg-123456`。 |
    | ELBDomain | `<需要输入>` | ELB的自定义域名，例如`dashboard.example.com`。 |
    | ELBDomainCertificateArn | `<需要输入>` |与 ELBDomain 关联的 SSL 证书 ARN。证书必须从 [Amazon Certificate Manager (ACM)][acm] 创建。 |
    | ELBAccessLogBucketName | `<需要输入>` | 代理ELB的访问日志存储桶的名称。 |
    | SsmParameterValueawsserviceamiamazonlinuxlatestamzn2amihvmx8664gp2C96584B6F00A464EAD1953AFF4B05118Parameter | /aws/service/ami-amazon-linux-latest/amzn2-ami-hvm-x86_64-gp2 | 代理实例AMI的SSM参数。大多数情况下可以使用默认值。 |

6. 选择**下一步**。

7. 在 **配置堆栈选项** 页面上，选择 **下一步**。

8. 在 **审核** 页面上，查看并确认设置。选中确认模板创建 AWS Identity and Access Management (IAM) 资源的复选框。

9. 选择 **创建堆栈** 部署堆栈。

您可以在 AWS CloudFormation 控制台的 **状态** 列中查看堆栈的状态。您应该会在大约 15 分钟内收到 **CREATE_COMPLETE** 状态。

### 代理实例推荐机型选择

下表列出了基于并行访问的用户数推荐的代理实例配置。您可以结合实际的应用场景进行具体的实例数量和机型的调整。

| 并行访问的用户数 | 代理实例机型 | 代理实例数量 |
    | ------| ---------------------------- | ------------ |
    | 4     | t3.nano                      | 1            |
    | 6     | t3.micro                     | 1            |
    | 8     | t3.nano                      | 2            |
    | 10    | t3.small                     | 1            |
    | 12    | t3.micro                     | 2            |
    | 20    | t3.small                     | 2            |
    | 25    | t3.large                     | 1            |
    | 50+    | t3.large                     | 2            |

## 创建关联的 DNS 记录
配置代理基础架构后，您需要在 DNS 解析器中创建关联的 DNS 记录。 下面介绍如何找到 ALB 域，然后创建指向该域的 CNAME 记录。

1. 登录日志通控制台。
2. 在导航窗格中的 **集群** 下，选择 **OpenSearch 域**。
3. 从表中选择域。
4. 选择**访问代理**选项卡。您可以看到 **负载均衡域名**，即 ALB 域。
5. 转到 DNS 解析器，创建指向该域的 CNAME 记录。如果您的域由 [Amazon Route 53][route53] 管理，请参阅[使用 Amazon Route 53 控制台创建记录][createrecords]。

## 通过代理访问 Amazon OpenSearch Service
DNS 记录生效后，您可以通过代理从任何地方访问 Amazon OpenSearch Service 内置仪表板。 您可以在浏览器中输入代理的域，或单击**常规配置**部分中**访问代理**下的**链接**按钮。

![访问代理链接](../../images/access-proxy-link.png)

## 删除代理
1. 登录日志通 控制台。
2. 在导航窗格中的 **集群** 下，选择 **OpenSearch 域**。
3. 从表中选择域。
4. 选择**访问代理**选项卡。
5. 选择**删除**。
6. 在确认提示中，选择 **删除**。



[asg]: https://docs.aws.amazon.com/autoscaling/ec2/userguide/what-is-amazon-ec2-auto-scaling.html
[alb]: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html
[nginx]: https://aws.amazon.com/premiumsupport/knowledge-center/opensearch-outside-vpc-nginx/
[ssh]: https://aws.amazon.com/premiumsupport/knowledge-center/opensearch-outside-vpc-ssh/
[acm]: https://aws.amazon.com/certificate-manager/
[route53]: https://aws.amazon.com/route53/
[createrecords]: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-creating.html