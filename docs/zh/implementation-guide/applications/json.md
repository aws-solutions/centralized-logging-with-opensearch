# JSON 格式日志

您可以将日志通配置为摄取 JSON 日志。

## 前提条件
{%
include-markdown "include-prerequisites.md"
%}

## 步骤 1: 创建一个 JSON 日志配置

1. 登录日志通控制台。
2. 在左侧边栏中的 **资源** 下，选择 **日志配置**。
3. 单击**创建日志配置**按钮。
4. 指定**配置名称**。
5. 指定**日志路径**。 您可以使用 `,` 分隔多个路径。
6. 在日志类型下拉列表中选择**JSON**。
7. 在**示例日志解析**部分，粘贴一个示例 JSON 日志，点击**解析日志**，验证日志解析是否成功。

    如:
    ```json
    {"host":"81.95.250.9", "user-identifier":"-", "time":"08/Mar/2022:06:28:03 +0000", "method": "PATCH", "request": "/clicks-and-mortar/24%2f7", "protocol":"HTTP/2.0", "status":502, "bytes":24337, "referer": "http://www.investorturn-key.net/functionalities/innovative/integrated"}
    ```

8. 检查每个字段类型映射是否正确。 您可以通过选择第二列中的下拉菜单来更改类型。 对于所有支持的类型，请参阅 [数据类型](https://opensearch.org/docs/latest/search-plugins/sql/datatypes/)。

    !!! Note "注意"

        您必须使用键 `time` 指定日志的日期时间。 如果未指定，将添加系统时间。

9. 指定**时间格式**。 格式语法遵循 [strptime](https://linux.die.net/man/3/strptime)。 请参见[详情](https://docs.fluentbit.io/manual/pipeline/parsers/configuring-parser#time-resolution-and-fractional-seconds) 。

10. （可选）在**过滤器**部分，您可以在日志代理端启用并添加一些条件来过滤日志。日志通解决方案将仅收集符合所有指定条件的日志。

11. 选择**创建**。

## 步骤 2：创建应用程序日志摄取

创建步骤类似于为单行文本创建应用程序日志摄取。 有关详细信息，请参阅 [单行文本](./single-line-text.md)。

## 第 3 步：在 OpenSearch 中查看您的日志

1. 在浏览器中打开 OpenSearch 仪表板。
2. 创建索引
    {%
    include-markdown "../aws-services/include-index-pattern.md"
    %}
3. 转到左侧边栏中的 **Discover** 部分。
4. 将活动索引模式更改为 `<pipeline-index-prefix>-*`。





