# Setting up Grafana Environment - Optional

This section introduces how to set up Grafana environment. If you want the solution to generate dashboards in Grafana automatically, you need to perform the following deployment. If you only want to store the data in Amazon S3 without creating dashboards, you can skip this section.

## Step 1: Install Grafana

!!! note "Note"
    Skip this step if you already have a Grafana environment.

Prerequisites:

2. An EC2 instance has been launched, supporting both x86 and ARM architectures.

The following steps provide an example using m6g.medium instance type, ARM architecture, and Amazon 2023. For details, refer to [Install Grafana](https://grafana.com/docs/grafana/latest/setup-grafana/installation/){target='_blank'}. 

Follow below steps:
```bash
# Edit/etc/yum.repos.d/grafana.repo file，input below content
[grafana]
name=grafana
baseurl=https://rpm.grafana.com
repo_gpgcheck=1
enabled=1
gpgcheck=1
gpgkey=https://rpm.grafana.com/gpg.key
sslverify=1
sslcacert=/etc/pki/tls/certs/ca-bundle.crt

# install grafana
yum install -y grafana

# Start grafana，and check its running status
systemctl start grafana-server
systemctl status grafana-server


# grafana listens on port 3000 by default, Users can edit /etc/grafana/grafana.ini to modify the configuration

# Access grafana，using the default credentials admin / admin，you will be promoted to change the password on the first login.
http://{instance-ip}:3000/

# If you need public access, please configure an Application Load Balancer (ALB) on your own.
# When configuring the ALB, modify the Idle timeout to 1800 to avoid the following error during large data queries (when a single API call exceeds 60 seconds)：
# “a padding to disable MSIE and Chrome friendly error page”

```

## Step 2: Authorize the EC2 where Grafana is located to access Athena
Prerequisites:

1. You have deployed Grafana on EC2.

2. EC2 has been configured with an IAM Instance Profile. The corresponding Role Arn of the Instance Profile should be recorded. All the following content will be referred to as "EC2 IAM Instance Profile."

Follow below steps:

1.	Access [IAM ManagementConsole](https://console.aws.amazon.com/iam/home){target='_blank'}.
2.	Search for the role including "AthenaPublicAccessRole" and click on it to access the details page. Record the Role Arn, which will be used later.
3.	Click on "Trust relationships."
4.	Click on "Edit trust policy."
5.	Click on "Add a principal."
6.	Select "IAM Roles."
7.	Enter the "EC2 IAM Instance Profile."
8.	Click on "Add principal."
9.	Click on "Update Policy."

## Step 3: Install Amazon Athena Plugins
Prerequisites:

1.	Grafana is installed.
2.	Grafana is accessible over the public network.


Follow below steps:

1.	Open the Grafana console page.
2.	Select "Administration" from the left menu bar, then choose "Plugins."
3.	On the right side, select "All" in the "State" section.
4.	In the search box, enter "Athena" and click on the "Amazon Athena" result to access the details page.
5.	Click the "Install" button on the page and wait for the plugin installation to complete.

## Step 4: Create Service Accounts
Follow below steps:

1.	Open the Grafana console page.
2.	Select "Administration" from the left menu bar, then choose "Service accounts."
3.	Select "Add service account."
4.	Enter the Display name, for example, "test".
5.	Select the Role as "Admin."
6.	Click "Create."
7.	Click "Add service account token" on the page.
8.	Click "Generate token."
9.	Click "Copy to clipboard and close."
10.	Save and record this token, which will be used when you need to create a pipeline.

