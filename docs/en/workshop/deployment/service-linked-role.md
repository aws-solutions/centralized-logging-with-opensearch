# Create service linked role for your AWS account
> Estimated time: 2 minutes

!!! Note "Note"

     It's **OK** to skip this section if your account has already deployed OpenSearch once before. Please jump to 2.3.

1. Make sure you have already setup <a href="https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html" target="_blank">AWS credentials</a> on your local machine.

2. Open up a new terminal.

3. Type in:
```
aws configure
```

3. Please double-check the access key, secret key and region are correct for your deployment account 

4. Type in:
```
aws iam create-service-linked-role --aws-service-name es.amazonaws.com
```

    This command will add a OpenSearch service linked role for you. It gives permission to OpenSearch to launch in your new created VPC.

5. If the output of that command shows a JSON format policy:
```
{
    "Role": {
        "Path": "/aws-service-role/es.amazonaws.com/",
        "RoleName": "AWSServiceRoleForAmazonElasticsearchService",
        "RoleId": "XXXXXXXXXXXXXXXXXX",
        "Arn": "arn:aws:iam::XXXXXXXXXXXXX:role/aws-service-role/es.amazonaws.com/AWSServiceRoleForAmazonElasticsearchService",
        "CreateDate": "2021-12-23T05:29:55+00:00",
        "AssumeRolePolicyDocument": {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Action": [
                        "sts:AssumeRole"
                    ],
                    "Effect": "Allow",
                    "Principal": {
                        "Service": [
                            "es.amazonaws.com"
                        ]
                    }
                }
            ]
        }
    }
}
```

That means the role has been successfully created. You can proceed to deploy demo web site.

!!! Note "Note"

     It's **OK** if it shows:

     `An error occurred (InvalidInput) when calling the CreateServiceLinkedRole operation: Service role name AWSServiceRoleForAmazonElasticsearchService has been taken in this account, please try a different suffix.`

     This is means you have already created the ES service linked role before.

