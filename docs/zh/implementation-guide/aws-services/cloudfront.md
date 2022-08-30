# Amazon CloudFront 日志

[CloudFront 标准日志](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/AccessLogs.html) 为每个发送到分发的请求提供详细的记录。

## 创建日志摄取
您可以使用 Log Hub 控制台或通过部署独立的 CloudFormation 堆栈来将日志摄取到 AOS 中。

!!! important "Important"
    - CloudFront 日志存储桶必须与 Log Hub 位于同一区域。
    - AOS索引每天轮换，不可调整。

### 使用 Log Hub 控制台
1. 登录 Log Hub 控制台。
2. 在导航窗格中的 **日志分析管道** 下，选择 **AWS 服务日志**。
3. 选择**创建日志摄取**按钮。
4. 在 **AWS 服务** 部分，选择 **Amazon CloudFront**。
5. 选择**下一步**。
6. 在 **指定设置** 下，为 **CloudFront 日志启用**选择 **自动** 或 **手动**。自动模式将自动检测 CloudFront 日志位置。
    - 对于**自动模式**，从下拉列表中选择 CloudFront 分配。
    - 对于 **手动模式**，输入 **CloudFront Distribution ID** 和 **CloudFront 标准日志位置**。
    - （可选步骤）如果需要夸账户摄取日志，需要先在 **账户** 的下拉列表中选择一个[链接的 AWS 账户](../link-account/index.md)。
7. 选择**下一步**。
8. 在 **指定 OpenSearch 域** 部分，为 **Amazon OpenSearch 域** 选择一个导入的域。
9. 如果您要摄取关联的模板化 AOS 仪表板，请为 **示例仪表板** 选择 **是**。
10. 如果需要，您可以更改目标 AOS 索引的 **索引前缀**。默认前缀是 CloudFront 分配 ID。
11. 在 **日志生命周期** 部分，输入管理 AOS 索引生命周期的天数。 Log Hub 将为此管道自动创建关联的 [索引状态管理 (ISM)](https://opensearch.org/docs/latest/im-plugin/ism/index/) 策略。
12. 选择**下一步**。
13. 如果需要，添加标签。
14. 选择**创建**。

### 使用 CloudFormation 堆栈
此自动化 AWS CloudFormation 模板在 AWS 云中部署 *Log Hub - CloudFront 标准日志摄取* 解决方案。

|                      | 在 AWS 控制台中启动                                      | 下载模板                                           |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| AWS 海外区域 | [![启动堆栈](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/create/template?stackName=LogHub-CloudFront&templateURL=https://{{ bucket }}.s3.amazonaws.com/log-hub/{{ version }}/CloudFrontLog.template){target=_blank} | [模板](https://{{ bucket }}.s3.amazonaws.com/log-hub/{{ version }}/CloudFrontLog.template) |
| AWS 中国区域 | [![启动堆栈](../../images/launch-stack.png)](https://console.amazonaws.cn/cloudformation/home#/stacks/create/template?stackName=LogHub-CloudFront&templateURL=https://{{ bucket }}.s3.cn-north-1.amazonaws.com.cn/log-hub/{{ version }}/CloudFrontLog.template){target=_blank} | [模板](https://{{ bucket }}.s3.cn-north-1.amazonaws.com.cn/log-hub/{{ version }}/CloudFrontLog.template) |

{%
include-markdown "include-cfn-common.md"
%}

##  示例仪表板
{%
include-markdown "include-dashboard.md"
%}

[![cloudfront-db]][cloudfront-db]


[cloudfront-db]: ../../images/dashboards/cloudfront-db.png