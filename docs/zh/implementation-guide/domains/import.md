# 域操作

登录日志通控制台后，您可以导入 Amazon OpenSearch Service 域。

!!! note "注意"

    目前，日志通支持 Amazon Elasticsearch 7.10 及更高版本，或 Amazon OpenSearch 1.0 及更高版本。

## 前提条件

1. VPC 内至少有一个 Amazon OpenSearch Service 域。如果您还没有 Amazon OpenSearch Service 域，您可以在 VPC 中创建一个 Amazon OpenSearch Service 域。请参阅 [在 VPC 中启动您的 Amazon OpenSearch 服务域][vpc]。
2. 日志通 仅支持启用了 [细粒度访问控制](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/fgac.html) 的 Amazon OpenSearch Service 域。
在 security configuration（安全配置）中，您的 access policy （访问策略）应该和下图类似：
    ![](../../images/domain/policy.png)

## 导入 Amazon OpenSearch Service 域

1. 登录日志通控制台。
2. 在左侧导航面板的 **集群** 下，选择 **导入 OpenSearch 域**。
3. 在 **选择集群** 页面上，从下拉列表中选择一个域。下拉列表将仅显示与解决方案位于同一区域的域。
4. 选择**下一步**。
5. 在**配置网络**页面的**网络创建**，
   * 选择**手动**并点击**下一步**；
   * 或选择**自动**，然后转到步骤 9。
6. 在 **VPC** 下，从列表中选择一个 VPC。默认情况下，该解决方案会创建一个独立的 VPC，您可以选择名为 `LogHubVpc/DefaultVPC` 的 VPC。您还可以选择与您的 Amazon OpenSearch Service 域相同的 VPC。
7. 在 **日志处理子网组** 下，从下拉列表中选择至少 2 个子网。默认情况下，该解决方案会创建两个私有子网。您可以选择名为`LogHubVpc/DefaultVPC/privateSubnet1`和`LogHubVpc/DefaultVPC/privateSubnet2`的子网。
8. 在 **日志处理安全组** 下，从下拉列表中选择一个。默认情况下，该解决方案会创建一个名为`ProcessSecurityGroup`的安全组。
9. 在 **创建标签** 页面，根据需要添加标签。
10. 选择**导入**。

## 设置 VPC 对等互连

默认情况下，该解决方案会创建一个独立的 VPC。您需要创建 VPC 对等互连以允许日志处理层访问您的 Amazon OpenSearch Service 域。

!!! note "注意"

    自动模式将自动创建 VPC 对等并配置路由表。您无需再次设置 VPC 对等互连。

![](../../images/domain/domain-vpc-peering.svg)

按照以下内容创建 VPC 对等互连、更新安全组和更新路由表。

### 创建 VPC 对等连接

1. 登录日志通控制台。
2. 在左侧导航面板的 **集群** 下，选择 **OpenSearch 集群**。
3. 找到导入的域名，选择域名。
4. 选择**网络**选项卡。
5. 复制 **OpenSearch 域网络** 和 **日志处理网络** 两个部分中的 VPC ID。您将在这两个 VPC 之间创建对等连接。
6. 导航到 [VPC 控制台对等连接](https://console.aws.amazon.com/vpc/home#PeeringConnections)。
7. 选择 **创建对等连接** 按钮。
8. 在 **创建对等连接** 页面上，输入名称。
9. 对于 **选择要用作对等的本地 VPC，VPC ID (请求者)**，选择**日志处理网络**的 VPC ID。
10. 对于 **选择要用作对等的另一个 VPC, VPC ID (接收方)**，选择**OpenSearch 集群网络**的VPC ID。
11. 选择 **创建对等连接**，然后导航到对等连接详细信息页面。
12. 单击 **操作** 按钮并选择 **接受请求**。

### 更新路由表

1. 登录日志通 控制台。
2. 在 **OpenSearch 集群网络** 部分，单击 **AZs and Subnets** 下的子网以在新选项卡中打开子网控制台。
3. 选择子网，然后选择 **路由表** 选项卡。
4. 选择子网关联的路由表，打开路由表配置页面。
5. 选择 **路由表** 选项卡，然后选择 **编辑路由**。
6. 添加一个路由`10.255.0.0/16`（日志通的 CIDR，如果您是从现有的 VPC 中部署日志通，请使用相应的 CIDR）指向您刚刚创建的对等连接。
7. 返回日志通控制台。
8. 单击 **OpenSearch 集群网络** 部分下的 VPC ID。
9. 在 VPC 控制台上选择 VPC ID 并找到它的 **IPv4 CIDR**。
10. 在日志通 控制台的 **日志处理网络** 部分中，单击 **AZs and Subnets** 下的子网以在新选项卡中打开子网。
11. 重复步骤 3、4、5、6 以添加相反的路线。即配置 OpenSearch VPC 的 IPv4 CIDR 指向对等连接。您需要对日志处理网络的每个子网重复这些步骤。

### 更新 OpenSearch 域的安全组

1. 在日志通控制台的 **OpenSearch 集群网络** 部分下，选择 **安全组** 中的安全组 ID 以在新选项卡中打开安全组。
2. 在控制台上，选择**编辑入站规则**。
3. 添加规则 "ALLOW TCP/443 from 10.255.0.0/16"（日志通的 CIDR，如果您是从现有的 VPC 中部署日志通，请使用相应的 CIDR）。
4. 选择**保存规则**。

## 删除 Amazon OpenSearch Service 域

如果需要，您可以删除 Amazon OpenSearch Service 域。

!!! important "重要"

     从日志通 中删除域将**不会**删除您 AWS 账户中的 Amazon OpenSearch Service 域。 它**不会**影响任何现有的日志分析管道。

1. 登录日志通控制台。
2. 在导航窗格中的 **集群** 下，选择 **OpenSearch 集群**。
3. 从表中选择域。
4. 选择**删除**。
5. 在确认对话框中，选择**删除**。


[dg]: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/createupdatedomains.html
[vpc]:https://docs.aws.amazon.com/opensearch-service/latest/developerguide/vpc.html

