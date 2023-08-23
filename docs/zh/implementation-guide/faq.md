# 常见问题解答

## 一般问题

**问：什么是日志通？**<br>
日志通是一个 AWS 解决方案，简化了日志分析管道的构建。作为 Amazon OpenSearch 服务的补充，它为客户提供了摄取和处理应用程序日志的功能和 AWS 服务日志，并从开箱即用的模板中创建可视化的仪表盘。日志通自动组装底层的AWS服务，并为你提供一个 Web 控制台来管理日志分析管道。


**问：该解决方案中支持哪些日志？**<br>
日志通同时支持 AWS 服务日志和 EC2/EKS 应用日志。请参考[支持的 AWS 服务](./aws-services/index.md#supported-aws-services)。
和[支持的应用程序日志格式和来源](./applications/index.md#supported-log-formats-and-sources)了解更多细节。


**问：日志通是否支持从多个AWS账户摄取日志？**<br>
是的。从 v1.1.0 版开始，日志通支持从同一地区的不同 AWS 账户摄取 AWS 服务日志和应用程序日志。
在同一地区的不同 AWS 账户中摄取 AWS 服务日志和应用程序日志。欲了解更多信息，请参阅[跨账户日志摄取](./link-account/index.md)。

**问：日志通是否支持从多个AWS区域摄取日志？**<br>
目前，日志通并不自动从不同的 AWS 区域摄取日志。你需要从其他地区摄取日志
摄取到由日志通 提供的管线中。对于在 S3 桶中存储日志的AWS服务，你可以利用
[S3跨区域复制](https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication.html)
将日志复制到日志通 部署的区域，并使用[手动模式](./aws-services/cloudfront.md#using-the-log-hub-console)导入增量日志，指定
S3 桶中的日志位置。对于 EC2 和 EKS 上的应用日志，你需要设置网络（例如，Kinesis VPC 端点，VPC 对等）。
安装代理，并配置代理，将日志摄入到日志通 管道。

**问：这个解决方案的许可证是什么？**<br>

本解决方案是根据[Apache-2.0许可证](https://www.apache.org/licenses/LICENSE-2.0)提供的。
它是一个由 Apache 软件基金会编写的自由软件许可证。
它允许用户为任何目的使用该软件，分发、修改该软件，并根据许可证的条款分发该软件的修改版本，而不必担心版权费。

**问：我怎样才能找到这个解决方案的路线图？**<br>

这个解决方案使用GitHub项目来管理[路线图](https://github.com/orgs/awslabs/projects/58){target='_blank'}。

**问：我如何提交功能请求或错误报告？**</br>
你可以通过GitHub问题提交[功能请求][github-fr]{target='_blank'}和[错误报告][github-br]{target='_blank'}。

## 设置和配置

**问：我可以在任何AWS区域的AWS上部署日志通吗？**</br>
日志通提供两种部署方案：方案一使用 Cognito 用户池，方案二使用OpenID连接。对于
方案一，客户可以在有Amazon Cognito User Pool、AWS AppSync、Amazon Kinesis Data Firehose（可选）的AWS地区部署该解决方案。
对于方案二，客户可以在有AWS AppSync、Amazon Kinesis Data Firehose（可选）的AWS地区部署该解决方案。
更多信息请参考[支持的部署区域](./plan-deployment/considerations.md#regional-deployments)。

**问：部署该解决方案的前提条件是什么？**</br>
日志通不提供 Amazon OpenSearch 集群，你需要通过 Web 控制台导入现有的 OpenSearch 集群。该集群
必须满足 [prerequisites](./domains/import.md#prerequisite)中指定的要求。

**问：为什么在AWS中国区部署解决方案时，我需要一个有ICP备案的域名？**<br>
日志通控制台是通过 CloudFront 分发的，它被认为是一种互联网信息服务。根据
根据当地的规定，任何互联网信息服务都必须绑定一个带有[ICP备案](https://www.amazonaws.cn/en/support/icp/?nc2=h_l2_su)的域名。

**问：该解决方案适用于哪些版本的 OpenSearch？**</br>
日志通支持 Amazon OpenSearch Service，引擎版本为 Elasticsearch 7.10 及以上，Amazon OpenSearch 1.0及以上。

**问：日志分析管道创建的 OpenSearch 的索引名称规则是什么？**</br>

如果需要，您可以在创建日志分析管道时修改索引名称。

在我们的解决方案中，如果您创建的日志分析管道是属于服务日志，索引名称由`<index prefix>`-`<service-type>`-`<index suffix>`-<00000x> 组成。其中 index prefix 您可以定义一个名称。service-type 是根据您选择的服务类型，系统自动生成。关于 index suffix 您可以选择不同的后缀来调整索引滚动时间窗口，详细说明参考如下：

- YYYY-MM-DD-HH：Amazon OpenSearch 将按小时滚动索引；
- YYYY-MM-DD：Amazon OpenSearch 将按24小时滚动索引；
- YYYY-MM：Amazon OpenSearch 将按30天滚动索引；
- YYYY：Amazon OpenSearch 将按365天滚动索引。

需要注意的是在 OpenSearch 中，时间采用的是UTC 0时区。

关于 00000x 部分，是 Amazon OpenSearch 会自动在索引名称后附加一个 6 位数字的后缀，其中第一个索引规则为 000001, 根据索引滚动，向后依次递增，例如 000002， 000003。

如果您创建的日志分析管道是属于应用日志，索引前缀由 `<index prefix>`-`<index suffix>`-<00000x> 组成。index prefix 与 index suffix ，00000x 的规则与服务日志的相同。

**问：日志分析管道创建的索引滚动规则是什么？**</br>

索引滚动由两个因素决定，第一个由索引名称中的 index suffix 决定。第二个，如果您启用了按容量滚动索引，当索引大小等于或超过指定大小时，Amazon OpenSearch 将滚动您的索引，而不管滚动时间窗口如何。

需要注意的是这两个因素只要有一个符合，即可触发索引滚动。例如：我们在2023年1月1日创建一个应用日志管道，并于2023年1月4日9点删除了应用日志管道，索引名称是 nginx-YYYY-MM-DD-<00000x> 。同时，我们启用了按容量滚动索引，并输入 300GB ，假如创建后日志数据量突增，每隔1小时即可达到 300GB ，持续时间为2小时10分钟，之后恢复正常，每日数据量为 90GB 。则 OpenSearch 在1月1日创建三个索引，索引名称为 nginx-2023-01-01-000001 ，nginx-2023-01-01-000002，nginx-2023-01-01-000003， 之后每日创建一条索引，分别为：nginx-2023-01-02-000004， nginx-2023-01-03-000005，nginx-2023-01-04-000006。

**问：我可以在现有 VPC 中部署该解决方案吗？**</br>
是的。 您可以使用新 VPC 启动解决方案，也可以使用现有 VPC 启动解决方案。 当使用现有的
VPC，需要选择VPC和对应的子网。 参考[使用 Cognito 用户池启动](./deployment/with-cognito.md) 或
[使用 OpenID Connect 启动](./deployment/with-oidc.md) 了解更多详情。

**问：使用 Cognito 用户池启动时，我没有收到包含临时密码的电子邮件。 如何重新发送密码？**</br>
您的帐户由 Cognito 用户池管理。 第一次重发临时密码，可以找到用户池
解决方案创建的用户，删除并使用相同的电子邮件地址重新创建用户。 如果您仍然遇到同样的问题，
尝试使用另一个电子邮件地址。

**问：如何为该解决方案创建更多用户？**</br>
如果您使用 Cognito 用户池启动解决方案，请转到 AWS 控制台，找到该解决方案创建的用户池，
您可以创建更多用户。 如果您使用 OpenID Connect (OIDC) 启动解决方案，则应在
由 OIDC 提供商管理的用户池。 请注意，所有用户都具有相同的权限。

## 成本

**问：使用此解决方案如何收费和计费？**</br>
该解决方案可免费使用，您需要承担运行该解决方案时使用的 AWS 服务的费用。
您只需为使用的内容付费，没有最低费用或设置费用。 有关详细的成本估算，请参阅 [成本](./plan-deployment/cost.md) 部分。

**问：跨账户摄取会产生额外费用吗？**</br>
不会。费用与 AWS 账户中提取日志的费用相同。

## 日志摄取

**问：解决方案中使用的日志代理是什么？**</br>
日志通使用 [AWS for Fluent Bit](https://github.com/aws/aws-for-fluent-bit)，这是由 AWS 维护的 [Fluent Bit](https://fluentbit.io/) 的一个发行版。
该解决方案使用此分配从 Amazon EC2 和 Amazon EKS 提取日志。

**问：我已经将会员账户的AWS服务日志存储在一个集中的日志账户中。我应该如何为会员帐户创建服务日志摄取？**</br>
这种情况下，需要在集中日志账户中部署方案，并摄取AWS服务日志
使用登录帐户的*手动*模式。请参阅此 [指南](./aws-services/elb.md) 以获取应用程序
负载均衡器以*手动*模式记录。您可以对将日志输出到 S3 的其他受支持的 AWS 服务执行相同的操作。

**问：为什么在通过 Kinesis Data Streams 摄取日志时，OpenSearch 中有一些重复的记录？**</br>
这通常是因为没有足够的 Kinesis 碎片来处理传入的请求。发生阈值错误时
在 Kinesis 中，Fluent Bit 代理将 [重试](https://docs.fluentbit.io/manual/administration/scheduling-and-retries)
那个 [块](https://docs.fluentbit.io/manual/administration/buffering-and-storage)。为避免此问题，您需要估计日志吞吐量并设置适当的 Kinesis 分片数。请参阅
[Kinesis Data Streams 配额和限制](https://docs.aws.amazon.com/streams/latest/dev/service-sizes-and-limits.html)。
日志通提供了一个内置功能来扩展和缩减 Kinesis 分片，这将需要几分钟的时间
扩展到所需的数量。

## 日志可视化

**问。如何在 OpenSearch 中找到内置仪表板？**</br>
请参考[AWS服务日志](./aws-services/index.md#supported-aws-services)和[应用程序日志](./applications/index.md#supported-log-formats-and-sources)至
查看是否支持内置仪表板。您还需要在创建时打开 *Sample Dashboard* 选项
日志分析管道。仪表板将插入到 **Global Tenant** 下的 Amazon OpenSearch Service 中。您可以切换到
来自 OpenSearch 仪表板右上角编码器的全局租户。


[github-fr]: https://github.com/aws-solutions/centralized-logging-with-opensearch/issues/new?assignees=&labels=feature-request%2Cneeds-triage&template=feature-request.yml&title=%28module+name%29%3A+%28short+issue+description%29
[github-br]: https://github.com/aws-solutions/centralized-logging-with-opensearch/issues/new?assignees=&labels=bug%2Cneeds-triage&template=bug-report.yml&title=%28module+name%29%3A+%28short+issue+description%29