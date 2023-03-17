# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from enum import Enum


class SOURCETYPE(Enum):
    EC2 = 'EC2'
    S3 = 'S3'
    EKS_CLUSTER = 'EKSCluster'
    SYSLOG = 'Syslog'
    ASG = 'ASG'


class DEPLOYMENTKIND(Enum):
    DAEMONSET = 'DaemonSet'
    SIDECAR = 'Sidecar'


class LOGTYPE(Enum):
    JSON = 'JSON'
    REGEX = 'Regex'
    NGINX = 'Nginx'
    APACHE = 'Apache'
    SINGLE_LINE_TEXT = 'SingleLineText'
    MULTI_LINE_TEXT = 'MultiLineText'


class TIMEKEYPRESETLOGTYPE(Enum):
    JSON = 'JSON'
    REGEX = 'Regex'
    SINGLE_LINE_TEXT = 'SingleLineText'
    MULTI_LINE_TEXT = 'MultiLineText'


class S3CUSTOMIZEREGEXLOGTYPE(Enum):
    REGEX = 'Regex'
    SINGLE_LINE_TEXT = 'SingleLineText'


class S3PRESETLOGTYPE(Enum):
    JSON = 'JSON'
    CSV = 'CSV'


class MULTILINELOGPARSER(Enum):
    JAVA_SPRING_BOOT = 'JAVA_SPRING_BOOT'
    CUSTOM = 'CUSTOM'


class CRI(Enum):
    DOCKER = 'docker'
    CONTAINERD = 'containerd'
