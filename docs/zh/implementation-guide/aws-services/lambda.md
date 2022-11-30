# AWS Lambda 日志
AWS Lambda 会代表您自动监控 Lambda 函数并将函数指标发送到 Amazon CloudWatch。

## 创建日志摄取
您可以使用 Log Hub 控制台或通过部署独立的 CloudFormation 堆栈来将日志摄取到 AOS 中。

!!! important "Important"
    
    - Lambda 必须与 Log Hub 位于同一区域。
    - AOS 索引每天轮换，不能调整。

### 使用 Log Hub 控制台
1. 登录 Log Hub 控制台。
2. 在导航窗格中的 **日志分析管道** 下，选择 **AWS 服务日志**。
3. 选择**创建日志摄取**按钮。
4. 在 **AWS 服务** 部分，选择 **AWS Lambda**。
5. 选择**下一步**。
6. 在 **指定设置** 下，从下拉列表中选择 Lambda 函数。（可选步骤）如果需要跨账户摄取日志，需要先在 **账户** 的下拉列表中选择一个[链接的 AWS 账户](../link-account/index.md)。
9. 选择**下一步**。
10. 在 **指定 OpenSearch 域** 部分，为 **Amazon OpenSearch 域** 选择一个导入的域。
11. 如果您要摄取关联的模板化 AOS 仪表板，请为 **示例仪表板** 选择 **是**。
12. 如果需要，您可以更改目标 AOS 索引的**索引前缀**。默认前缀是 Lambda 函数名称。
13. 在 **日志生命周期** 部分，输入管理 AOS 索引生命周期的天数。 Log Hub 将为此管道自动创建关联的 [索引状态管理 (ISM)](https://opensearch.org/docs/latest/im-plugin/ism/index/) 策略。
14. 选择**下一步**。
15. 如果需要，添加标签。
16. 选择**创建**。

### 使用 CloudFormation 堆栈
此自动化 AWS CloudFormation 模板在 AWS 云中部署 *Log Hub - Lambda Log Ingestion* 解决方案。

|                      | 从 AWS 控制台中启动                                      | 下载模板                                            |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| AWS 海外区域 | [![启动堆栈](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/create/template?stackName=LogHub-Lambda&templateURL=https://{{ bucket }}.s3.amazonaws.com/log-hub/{{ version }}/LambdaLog.template){target=_blank} | [模板](https://{{ bucket }}.s3.amazonaws.com/log-hub/{{ version }}/LambdaLog.template) |
| AWS 中国区域 | [![启动堆栈](../../images/launch-stack.png)](https://console.amazonaws.cn/cloudformation/home#/stacks/create/template?stackName=LogHub-Lambda&templateURL=https://{{ bucket }}.s3.cn-north-1.amazonaws.com.cn/log-hub/{{ version }}/LambdaLog.template){target=_blank} | [模板](https://{{ bucket }}.s3.cn-north-1.amazonaws.com.cn/log-hub/{{ version }}/LambdaLog.template) |

{%
include-markdown "include-cw-cfn-common.md"
%}

## Sample Dashboard
{%
include-markdown "include-dashboard.md"
%}
	  		  
[![lambda-db]][lambda-db]

[lambda-db]: ../../images/dashboards/lambda-db.png