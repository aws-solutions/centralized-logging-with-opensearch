# Customization

This solution is built using AWS Cloud Development Kit (CDK). You can customize the solution by following the steps below.


## Prerequisites

Before you start customizing the solution, make sure you have the following prerequisites on your local machine:

- Python (>=3.9)
- NodeJS (v18 or later)
- Docker

> if you are using ARM CPU like Apple M1 chip, please run `export DOCKER_DEFAULT_PLATFORM=linux/amd64` for building amd64 container image.

Clone the repository and make desired code changes.

```
git clone aws-solutions/centralized-logging-with-opensearch
```


## File Structure

The following is the file structure of the solution. You can customize the solution by modifying the files in the `source` directory.

```
├── deployment/                             - contains build scripts, deployment templates, and dist folders for staging assets.
│   ├── cdk-solution-helper/                - helper function for converting CDK output to a format compatible with the AWS Solutions pipelines.
│   ├── build-open-source-dist.sh           - builds the open source package with cleaned assets and builds a .zip file in the /open-source folder for distribution to GitHub
│   ├── build-s3-dist.sh                    - builds the solution and copies artifacts to the appropriate /global-s3-assets or /regional-s3-assets folders.
├── source/
│   ├── constructs
│   │   ├── bin
│   │   │   └── main.ts                     - the main CDK stack for your solution.
│   │   ├── graphql                         - the graphql definition for the solution's backend APIs
│   │   ├── lambda                          - the source code for the solution's lambda functions
│   │   ├── lib                             - the CDK stacks.
│   │   ├── test                            - stack test cases
|   │   ├── cdk.json                        - config file for CDK.
|   │   ├── jest.config.js                  - config file for unit tests.
|   │   ├── package.json                    - package file for the CDK project.
|   │   ├── README.md                       - doc file for the CDK project.
│   ├── portal                              - react app that serves as user interface for this solution
│   ├── run-all-tests.sh                    - runs all tests within the /source folder. Referenced in the buildspec and build scripts.
├── .gitignore
├── buildspec.yml                           - main build specification for CodeBuild to perform builds and execute unit tests.
├── CHANGELOG.md                            - required for every solution to include changes based on version to auto-build release notes.
├── CODE_OF_CONDUCT.md                      - standardized open source file for all solutions.
├── CONTRIBUTING.md                         - standardized open source file for all solutions.
├── LICENSE.txt                             - required open source file for all solutions - should contain the Apache 2.0 license.
├── NOTICE.txt                              - required open source file for all solutions - should contain references to all 3rd party libraries.
├── README.md                               - required file for all solutions.
```

## Unit Test

After you have customized the solution. Run the unit tests to ensure the solution is working as expected. Review the generated coverage report.

```
cd ./source
chmod +x ./run-all-tests.sh
./run-all-tests.sh
cd ..
```

## Build

To build your customized distributable follow given steps.

- Configure the solution name, version number and bucket name

```
export DIST_OUTPUT_BUCKET=my-bucket-name # bucket where customized code will reside
export TEMPLATE_OUTPUT_BUCKET=my-bucket-name # same as DIST_OUTPUT_BUCKET
export SOLUTION_NAME=my-solution-name # e.g., centralized-logging-with-opensearch
export SOLUTION_TRADEMARKEDNAME=my-solution-name # same as SOLUTION_NAME (e.g., centralized-logging-with-opensearch)
export VERSION=my-version # version number for the customized code (e.g., v2.1.9)
export REGION=aws-region-code # the AWS region to launch the solution (e.g., us-east-1)
```

_Note:_ You would have to create an S3 bucket with the prefix 'my-bucket-name-<aws_region>'; aws_region is where you are testing the customized solution. Also, the assets in bucket should be publicly accessible.

- Build the distributable using build-s3-dist.sh

```
cd ./deployment
chmod +x ./build-s3-dist.sh
./build-s3-dist.sh $DIST_OUTPUT_BUCKET $SOLUTION_NAME $VERSION
cd ..
```


## Upload distributable

Upload the distributable to an Amazon S3 bucket in your account. 

```
cd ./deployment
aws s3 cp ./global-s3-assets/ s3://$DIST_OUTPUT_BUCKET/$SOLUTION_NAME/$VERSION/ --recursive --acl bucket-owner-full-control
aws s3 cp ./regional-s3-assets/ s3://$DIST_OUTPUT_BUCKET-$REGION/$SOLUTION_NAME/$VERSION/ --recursive --acl bucket-owner-full-control
cd ..
```

_Note:_ you must have the AWS Command Line Interface installed.


## Deploy

Once you have uploaded the distributable to your Amazon S3 bucket, you can start the deployment.

- Deploy via CloudFormation

    Get the link of the solution template uploaded to your Amazon S3 bucket.

    Then you can deploy the solution to your account by launching a new AWS CloudFormation stack using the link of the solution template in Amazon S3.

- Deploy via CDK

    In case your accounts have not been bootstrapped for cdk yet, run:

    ```
    npx cdk bootstrap
    ```

    Then run:
    ```
    cd ./source/constructs
    npx cdk deploy centralized-logging-with-opensearch --parameters adminEmail=<your email address>
    ```

