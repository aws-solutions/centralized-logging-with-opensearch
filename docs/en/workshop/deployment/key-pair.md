# EC2 Key Pair
> Estimated time: 2 minutes

!!! Note "Note"

     We deploy all the things in **US East (N. Virginia)** Region, so please make sure you are in the correct region!

During the deployment of Log Hub, we need a key pair to initiate several EC2 instances to host Nginx server acting as proxy for OpenSearch Dashboards. So if you are using a new AWS account, please follow the steps below to create a new key pair:

1. Go to <a href="https://console.aws.amazon.com/ec2/v2/home?region=us-east-1#KeyPairs:" target="_blank">AWS EC2 console > Key pairs</a>

2. Click **Create key pair** on right-upper corner of the page

3. Type your own key-pair name and create, then automated download will initiate
