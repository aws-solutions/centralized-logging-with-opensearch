# Clean Up

## (Optional) Delete EKS Cluster
!!! Warning "Info"

     You need to clean up EKS only if you have setup EKS Cluster during this workshop

1. Undeploy the applications. Go to the Cloud9 workspace created in [Pre-request](../deployment/create-eks.md#create-a-workspace)
```commandline
kubectl delete -f fluent-bit-logging.yaml
kubectl delete -f nginx.yaml
```
2. Delete the EKS Cluster
```commandline
eksctl delete cluster --name=loghub-workshop-eks
```
3. Delete the workspace
    * Go to your Cloud9 Environment through <a href="https://us-east-1.console.aws.amazon.com/cloud9/home?region=us-east-1" target="_blank">AWS Management Console</a>
    * Select the environment named **eksworkspace** and **delete**

## Delete Stacks
Please follow the steps to clean up all the stacks:

1. Go to <a href="https://console.aws.amazon.com/vpc/home?region=us-east-1#vpcs:" target="_blank">AWS Management Console > VPC</a>. Delete the VPC peering.

2. Go to <a href="https://console.aws.amazon.com/ec2/v2/home?region=us-east-1#Instances:" target="_blank">AWS Management Console > EC2</a>. Detach created policy from Instance named **`LoghubWorkshop/workshopASG`**

3. Go to <a href="https://console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks?filteringStatus=active&filteringText=&viewNested=true&hideStacks=false" target="_blank">AWS Management Console > CloudFormation</a>. Detete all the log pipelines

4. Delete proxy stack

5. Delete **WorkshopDemo** stack

6. Delete **LogHub** stack
