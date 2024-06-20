# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from commonlib.logging import get_logger

from commonlib import AWSConnection


logger = get_logger(__name__)

conn = AWSConnection()


def get_add_role_arn_from_instance_profile(
    iam_client, associate_instance_profile_arn: str
) -> str:
    """Get arn of Ec2IamInstanceProfileRole from Instance Profile.

    Args:
        iam_client (_type_): IAM.Client
        associate_instance_profile_arn (str): The arn of Ec2IamInstanceProfile

    Returns:
        str: The arn of Ec2IamInstanceProfileRole
    """
    instance_profile_name = associate_instance_profile_arn.split("/")[-1]
    instance_profile_info = iam_client.get_instance_profile(
        InstanceProfileName=instance_profile_name
    )
    if not instance_profile_info["InstanceProfile"]["Roles"]:
        raise ValueError(f"{associate_instance_profile_arn} is not specified IAM role.")
    return instance_profile_info["InstanceProfile"]["Roles"][0]["Arn"]


def get_attach_policy_arn_from_role(iam_client, role_arn: str) -> str:
    """Get arn of Ec2IamInstanceProfilePolicy from IAM Role.

    Args:
        iam_client (_type_): IAM.Client
        role_arn (str): The arn of Ec2IamInstanceProfileRole

    Returns:
        str: The arn of Ec2IamInstanceProfilePolicy
    """
    role_name = role_arn.split("/")[-1]
    policy_arn = ""
    for attach_policy in iam_client.list_attached_role_policies(RoleName=role_name)[
        "AttachedPolicies"
    ]:
        if "Ec2IamInstanceProfilePolicy" in attach_policy["PolicyName"]:
            policy_arn = attach_policy["PolicyArn"]
    if policy_arn == "":
        raise ValueError(f"{role_arn} is not found Ec2IamInstanceProfilePolicy.")
    return policy_arn


def get_ec2_iam_instance_profile_associate_status(
    ec2_client, instance_ids: list[str]
) -> dict:
    """Get the associate status of the instance profile of the ec2 instance ids.

    Args:
        ec2_client (_type_): EC2.Client
        instance_ids (list[str]): The instance IDs.

    Returns:
        dict: IamInstanceProfileArns: List of all the arn of the instance profile associated.
              DisassociateInstanceIds: List of all instance id not associated.
    """
    if instance_ids == []:
        logger.info(f"Instance ids is [], return.")
        return dict(IamInstanceProfileArns=[], DisassociateInstanceIds=[])

    iam_instance_profile_arns = set()
    paginator = ec2_client.get_paginator("describe_iam_instance_profile_associations")
    for page_iterator in paginator.paginate(
        Filters=[
            {"Name": "instance-id", "Values": instance_ids},
        ]
    ):
        for association in page_iterator["IamInstanceProfileAssociations"]:
            logger.info(
                f'Instance id: {association["InstanceId"]} already associate IAM instance Profile: {association["IamInstanceProfile"]["Arn"]}.'
            )
            iam_instance_profile_arns.add(association["IamInstanceProfile"]["Arn"])
            instance_ids.remove(association["InstanceId"])

    logger.info(
        f"Need to associate IAM instance profile of instance ids: {instance_ids}."
    )
    return dict(
        IamInstanceProfileArns=list(iam_instance_profile_arns),
        DisassociateInstanceIds=instance_ids,
    )


def attach_permission_to_instance(
    instance_ids: list[str], associate_instance_profile_arn: str, sts_role_arn: str
):
    """grant required permission to instance id.

    Args:
        instance_ids (list[str]): The instance IDs.
        associate_instance_profile_arn (str): The arn of Ec2IamInstanceProfile.
        sts_role_arn (str): STS assumed role arn.
    """

    logger.info(
        f"subAccountIamInstanceProfileArn: {associate_instance_profile_arn}, subAccountRoleArn: {sts_role_arn}"
    )

    iam_client = conn.get_client("iam", sts_role_arn=sts_role_arn)
    ec2_client = conn.get_client("ec2", sts_role_arn=sts_role_arn)

    add_role_arn = get_add_role_arn_from_instance_profile(
        iam_client=iam_client,
        associate_instance_profile_arn=associate_instance_profile_arn,
    )
    attach_policy_arn = get_attach_policy_arn_from_role(
        iam_client=iam_client, role_arn=add_role_arn
    )

    ec2_instance_profile_status = get_ec2_iam_instance_profile_associate_status(
        ec2_client=ec2_client, instance_ids=instance_ids
    )
    attach_policy_to_instance_profile_role(
        iam_client=iam_client,
        add_role_arn=add_role_arn,
        attach_policy_arn=attach_policy_arn,
        instance_profile_arns=ec2_instance_profile_status["IamInstanceProfileArns"],
    )
    associate_iam_instance_profile(
        ec2_client=ec2_client,
        associate_instance_profile_arn=associate_instance_profile_arn,
        instance_ids=ec2_instance_profile_status["DisassociateInstanceIds"],
    )


def attach_policy_to_instance_profile_role(
    iam_client,
    add_role_arn: str,
    attach_policy_arn: str,
    instance_profile_arns: list[str],
):
    """Adds the specified IAM policy to the specified instance profile. Add role to instance profile if no role
       in instance profile, add policy to role of instance profile if a role included in instance profile.

    Args:
        iam_client (_type_): IAM.Client
        add_role_arn (str): The arn of role contain in instance profile.
        attach_policy_arn (str):  The arn of the IAM policy you want to attach.
        instance_profile_arns (list[str]): The list of instance profile that you want to add IAM policy.
    """
    add_role_name = add_role_arn.split("/")[-1]

    for instance_profile_arn in instance_profile_arns:
        instance_profile_name = instance_profile_arn.split("/")[-1]
        instance_profile_info = iam_client.get_instance_profile(
            InstanceProfileName=instance_profile_name
        )
        if instance_profile_info["InstanceProfile"]["Roles"]:
            role_name = instance_profile_info["InstanceProfile"]["Roles"][0]["RoleName"]
            need_attach_policy = True
            for attach_policy in iam_client.list_attached_role_policies(
                RoleName=role_name
            )["AttachedPolicies"]:
                if attach_policy["PolicyArn"] == attach_policy_arn:
                    logger.info(f"{role_name} already attach {attach_policy_arn}.")
                    need_attach_policy = False
                    break
            if need_attach_policy is True:
                logger.info(f"Attach {attach_policy_arn} to {role_name}.")
                iam_client.attach_role_policy(
                    RoleName=role_name, PolicyArn=attach_policy_arn
                )
        else:
            logger.info(f"Add role {add_role_name} to {instance_profile_name}.")
            iam_client.add_role_to_instance_profile(
                InstanceProfileName=instance_profile_name, RoleName=add_role_name
            )


def associate_iam_instance_profile(
    ec2_client, associate_instance_profile_arn: str, instance_ids: list[str]
):
    """Associate iam instance profile to ec2 instances,

    Args:
        ec2_client (_type_): EC2.Client
        associate_instance_profile_arn (str):  The arn of instance profile.
        instance_ids (list[str]): A list of instance id need to associate iam instance profile.
    """
    for instance_id in instance_ids:
        try:
            logger.info(
                f"Associate IAM instance profile {associate_instance_profile_arn} to instance id {instance_id}."
            )
            ec2_client.associate_iam_instance_profile(
                IamInstanceProfile={"Arn": associate_instance_profile_arn},
                InstanceId=instance_id,
            )
        except Exception as e:
            logger.warning(e)
