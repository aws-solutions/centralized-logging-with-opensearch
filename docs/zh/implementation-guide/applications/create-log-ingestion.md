<!--ig-start-->
### 实例组作为日志源

1. 登录日志通控制台。
2. 在左侧边栏中的 **日志分析管道** 下，选择**应用日志**。
3. 单击在**前提条件**期间创建的应用程序管道。
4. 选择 **Permission grant method**。如果您选择 **I will manually add the below required permissions after pipeline creation**，您需要点击 **Expand to view required permissions** 并复制提供的 JSON policy。
5. 转到 **AWS Console > IAM > Policies** 在左侧列，并

    1. 选择 **Create Policy**，选择 **JSON** 并替换文本块内的所有内容。记得用您的账户ID替换 `<YOUR ACCOUNT ID>`。

    2. 选择 **Next**，**Next**，然后为此策略输入名称。

    3. 将策略附加到您的 EC2 实例配置文件，以授予日志代理将日志发送到应用日志 管道的权限。如果您使用的是弹性伸缩组，您需要更新与弹性伸缩组关联的 IAM 实例配置文件。如有需要，您可以按照文档来更新您的 [launch template][launch-template] 或 [launch configuration][launch-configuration]。

6. 单击**创建日志摄取**下拉菜单，然后选择**从实例组**。
7. 选择**选择存在**，然后选择**下一步**。
8. 选择您在**前提条件**中创建的实例组，然后选择**下一步**。
9. （仅限Auto Scaling Group）如果您的实例组是基于Auto Scaling Group创建的，当摄取状态变为“已创建”后，您可以在实例组的详细信息页面中找到生成的Shell 脚本。复制 shell 脚本并更新 Auto Scaling [启动配置](https://docs.aws.amazon.com/autoscaling/ec2/userguide/launch-configurations.html) 或  [启动模版](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-launch-templates.html)。
10. 选择**选择已存在**，并选择在先前设置中创建的日志配置。

[launch-template]: https://docs.aws.amazon.com/autoscaling/ec2/userguide/create-launch-template.html#advanced-settings-for-your-launch-template
[launch-configuration]: https://docs.aws.amazon.com/autoscaling/ec2/userguide/change-launch-config.html

<!--ig-end-->

<!--eks-start-->
### Amazon EKS 集群作为日志源

1. 登录日志通控制台。
2. 在左侧边栏中的 **日志源** 下，选择 **EKS 集群**。
3. 单击已导入为日志源的 EKS 集群。
4. 转到 **App Log Ingestion** 标签并选择 **Create an Ingestion**。

    1. 选择 **Choose exists** 并选择在 **Prerequisites** 中创建的应用日志 管道。选择 **Next**。

    2. 选择在之前设置中创建的日志配置。

    3. 选择 **Create** 以完成创建一个导入。

5. 按照日志通 生成的指南部署 Fluent-bit 日志代理。
    - 选择刚刚创建的应用日志摄取。
    - 按照 **DaemonSet** 或 **Sidecar** 指南部署日志代理。

<!--eks-end-->

<!--S3-start-->
### Amazon S3 作为 日志源

1. 登录到 日志通 控制台。

2. 在左侧边栏下的 **日志分析管道**，选择 **应用日志**。

3. 选择在 **Prerequisites** 期间已创建的应用管道。

4. 选择 **Create an Ingestion** 下拉菜单，并选择 **From S3 bucket**。

5. 选择存储日志的 S3 桶并输入 **前缀过滤器**。

6. 根据您的需求选择 **导入模式**。如果您想持续地摄取日志，请选择 **持续加载**；如果您只需要摄取日志一次，请选择 **一次性加载**。

7. 如果您的日志文件已压缩，请指定 **压缩格式**。

8. 选择在之前设置中创建的日志配置。

9. 选择 **Create** 以完成创建一个导入。

<!--S3-end-->

<!--syslog-start-->
### Syslog 作为日志源

1. 登录日志通控制台。
2. 在左侧边栏中的**日志分析管道**下，选择 **应用日志**。
3. 单击在**前提条件**期间创建的应用程序管道。
4. 单击**创建日志摄取**下拉菜单，然后选择**Syslog**。
5. 您可以使用 UDP 或 TCP 以自定义端口号。选择 **下一步**。
6. 选择在之前的设置中创建的日志配置。
7. 选择**创建**以完成创建一个导入。
<!--syslog-end-->

[launch-template]: https://docs.aws.amazon.com/autoscaling/ec2/userguide/create-launch-template.html#advanced-settings-for-your-launch-template
[launch-configuration]: https://docs.aws.amazon.com/autoscaling/ec2/userguide/change-launch-config.html