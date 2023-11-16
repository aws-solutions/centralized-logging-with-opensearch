# 准备Grafana环境 - 可选

此步骤非必需操作，如果您希望解决方案自动生成Dashboards到Grafana中，那么您需要执行以下部署，如果您只希望数据存储到S3中，并不需要创建Dashboards，那么可以忽略此步骤。

## 步骤 1: 安装Grafana - 可选

前提条件:

1. 如您已有Grafana环境，可跳过此步骤
2. 已启动EC2实例，x86 / ARM架构均可
3. 操作步骤以m6g.medium、Arm架构、Amazon 2023为例，安装步骤可参考 [此处](https://grafana.com/docs/grafana/latest/setup-grafana/installation/){target='_blank'}. 

操作步骤:
```bash
# 编辑/etc/yum.repos.d/grafana.repo文件，填入以下内容
[grafana]
name=grafana
baseurl=https://rpm.grafana.com
repo_gpgcheck=1
enabled=1
gpgcheck=1
gpgkey=https://rpm.grafana.com/gpg.key
sslverify=1
sslcacert=/etc/pki/tls/certs/ca-bundle.crt

# 安装grafana
yum install -y grafana

# 启动grafana，并查看运行状态
systemctl start grafana-server
systemctl status grafana-server


# grafana默认监听3000端口，用户可以编辑/etc/grafana/grafana.ini进行修改

# 访问grafana，默认账号密码为admin / admin，第一次登录需要修改密码
http://{instance-ip}:3000/

# 如果需要公网访问，请自行配置ALB
# 配置ALB时需要修改Idle timeout为1800，避免大数据量查询时（单次API调用超过60秒）出现以下错误：
# “a padding to disable MSIE and Chrome friendly error page”

```

## 步骤 2:  授权Grafana所在EC2 访问Athena权限
前提条件:

1. 用户在EC2部署Grafana
2. EC2已配置IAM Instance Profile，需记录对应Instance profile的Role Arn，以下内容统一称为“EC2 IAM Instance Profile”

Follow below steps:

1. 打开IAM [控制台](https://console.aws.amazon.com/iam/home){target='_blank'}
2. 菜单条中选择“Roles”
3. 搜索“AthenaPublicAccessRole”，点击进入详情页面，并记录Role Arn，之后内容统一称为“AthenaPublicAccessRole”
4. 点击“Trust relationships”
5. 点击 “Edit trust policy”
6. 点击 “Add a principal”
7. 选择 “IAM Roles”
8. 输入 “EC2 IAM Instance Profile”
9. 点击 “Add principal”
10. 点击 “Update Policy”

## 步骤 3: 安装Amazon Athena Plugins
前提条件:

1. 已安装Grafana
2. Grafana可访问公网

操作步骤:

1. 打开Grafana控制台页面
2. 左侧菜单条选择Administration → Plugins
3. 右侧的“State”选择All
4. 在搜索框中输入“Athena”，点击搜索结果中的“Amazon Athena”，进入详情页面
5. 点击页面上的“Install”按钮，等待插件安装完成即可

## 步骤 4: 创建 Service Accounts
操作步骤:

1. 打开Grafana控制台页面
2. 左侧菜单条选择Administration → Service accounts
3. 选择“Add service account”
4. 输入Display name，例如“albertxu”
5. Role选择“Admin”
6. 点击Create
7. 点击页面中的“Add service account token”
8. 点击“Generate token”
9. 点击“Copy to clipboard and close”
10. **请保存并记录此token，后续创建Pipeline时会用到**