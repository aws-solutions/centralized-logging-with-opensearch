#!/usr/bin/env bash
set -eo pipefail

BUCKET=$1
if [ -z "$BUCKET" ]; then
    echo "Please specify a s3 bucket! e.g. $0 <s3-bucket-name>" && exit 1
fi 
DIRS="json/ json.gz/ singleline-text/ singleline-text.gz/"
DATE=$(date +"%Y-%m-%d_%H-%M-%S")

mkdir -p ${DIRS}

flog -f json > json/${DATE}.log
flog -f json | gzip > json.gz/${DATE}.log.gz

flog > singleline-text/${DATE}.log
flog | gzip > singleline-text.gz/${DATE}.log.gz

echo "Your logs are available at" && find ${DIRS}

echo ${DIRS} | xargs -n1 -t -I {} aws s3 cp --recursive {} s3://${BUCKET}/{}