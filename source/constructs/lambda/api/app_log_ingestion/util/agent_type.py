# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from abc import ABC, abstractmethod


class AgentType(ABC):
    """An abstract class represents one type of Log Agent.

    Create a class for each agent with implementations of
     `create_ingestion_parser`, `create_ingestion`, `agent_health_check` and `delete_ingestion`.
    """

    @abstractmethod
    def create_ingestion_parser(self):
        """Create the Agent Parser File and upload to the S3 bucket.

        Fluentd does not need this method. Cause the parser configuration should be included
        in Fluentd config file.
        """
        pass

    @abstractmethod
    def create_ingestion(self):
        """Create the Agent Configuration File and Subsequent Configuration Sending Work.

        This should be implemented in each log agent.
        """
        pass

    @abstractmethod
    def delete_ingestion(self):
        """Delete one ingestion in the Agent Configuration File and Subsequent Configuration Sending Work.

        This should be implemented in each log agent.
        """
        pass

    @abstractmethod
    def agent_health_check(self, instance_id_set):
        """Check the Agent Status.

        This should be implemented in each log agent.
        """
        pass
