# Clean Up

Please follow the steps to clean up all the stacks:

1. Go to <a href="https://console.aws.amazon.com/vpc/home?region=us-east-1#vpcs:" target="_blank">AWS Management Console > VPC</a>. Delete the VPC peering.

2. Go to <a href="https://console.aws.amazon.com/ec2/v2/home?region=us-east-1#Instances:" target="_blank">AWS Management Console > EC2</a>. Detach created policy from Instance named **`LoghubWorkshop/workshopASG`**

3. Go to <a href="https://console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks?filteringStatus=active&filteringText=&viewNested=true&hideStacks=false" target="_blank">AWS Management Console > CloudFormation</a>. Detete all the log pipelines

4. Delete proxy stack

5. Delete **WorkshopDemo** stack

6. Delete **LogHub** stack
