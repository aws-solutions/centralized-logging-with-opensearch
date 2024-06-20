<powershell>
#Solution Version is ${SOLUTION_VERSION}
$token = Invoke-RestMethod -Headers @{"X-aws-ec2-metadata-token-ttl-seconds" = "21600"} -Method PUT -Uri http://169.254.169.254/latest/api/token
$CURRENT_REGION=Invoke-RestMethod -Headers @{"X-aws-ec2-metadata-token" = $token} -Method GET -Uri http://169.254.169.254/latest/meta-data/placement/region

$AWSCli2Installed = Get-Command aws -ErrorAction SilentlyContinue

if ($AWSCli2Installed) {
  Write-Output "skip installation since aws cli has already been installed."
} 
else {
  #install AWSCli2  
  Write-Output "install AWSCli2..."
  msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi /qn
}  
#download and install FluentBit
if ( ($CURRENT_REGION -eq "cn-northwest-1") -or ($CURRENT_REGION -eq "cn-north-1") ) {
  curl -o C:/fluent-bit-2.2.0-win64.zip https://aws-solutions-assets.s3.cn-north-1.amazonaws.com.cn/clo/v2.2.0/aws-for-fluent-bit/fluent-bit-3.0.4-win64.zip
}
else {
  #download and install FluentBit from China Region
  curl -o C:/fluent-bit-2.2.0-win64.zip https://packages.fluentbit.io/windows/fluent-bit-3.0.4-win64.zip
}
Expand-Archive -Path C:/fluent-bit-2.2.0-win64.zip -Force -DestinationPath C:/
New-Item -ItemType Directory -Path "C:/fluent-bit-2.2.0-win64/etc"
(Get-Content C:/fluent-bit-2.2.0-win64/conf/fluent-bit.conf) -replace "http_server  Off","http_server  On"|Set-Content C:/fluent-bit-2.2.0-win64/conf/fluent-bit.conf -Force
(Get-Content C:/fluent-bit-2.2.0-win64/conf/fluent-bit.conf) -replace "http_port    2020","http_port    2022"|Set-Content C:/fluent-bit-2.2.0-win64/conf/fluent-bit.conf -Force
Copy-Item -Path C:/fluent-bit-2.2.0-win64/conf/* -Force -Destination C:/fluent-bit-2.2.0-win64/etc -Recurse
xcopy C:\fluent-bit-2.2.0-win64 C:\fluent-bit\ /s /e /y
$env:AWS_DEFAULT_REGION = $CURRENT_REGION
C:\"Program Files"\Amazon\AWSCLIV2\aws.exe s3 cp s3://${BUCKET_NAME}/app_log_config/${ASG_NAME}/applog_parsers.conf C:/fluent-bit/etc/
C:\"Program Files"\Amazon\AWSCLIV2\aws.exe s3 cp s3://${BUCKET_NAME}/app_log_config/${ASG_NAME}/fluent-bit.conf C:/fluent-bit/etc/
New-Service fluent-bit -BinaryPathName "C:/fluent-bit/bin/fluent-bit.exe -c C:/fluent-bit/etc/fluent-bit.conf" -StartupType Automatic
Start-Service fluent-bit


</powershell>