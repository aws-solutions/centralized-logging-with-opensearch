#!/usr/bin/env bash

set -eo pipefail

export AWS_PAGER=""

CURRENT_REGION="$(aws ec2 describe-availability-zones --output text --query 'AvailabilityZones[0].[RegionName]')"
IS_CHINA_REGION="$(echo "${CURRENT_REGION}" | grep ^cn-)"
INSTANCE_TYPE="m6g.large"

echo "Current region is ${CURRENT_REGION}."

if [ -n "${IS_CHINA_REGION}" ]; then
    GITHUB_HOST="hub.fastgit.xyz"
else
    GITHUB_HOST="github.com"
fi

if [[ "$1" == "x86" ]]; then
    ARCH="amd64"
elif [[ "$1" == "x64" ]]; then
    ARCH="amd64"
elif [[ "$1" == "arm" ]]; then
    ARCH="arm64"
else
    ARCH="amd64"
fi

echo "Arch is ${ARCH}."


read -p "Would you like to create a EKS Cluster? (y/n) " USER_CHOICE

if [ ${USER_CHOICE} == "y" ]; then
    echo "Creating a new EKS Cluster"
    if [ ${ARCH} == "amd64" ]; then
        KUBECTL_URL="https://dl.k8s.io/release/v1.22.0/bin/linux/amd64/kubectl"
        EKSCTL_URL="https://${GITHUB_HOST}/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz"
    else
        KUBECTL_URL="https://dl.k8s.io/release/v1.22.0/bin/linux/arm64/kubectl"
        EKSCTL_URL="https://${GITHUB_HOST}/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_arm64.tar.gz"
    fi

    if ! [ -x "$(which kubectl)" ]; then
        echo "Install KubeCTL for ${ARCH} ..."
        curl -LO ${KUBECTL_URL}
        sudo chmod 755 ./kubectl
        sudo mv ./kubectl /usr/local/bin
    else
        echo "Already installed KubeCTL, skip KubeCTL installation."
    fi

    if ! [ -x "$(which eksctl)" ]; then
        echo "Install EKSCTL for ${ARCH} ..."
        echo $EKSCTL_URL
        curl -L ${EKSCTL_URL} | tar xz -C /tmp
        sudo mv -v /tmp/eksctl /usr/local/bin
    else
        echo "Already installed EKSCTL, skip EKSCTL installation."
    fi

    echo "Create EKS Cluster with instance type: ${INSTANCE_TYPE}..."
cat <<EOF | eksctl create cluster -f -
---
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: loghub-eks-$(date +%s)
  region: ${CURRENT_REGION}
  version: "1.22"
iam:
  withOIDC: true
managedNodeGroups:
- name: docker-cri-nodes
  desiredCapacity: 1
  instanceType: ${INSTANCE_TYPE}
  ssh:
    enableSsm: true
EOF

elif [ ${USER_CHOICE} == "n" ]; then
    echo "Using existing EKS Cluster"
else
    echo "Please enter y or n. Exit."
    exit
fi
