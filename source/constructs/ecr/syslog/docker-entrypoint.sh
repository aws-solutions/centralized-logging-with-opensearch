#!/bin/bash
echo "Download config file from $CONFIG_S3_BUCKET/$CONFIG_S3_KEY"
aws s3 sync s3://$CONFIG_S3_BUCKET/$CONFIG_S3_KEY /fluent-bit/etc/
cat /fluent-bit/etc/fluent-bit.conf

echo -n "AWS for Fluent Bit Container Image Version "
cat /AWS_FOR_FLUENT_BIT_VERSION
exec /fluent-bit/bin/fluent-bit -c /fluent-bit/etc/fluent-bit.conf