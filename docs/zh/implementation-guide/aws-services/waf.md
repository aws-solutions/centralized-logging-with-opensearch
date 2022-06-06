# AWS WAF 日志
[WAF 访问日志](https://docs.aws.amazon.com/waf/latest/developerguide/logging.html) 提供有关由您的 Web ACL 分析的流量的详细信息。 记录的信息包括 AWS WAF 从您的 AWS 资源收到 Web 请求的时间、有关请求的详细信息以及有关请求匹配的规则的详细信息。

## 创建日志摄取
您可以使用 Log Hub 控制台或通过部署独立的 CloudFormation 堆栈来将日志摄取到 AOS 中。

!!! important "Important"
    - WAF 日志存储桶必须和 Log Hub 位于同一区域。
    - Log Hub 不支持 [WAF Classic](https://docs.aws.amazon.com/waf/latest/developerguide/classic-waf-chapter.html) 产生的日志. 您可以了解如何[从 WAF Classic 迁移到新 AWS WAF](https://aws.amazon.com/blogs/security/migrating-rules-from-aws-waf-classic-to-new-aws-waf/).
    - AOS索引每天轮换，不可调整。

### 使用 Log Hub 控制台

1. 登录 Log Hub 控制台。
2. 在导航窗格中的 **日志分析管道** 下，选择 **AWS 服务日志**。
3. 选择**创建日志摄取**按钮。
4. 在 **AWS 服务** 部分，选择 **AWS WAF**。
5. 选择**下一步**。
6. 在 **指定设置** 下，选择 **自动** 或 **手动**。
    - 对于 **自动** 模式，在下拉列表中选择一个 Web ACL。 （如果未启用 Web ACL 日志，请单击 **开启** 启用访问日志。）
    - 对于 **手动** 模式，输入 **Web ACL name** 和 **日志位置**。
7. 选择**下一步**。
8. 在 **指定 OpenSearch 域** 部分，为 **Amazon OpenSearch 域** 选择一个导入的域。
9. 如果您要摄取关联的模板化 AOS 仪表板，请为 **示例仪表板** 选择 **是**。
10. 如果需要，您可以更改目标 AOS 索引的 **索引前缀**。默认前缀是`Web ACL 名称`。
11. 在 **日志生命周期** 部分，输入管理 AOS 索引生命周期的天数。 Log Hub 将为此管道自动创建关联的 [索引状态管理 (ISM)](https://opensearch.org/docs/latest/im-plugin/ism/index/) 策略。
12. 选择**下一步**。
13. 如果需要，添加标签。
14. 选择**创建**。

### 使用 CloudFormation 堆栈
此自动化 AWS CloudFormation 模板在 AWS 云中部署 *Log Hub - waf Log Ingestion* 解决方案。

|                      | 从 AWS 控制台启动                                        | 下载模板                                            |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| AWS 海外区域 | [![启动堆栈](../../images/launch-stack.png)](https://console.aws.amazon.com/cloudformation/home#/stacks/create/template?stackName=LogHub-WAF&templateURL=https://{{ bucket }}.s3.amazonaws.com/log-hub/{{ version }}/WAFLog.template){target=_blank} | [模板](https://{{ bucket }}.s3.amazonaws.com/log-hub/{{ version }}/WAFLog.template) |
| AWS 中国区域 | [![启动堆栈](../../images/launch-stack.png)](https://console.amazonaws.cn/cloudformation/home#/stacks/create/template?stackName=LogHub-WAF&templateURL=https://{{ bucket }}.s3.cn-north-1.amazonaws.com.cn/log-hub/{{ version }}/WAFLog.template){target=_blank} | [模板](https://{{ bucket }}.s3.cn-north-1.amazonaws.com.cn/log-hub/{{ version }}/WAFLog.template) |

{%
include-markdown "include-cfn-common.md"
%}

## 示例仪表板
{%
include-markdown "include-dashboard.md"
%}

[![waf-db]][waf-db]

[waf-db]: ../../images/dashboards/waf-db.png


