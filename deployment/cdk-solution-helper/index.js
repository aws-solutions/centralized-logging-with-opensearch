// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// Imports
const fs = require('fs');
const _regex = /[\w]*AssetParameters/g; //this regular express also takes into account lambda functions defined in nested stacks

// Paths
const global_s3_assets = '../global-s3-assets';

// For each template in global_s3_assets ...
fs.readdirSync(global_s3_assets).forEach(file => {

  // Import and parse template file
  const raw_template = fs.readFileSync(`${global_s3_assets}/${file}`);
  let template = JSON.parse(raw_template);

  // Clean-up Lambda function code dependencies
  const resources = (template.Resources) ? template.Resources : {};
  const lambdaFunctions = Object.keys(resources).filter(function (key) {
    return resources[key].Type === "AWS::Lambda::Function";
  });
  lambdaFunctions.forEach(function (f) {
    const fn = template.Resources[f];
    if (fn.Properties.Code.hasOwnProperty('S3Bucket')) {
      // Set the S3 key reference
      let s3Key = Object.assign(fn.Properties.Code.S3Key);
      // https://github.com/aws/aws-cdk/issues/10608
      if (!s3Key.endsWith('.zip')) {
        fn.Properties.Code.S3Key = `%%SOLUTION_NAME%%/%%VERSION%%/${s3Key}.zip`;
      } else {
        fn.Properties.Code.S3Key = `%%SOLUTION_NAME%%/%%VERSION%%/${s3Key}`;
      }
      // Set the S3 bucket reference
      fn.Properties.Code.S3Bucket = {
        'Fn::Sub': '%%BUCKET_NAME%%-${AWS::Region}'
      };
    }
  });

  // Clean-up Lambda Layer code dependencies
  const lambdaLayers = Object.keys(resources).filter(function (key) {
    return resources[key].Type === "AWS::Lambda::LayerVersion";
  })
  lambdaLayers.forEach(function (l) {
    const layer = template.Resources[l];
    if (layer.Properties.Content.hasOwnProperty('S3Bucket')) {
      let s3Key = Object.assign(layer.Properties.Content.S3Key);
      layer.Properties.Content.S3Key = `%%SOLUTION_NAME%%/%%VERSION%%/${s3Key}`;
      layer.Properties.Content.S3Bucket = {
        'Fn::Sub': '%%BUCKET_NAME%%-${AWS::Region}'
      }
    }
  })

  // Clean-up Custom::CDKBucketDeployment
  const bucketDeployments = Object.keys(resources).filter(function (key) {
    return resources[key].Type === "Custom::CDKBucketDeployment"
  })
  bucketDeployments.forEach(function (d) {
    const deployment = template.Resources[d];
    if (deployment.Properties.hasOwnProperty('SourceBucketNames')) {
      let s3Key = Object.assign(deployment.Properties.SourceObjectKeys[0]);
      deployment.Properties.SourceObjectKeys = [
        `%%SOLUTION_NAME%%/%%VERSION%%/${s3Key}`
      ]
      deployment.Properties.SourceBucketNames = [
        {
          'Fn::Sub': '%%BUCKET_NAME%%-${AWS::Region}'
        }
      ]
    }
  })

  // Clean-up CustomCDKBucketDeployment Policy
  const bucketDeploymentsPolicy = Object.keys(resources).filter(function (key) {
    return key.startsWith("CustomCDKBucketDeployment") && resources[key].Type === "AWS::IAM::Policy"
  })

  bucketDeploymentsPolicy.forEach(function (d) {
    const policy = template.Resources[d];
    let resources = policy.Properties.PolicyDocument.Statement[0].Resource
    resources.forEach((res) => {
      res['Fn::Join'].forEach((key) => {
        if (key[2] == ':s3:::') {
          key[3]['Fn::Sub'] = '%%BUCKET_NAME%%-${AWS::Region}'
        }
      })
    })
  })

	const nestedStacks = Object.keys(resources).filter(function (key) {
		return resources[key].Type === "AWS::CloudFormation::Stack";
	});

	nestedStacks.forEach(function (f) {
		const fn = template.Resources[f];
		if (!fn.Metadata.hasOwnProperty("aws:asset:path")) {
			throw new Error("Nested stack construct missing file name metadata");
		}
		fn.Properties.TemplateURL = {
			"Fn::Join": [
				"",
				[
					"https://%%TEMPLATE_BUCKET_NAME%%.s3.",
					{
						Ref: "AWS::URLSuffix",
					},
					"/",
					`%%SOLUTION_NAME%%/%%VERSION%%/${fn.Metadata["aws:asset:path"].slice(0, -".json".length)}`,
				],
			],
		};

		const params = fn.Properties.Parameters ? fn.Properties.Parameters : {};
		const nestedStackParameters = Object.keys(params).filter(function (key) {
			if (key.search(_regex) > -1) {
				return true;
			}
			return false;
		});

		nestedStackParameters.forEach(function (stkParam) {
			fn.Properties.Parameters[stkParam] = undefined;
		});
	});  

  // Clean-up parameters section
  const parameters = (template.Parameters) ? template.Parameters : {};
  const assetParameters = Object.keys(parameters).filter(function (key) {
    if (key.search(_regex) > -1) {
      return true;
    }
    return false;
  });
  assetParameters.forEach(function (a) {
    template.Parameters[a] = undefined;
  });

  // Clean-up BootstrapVersion parameter
  if (parameters.hasOwnProperty('BootstrapVersion')) {
    parameters.BootstrapVersion = undefined
  }

  // Clean-up CheckBootstrapVersion Rule
  const rules = (template.Rules) ? template.Rules : {};
  if (rules.hasOwnProperty('CheckBootstrapVersion')) {
    rules.CheckBootstrapVersion = undefined
  }


  // Output modified template file
  const output_template = JSON.stringify(template, null, 2);
  fs.writeFileSync(`${global_s3_assets}/${file}`, output_template);
});
