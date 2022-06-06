# 故障排查

以下介绍在使用 Log Hub 时可能遇到的错误或问题，以及解决方法。

## Error: Failed to assume service-linked role `arn:x:x:x:/AWSServiceRoleForAppSync`

出现此错误的原因是该账户从未使用过 [AWS AppSync](https://aws.amazon.com/appsync/) 服务。您可以再次部署解决方案的 CloudFormation 模板。当您遇到错误时，AWS 已经自动创建了角色。

您也可以前往 [AWS CloudShell](https://aws.amazon.com/cloudshell/) 或本地终端并运行以下 AWS CLI 命令以链接 AppSync 角色：

```
aws iam create-service-linked-role --aws-service-name appsync.amazonaws.com
```

## Error: Unable to add backend role

Log Hub 仅支持启用了[细粒度访问控制](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/fgac.html) 的 AOS 域。

您需要转到 AOS 控制台，并编辑 AOS 域的**访问策略**。


## Error: PutRecords API responded with error='AccessDeniedException'

Fluent-bit agent在EKS集群中向Kinesis发送日志时汇报了"AccessDeniedException"错误

### 验证是否正确设置 IAM 角色信任关系

使用 Log Hub 控制台:

1. 打开 Log Hub 控制台。
2. 在左侧边栏中的**日志源**下，选择**EKS 集群**。
3. 选择要检查的EKS集群
4. 点击**IAM 角色 ARN**， 这会在 AWS 控制台中打开 IAM 角色。
5. 选择**信任关系**选项卡以验证 OIDC 提供方, 服务账户命名空间以及条件是否设置正确。

您可以前往 Amazon EKS [IAM role configuration](https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts-technical-overview.html#iam-role-configuration) 获得更多信息