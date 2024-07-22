/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License").
You may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
import { EC2GroupPlatform } from "API";
import Select from "components/Select";
import React from "react";

interface SelectPlatformProps {
  platform: string;
  disableChangePlatform?: boolean;
  changePlatform: (platform: EC2GroupPlatform) => void;
}

const SelectPlatform: React.FC<SelectPlatformProps> = (
  props: SelectPlatformProps
) => {
  const { platform, disableChangePlatform, changePlatform } = props;
  return (
    <Select
      disabled={disableChangePlatform}
      optionList={[
        {
          name: EC2GroupPlatform.Linux,
          value: EC2GroupPlatform.Linux,
        },
        {
          name: EC2GroupPlatform.Windows,
          value: EC2GroupPlatform.Windows,
        },
      ]}
      value={platform}
      onChange={(e) => {
        changePlatform?.(e.target.value);
      }}
    />
  );
};

export default SelectPlatform;
