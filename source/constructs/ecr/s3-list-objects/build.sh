#!/usr/bin/env bash
set -e

__dir="$(cd "$(dirname $0)";pwd)"
COMMON_LIB_DIR=${__dir}/../../lambda/common-lib

cp -rf ${COMMON_LIB_DIR} ${__dir}

docker build -t s3-list-objects ${__dir}
