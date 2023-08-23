# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import logging
from commonlib.model import CRIEnum, EksSource

logger = logging.getLogger()
logger.setLevel(logging.INFO)


class ConfigMap(object):
    def __init__(
        self,
        svc_acct_role,
        namespace="logging",
        container_runtime=CRIEnum.CONTAINERD,
        open_extra_metadata_flag=False,
    ):
        self._svc_acct_role = svc_acct_role
        self._namespace = namespace
        self._container_runtime = container_runtime
        self._open_extra_metadata_flag = open_extra_metadata_flag
        self._flb_data_pipelines = list()

    @property
    def svc_acct_role(self):
        return self._svc_acct_role

    @property
    def namespace(self):
        return self._flb_data_pipelines

    @property
    def container_runtime(self):
        return self._container_runtime

    @property
    def open_extra_metadata_flag(self):
        return self._open_extra_metadata_flag

    @property
    def flb_data_pipelines(self):
        return self._flb_data_pipelines

    @flb_data_pipelines.setter
    def flb_data_pipelines(self, flb_data_pipelines: list()):
        self._flb_data_pipelines = flb_data_pipelines
