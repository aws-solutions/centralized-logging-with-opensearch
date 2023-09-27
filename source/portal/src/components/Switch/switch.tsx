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
import React from "react";

interface SwithProps {
  disabled?: boolean;
  reverse?: boolean;
  label: string;
  desc?: string;
  isOn: boolean;
  handleToggle: () => void;
}

const Switch: React.FC<SwithProps> = (props: SwithProps) => {
  const { disabled, reverse, label, desc, isOn, handleToggle } = props;
  return (
    <div className="gsui-switch">
      <div className="flex">
        {!reverse && <div className="title">{label}</div>}
        <div className="switch-container">
          <input
            disabled={disabled}
            checked={isOn}
            onChange={handleToggle}
            className="react-switch-checkbox"
            id={label}
            type="checkbox"
          />
          <label
            style={{ background: isOn ? "#0073BB" : "" }}
            className="react-switch-label"
            htmlFor={label}
          >
            <span className={`react-switch-button`} />
          </label>
        </div>
        {reverse && <div className="title ml-10">{label}</div>}
      </div>
      <div className="desc">{desc}</div>
    </div>
  );
};

export default Switch;
