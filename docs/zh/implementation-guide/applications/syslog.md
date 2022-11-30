# Syslog
Syslog 用作生成、转发和收集在 Linux 实例、路由器或网络设备上生成的日志的标准。 您可以将 Log Hub 配置为摄取Syslog。

!!! important "重要"

    请确保您的 Syslog 生成器/发送器的子网连接到 Log Hub 的**两个**私有子网，以便提取日志，您需要使用 VPC [Peering Connection][peering-connection] 或 [Transit Gateway][tgw] 来连接这些 VPC。

## 前提条件
{%
include-markdown "include-prerequisites.md"
%}

## 步骤 1: 创建一个 Syslog 日志配置

1. 登录 Log Hub 控制台。
2. 在左侧边栏中的 **资源** 下，选择 **日志配置**。
3. 单击**创建日志配置**按钮。
4. 指定**配置名称**。
5. 在日志类型下拉菜单中选择**Syslog**。

1. Sign in to the Log Hub Console.
2. In the left sidebar, under **Resources**, choose **Log Config**.
3. Click the **Create a log config** button.
4. Specify **Config Name**.
5. 这里我们以日志类型下拉菜单中的**Syslog** 为例。 但是Log Hub也支持[JSON](./json.md)格式和[Single-Line test](./single-line-text.md)格式的Syslog，可以参考相应教程创建日志配置 .

### RFC5424
1. 粘贴示例 RFC5424 日志。 例如：

    ```log
    <35>1 2013-10-11T22:14:15Z client_machine su - - - 'su root' failed for joe on /dev/pts/2
    ```

2. 点击**解析日志**.

3. 检查每个字段类型映射是否正确。 通过选择第二列中的下拉菜单来更改类型。 对于所有支持的类型，请参阅 [数据类型](https://opensearch.org/docs/latest/search-plugins/sql/datatypes/)。

    !!! Note "Note"
        您必须使用键 `time` 指定日志的日期时间。 如果未指定，将添加系统时间。

4. 指定**时间格式**。 格式语法遵循 [strptime](https://linux.die.net/man/3/strptime)。 请参见[详情](https://docs.fluentbit.io/manual/pipeline/parsers/configuring-parser#time-resolution-and-fractional-seconds)。 
例如:

    ```log
    %Y-%m-%dT%H:%M:%SZ
    ```

5. （可选）在 **Filter** 部分，添加一些条件以在日志代理端过滤日志。该解决方案将仅摄入与所有指定条件匹配的日志。

6. 选择**创建**。

### RFC3164
1. 粘贴示例 RFC3164 日志。 例如：

    ```log
    <35>Oct 12 22:14:15 client_machine su: 'su root' failed for joe on /dev/pts/2
    ```

2. 点击**解析日志**.

3. 检查每个字段类型映射是否正确。 通过选择第二列中的下拉菜单来更改类型。 对于所有支持的类型，请参阅 [数据类型](https://opensearch.org/docs/latest/search-plugins/sql/datatypes/)。

    !!! Note "Note"
        您必须使用键 `time` 指定日志的日期时间。 如果未指定，将添加系统时间。

        由于 RFC3164 的时间戳中没有年份，因此无法在 Amazon OpenSearch 的发现界面中显示为时间直方图。

4. 指定**时间格式**。 格式语法遵循 [strptime](https://linux.die.net/man/3/strptime)。 请参见[详情](https://docs.fluentbit.io/manual/pipeline/parsers/configuring-parser#time-resolution-and-fractional-seconds)。 
例如:
    ```log
    %b %m %H:%M:%S
    ```

5. （可选）在 **Filter** 部分，添加一些条件以在日志代理端过滤日志。该解决方案将仅摄入与所有指定条件匹配的日志。

6. 选择**创建**。

### 自定义
1. 在 **Syslog Format** 部分，粘贴您的 Syslog 日志格式配置。 它的格式为`/etc/rsyslog.conf`，以`template`或`$template`开头。 格式语法遵循 [Syslog 消息格式](https://www.rfc-editor.org/rfc/rfc5424?spm=a2c4g.11186623.0.0.21324a0fUixMd5#:~:text=2009%0A%0A%0A6.-,Syslog%20Message%20Format,-The%20syslog%20message).  例如:

    ```
    <%pri%>1 %timestamp:::date-rfc3339% %HOSTNAME% %app-name% %procid% %msgid% %msg%\n
    ```

2. 在 **Sample log parsing** 部分，粘贴示例 Nginx 日志以验证日志解析是否成功。 例如：
    ```
    <35>1 2013-10-11T22:14:15.003Z client_machine su - - 'su root' failed for joe on /dev/pts/2
    ```

3. 检查每个字段类型映射是否正确。 通过选择第二列中的下拉菜单来更改类型。 对于所有支持的类型，请参阅 [数据类型](https://opensearch.org/docs/latest/search-plugins/sql/datatypes/)。

    !!! Note "Note"
        您必须使用键 `time` 指定日志的日期时间。 如果未指定，将添加系统时间。

4. 指定**时间格式**。 格式语法遵循 [strptime](https://linux.die.net/man/3/strptime)。 请参见[详情](https://docs.fluentbit.io/manual/pipeline/parsers/configuring-parser#time-resolution-and-fractional-seconds)。 

5. （可选）在 **Filter** 部分，添加一些条件以在日志代理端过滤日志。该解决方案将仅摄入与所有指定条件匹配的日志。

6. 选择**创建**。

## 步骤 2: 创建一个日志摄入

{%
   include-markdown "create-log-ingestion.md"
   start="<!--syslog-start-->"
   end="<!--syslog-end-->"
%}

## 步骤 3：配置 Syslog 生成器以将日志发送到 Log Hub

1. 单击在**步骤 2** 中创建的摄取 ID。
2. 对于 [Rsyslog][rsyslog] 用户，请按照 Syslog 配置指南配置 Rsyslog 代理。 您还可以在此页面中获取 NLB DNS 名称。

## 步骤 4: 在 OpenSearch 中查看您的日志

1. 在浏览器中打开 OpenSearch 控制台。
2. 创建索引
    {%
    include-markdown "../aws-services/include-index-pattern.md"
    %}
3. 转到左侧边栏中的**Discover**部分。
4. 将活动索引模式更改为 `<pipeline-index-prefix>-*`。

[peering-connection]: https://docs.aws.amazon.com/vpc/latest/peering/working-with-vpc-peering.html
[tgw]: https://docs.aws.amazon.com/vpc/latest/tgw/what-is-transit-gateway.html
[rsyslog]: https://www.rsyslog.com/


