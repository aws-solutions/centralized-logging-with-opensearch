<!--ig-start-->
### 实例组作为日志源

1. 登录日志通控制台。
2. 在左侧边栏中的 **日志分析管道** 下，选择**应用日志**。
3. 单击在**前提条件**期间创建的应用程序管道。
4. 转到 **Permission** 选项卡并复制提供的 JSON 策略。
5. 在 **AWS Console > IAM > Policies** 进行如下操作。

    - 点击**Create Policy**，选择**JSON**并替换文本块内的所有内容。请记住用您的帐户 ID 替换 `<YOUR ACCOUNT ID>`。
    - 选择**下一步**，再选择 **下一步**，然后输入此策略的名称。
    - 将该策略附加到您的 EC2 实例配置文件，以允许日志代理有权将日志发送到应用程序日志管道。如果您使用的是 Auto Scaling 组，则需要更新与 Auto Scaling 组关联的 IAM 实例配置文件（根据您的 Auto Scaling 组的设置进行配置，请参照 AWS 文档进行更新 [Launch Template][launch-template] 或 [launch-configuration][launch-configuration])

6. 单击**创建日志摄取**下拉菜单，然后选择**从实例组**。
7. 选择**选择存在**，然后选择**下一步**。
8. 选择您在**前提条件**中创建的实例组，然后选择**下一步**。
9. （仅限Auto Scaling Group）如果您的实例组是基于Auto Scaling Group创建的，当摄取状态变为“已创建”后，您可以在实例组的详细信息页面中找到生成的Shell 脚本。复制 shell 脚本并更新 Auto Scaling [启动配置](https://docs.aws.amazon.com/autoscaling/ec2/userguide/launch-configurations.html) 或  [启动模版](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-launch-templates.html)。
10. 选择**选择已存在**，并选择在先前设置中创建的日志配置。
11. 选择**下一步**，然后选择**创建**。

[launch-template]: https://docs.aws.amazon.com/autoscaling/ec2/userguide/create-launch-template.html#advanced-settings-for-your-launch-template
[launch-configuration]: https://docs.aws.amazon.com/autoscaling/ec2/userguide/change-launch-config.html

<!--ig-end-->

<!--eks-start-->
### EKS 集群作为日志源

1. 登录日志通控制台。
2. 在左侧边栏中的 **日志源** 下，选择 **EKS 集群**。
3. 单击已导入为日志源的 EKS 集群。
4. 转到 **应用日志摄取** 选项卡，然后单击 **创建日志摄取**。
    - 选择"选择已存在" 并选择在**前提条件**中创建的应用程序管道。选择**下一步**。
    - 选择之前设置中创建的日志配置，然后选择**下一步**。
    - 根据需要添加标签，然后选择**创建**完成创建摄取。
5. 按照日志通 生成的指南部署 Fluent-bit 日志代理。
    - 选择刚刚创建的应用日志摄取。
    - 按照 **DaemonSet** 或 **Sidecar** 指南部署日志代理。

<!--eks-end-->

<!--syslog-start-->
### Syslog 作为日志源

1. 登录日志通控制台。
2. 在左侧边栏中的 **日志分析管道** 下，选择 **应用日志**。
3. 单击在**前提条件**期间创建的应用程序管道。
4. 单击 **创建日志摄取** 下拉菜单，然后选择 **从 Syslog**。
5. 填写所有表单字段以指定 Syslog 日志源，您可以使用带有自定义端口号的 UDP 或 TCP 协议。 选择**下一步**。
6. 选择之前设置中创建的日志配置，然后选择**下一步**。
7. 根据需要添加标签，然后选择**创建**完成创建摄取。
<!--syslog-end-->

[launch-template]: https://docs.aws.amazon.com/autoscaling/ec2/userguide/create-launch-template.html#advanced-settings-for-your-launch-template
[launch-configuration]: https://docs.aws.amazon.com/autoscaling/ec2/userguide/change-launch-config.html