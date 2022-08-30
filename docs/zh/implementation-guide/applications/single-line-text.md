# 单行文本
Log Hub 使用自定义 Ruby 正则表达式来解析日志。 它支持单行日志格式和多输入格式。

您可以将 Log Hub 配置为摄取单行文本日志。

## Prerequisites
{%
include-markdown "include-prerequisites.md"
%}

## 步骤 1: 创建一个单行文本日志配置

1. 登录 Log Hub 控制台。
2. 在左侧边栏中的 **资源** 下，选择 **日志配置**。
3. 单击**创建日志配置**按钮。
4. 指定**配置名称**。
5. 指定**日志路径**。 您可以使用 `,` 分隔多个路径。
6. 在日志类型下拉菜单中选择**单行文本**。
7. 在[Rubular](https://rubular.com/)中写正则表达式先验证并输入值。 例如：

    ```
    (?<remote_addr>\S+)\s*-\s*(?<remote_user>\S+)\s*\[(?<time_local>\d+/\S+/\d+:\d+:\d+:\d+)\s+\S+\]\s*"(?<request_method>\S+)\s+(?<request_uri>\S+)\s+\S+"\s*(?<status>\S+)\s*(?<body_bytes_sent>\S+)\s*"(?<http_referer>[^"]*)"\s*"(?<http_user_agent>[^"]*)"\s*"(?<http_x_forwarded_for>[^"]*)".*
    ```
   
8. 在**示例日志解析**部分，粘贴一个示例的单行文本日志，点击**解析日志**，验证日志解析是否成功。 例如：   
    ```
    127.0.0.1 - - [24/Dec/2021:01:27:11 +0000] "GET / HTTP/1.1" 200 3520 "-" "curl/7.79.1" "-"
    ```

9. 检查每个字段类型映射是否正确。 通过选择第二列中的下拉菜单来更改类型。 对于所有支持的类型，请参阅 [数据类型](https://opensearch.org/docs/latest/search-plugins/sql/datatypes/)。

    !!! Note "Note"
        您必须使用键 `time` 指定日志的日期时间。 如果未指定，将添加系统时间。

10. 指定**时间格式**。 格式语法遵循 [strptime](https://linux.die.net/man/3/strptime)。 请参见[详情](https://docs.fluentbit.io/manual/pipeline/parsers/configuring-parser#time-resolution-and-fractional-seconds)。 
11. 选择**创建**。

## 步骤 2: 创建一个日志摄入

{%
   include-markdown "create-log-ingestion.md"
%}

## 步骤 3: 在 OpenSearch 中查看您的日志

1. 在浏览器中打开 OpenSearch 控制台。
2. 创建索引
    {%
    include-markdown "../aws-services/include-index-pattern.md"
    %}
3. 转到左侧边栏中的**Discover**部分。
4. 将活动索引模式更改为 `<pipeline-index-prefix>-*`。





