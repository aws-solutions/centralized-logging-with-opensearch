# Create EKS Cluster
> Estimated time: 20 minutes

### Must Read
1. Make sure you have **one** extra vacancy VPC which will be used for EKS Cluster.
2. Make sure you have **one** extra EIP (Elastic IP address) vacancy for NAT used by EKS Cluster.

## Create a Workspace

### Launch Cloud9

!!! Warning "Warning"

    If you already have a Cloud 9 Environment. Just open the existing IDE in the Cloud9 console.


1. Create a Cloud9 Environment through <a href="https://us-east-1.console.aws.amazon.com/cloud9/home?region=us-east-1" target="_blank">AWS Management Console</a>
2. Select **Create environment**
3. Name it **eksworkspace**, click Next.
4. Choose **t3.small** for instance type, take all default values and click **Create environment**

When it comes up, close the welcome tab, and Open a new **terminal tab**.

![Cloud9-1](../../images/workshop/cloud9-1.png)

![Cloud9-2](../../images/workshop/cloud9-2.png)


Your workspace should now look like this:

![Cloud9-3](../../images/workshop/cloud9-3.png)

Upgrade AWS Cli version by running the command below in the **terminal**
```commandline
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

### Grand AdministratorAccess to the workspace

1. Click the top-right grey circle button and select **Manage EC2 Instance**

![Cloud9-role](../../images/workshop/cloud9-role.png)

2. Select the instance, then choose **Security Tab**.
3. If your EC2 have an IAM Role already, Click the IAM Role and add **AdministratorAccess** to the permission.
4. If your EC2 does not have an IAM Role created. Create an IAM Role and attach to it.
    - Follow <a href="https://console.aws.amazon.com/iam/home#/roles$new?step=review&commonUseCase=EC2%2BEC2&selectedUseCase=EC2&policies=arn:aws:iam::aws:policy%2FAdministratorAccess&roleName=loghubworkshop-admin" target="_blank">this link to create an IAM role with Administrator access</a>
    - Confirm that **AWS service** and **EC2** are selected, then click **Next: Permission** to view permissions.
    - Confirm that **AdministratorAccess** is checked, then click **Next: Tags** to assign tags.
    - Take the defaults, and click **Next: Review** to review.
    - Confirm that **loghubworkshop-admin** is filled in as Name, and click Create role.
    - Go back to your EC2, choose **Actions / Security / Modify IAM Role**, and add **loghubworkshop-admin**

### Update IAM Settings for your workspace

!!! Warning "Info"

    Cloud9 normally manages IAM credentials dynamically. This isn’t currently compatible with the EKS IAM authentication, so we will disable it and rely on the IAM role instead.

1. To ensure temporary credentials aren’t already in place we will remove any existing credentials file as well as disabling AWS managed temporary credentials:
```commandline
aws cloud9 update-environment  --environment-id $C9_PID --managed-credentials-action DISABLE
rm -vf ${HOME}/.aws/credentials
```
2. Configure our aws cli with us-east-1 as default
```commandline
aws configure set default.region us-east-1
```

### Install Kubernetes Tools

!!! Warning "Warning"

    In this workshop, we will use kubectl v1.22.

In your workspace (Cloud9 IDE), run the command below:
```commandline
curl -LO https://dl.k8s.io/release/v1.22.0/bin/linux/amd64/kubectl
sudo chmod 755 ./kubectl
sudo mv ./kubectl /usr/local/bin
```

### Install eksctl

In your workspace (Cloud9 IDE), run the command below:

```commandline
curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
sudo mv -v /tmp/eksctl /usr/local/bin
```


## Create an EKS Cluster
1. In your workspace, create a new file **eks.yaml**.

    ![Cloud9-eks-1](../../images/workshop/cloud9-eks-1.png)

2. Copy and paste the content below in eks.yaml file created above and save:
```yaml
---
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: loghub-workshop-eks
  region: us-east-1
  version: "1.22"
iam:
  withOIDC: true
managedNodeGroups:
- name: workshop-nodes
  desiredCapacity: 1
  instanceType: m6g.large
  privateNetworking: true
  securityGroups:
    attachIDs: ["{SecurityGroup_ID}"]
  ssh:
    enableSsm: true
vpc:
  id: "{VPC_ID}"
  subnets:
    private:
      us-east-1a:
          id: "{SUBNET_us_east_1a}"
      us-east-1b:
          id: "{SUBNET_us_east_1b}"
```
3. Replace the `{VPC_ID}`, `{SUBNET_us_east_1a}`, `{SUBNET_us_east_1b}` with the value which can be found below 
    - Go to [AWS Console > VPC > Subnets](https://us-east-1.console.aws.amazon.com/vpc/home?region=us-east-1#subnets:search=LoghubWorkshop/workshopVpc/privateSubnet){target="_blank"}
    - Use the value of `VPC` and `Subnet`. Please be careful that the subnets are different in each availability zones.

          ![eks-network](../../images/workshop/eks-network.png)

4. Find and replace the `{SecurityGroup_ID}`. 
    - Go to [AWS Console > OpenSearch](https://us-east-1.console.aws.amazon.com/esv3/home?region=us-east-1#opensearch/domains/workshop-os){target="_blank"}. Which is created during [Create Demo Website](./deploy-demo-web-site.md)
    - Use the value of `Security group`.

          ![eks-network-sg](../../images/workshop/eks-network-sg.png)
   
5. run the command to create EKS
```commandline
eksctl create cluster -f eks.yaml
```
6. Wait till success

## Deploy Nginx in EKS
1. create a new file nginx.yaml with the content below and save:
```yaml
---
apiVersion: v1
kind: Namespace
metadata:
  name: nginx-ns
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: nginx-user
  namespace: nginx-ns
---        
apiVersion: apps/v1
kind: Deployment
metadata:
  namespace: nginx-ns
  name: app-nginx-demo
  labels:
    app.kubernetes.io/name: app-nginx-demo
    version: v1
spec:
  replicas: 1
  selector:
    matchLabels:
      app: app-nginx-demo
  strategy:
    rollingUpdate:
      maxSurge: 25%
      maxUnavailable: 25%
    type: RollingUpdate
  template:
    metadata:
      labels:
        app: app-nginx-demo
    spec:
      serviceAccountName: nginx-user
      containers:
      - image: nginx:1.20
        imagePullPolicy: Always
        name: nginx
        ports:
        - containerPort: 80
          protocol: TCP

---
apiVersion: v1
kind: Service
metadata:
  name: nginx-service
  namespace: nginx-ns
spec:
  type: LoadBalancer
  selector:
    app: app-nginx-demo
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
```
2. Deploy nginx
```commandline
kubectl apply -f nginx.yaml
```
3. make sure that nginx pod is running
```commandline
kubectl get pods -n nginx-ns
```
